import type { PrismaClient } from '../../db/generated/client'
import type { TipoAtendimento } from '../../../shared/dto/enums'
import type { PainelOutputType } from './painel.dto'

const DIAS_BANCO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

/** Mesmo grid de 30min que `HorarioDoDia` forca em todo `MatriculaHorario.horario`. */
const DURACAO_SLOT_MIN = 30

/**
 * Duracao real de uma aula, por `tipoAtendimento` da matricula -- nao do
 * professor. `Professor.duracaoAulaMin` foi removido do schema (nao tinha
 * nenhum consumidor na epoca); a duracao sempre foi um dado da matricula.
 */
const DURACAO_AULA_MIN: Record<TipoAtendimento, number> = {
  REGULAR: 50,
  PRE_ESCOLAR: 30,
}

function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

/**
 * Quantos slots de `DURACAO_SLOT_MIN` uma aula desse `tipoAtendimento`
 * ocupa, arredondado pra cima. `REGULAR` (50min) ocupa 2 slots -- o proprio
 * `MatriculaHorario` mais um "spillover" informativo no slot seguinte,
 * ja que o horario reservado e sempre so o inicial (grid de 30min).
 * `PRE_ESCOLAR` (30min) ocupa exatamente 1.
 *
 * Caso raro e deliberadamente nao tratado aqui: um aluno com 2 matriculas
 * (mesmo professor) em horarios adjacentes pode contar 2x no mesmo slot
 * (spillover de uma + reserva nova da outra) -- ver plan.md, "Coisas pra
 * fazer". So faz sentido resolver isso na UI (mostrar quem esta "ainda na
 * sala" vs quem tem reserva nova), nao no calculo agregado.
 */
function slotsOcupados(tipoAtendimento: TipoAtendimento): number {
  return Math.ceil(DURACAO_AULA_MIN[tipoAtendimento] / DURACAO_SLOT_MIN)
}

/**
 * Quantidade de vagas-horario que um professor abre por semana: dias
 * disponiveis x quantos slots de 30min (grid de `HorarioDoDia`) cabem entre
 * `horarioInicial` e `horarioFinal` x `capacidadePorHorario` (vagas por
 * slot). E a base de `ocupacaoPercentual` — ver docs/pr-10-painel.md,
 * "Decisoes tomadas": a spec nao define essa formula, esta e uma
 * aproximacao razoavel a partir dos campos que o schema realmente tem.
 */
function capacidadeSemanal(professor: {
  diasDisponiveis: string[]
  horarioInicial: string
  horarioFinal: string
  capacidadePorHorario: number
}): number {
  const inicio = minutosDoHorario(professor.horarioInicial)
  const fim = minutosDoHorario(professor.horarioFinal)
  const slotsPorDia = Math.max(0, Math.floor((fim - inicio) / DURACAO_SLOT_MIN))

  return professor.diasDisponiveis.length * slotsPorDia * professor.capacidadePorHorario
}

export async function obterPainel(
  prisma: PrismaClient,
  escopoProfessorId: string | null,
): Promise<PainelOutputType> {
  const filtroAlunoAtivoEscopado = {
    situacao: 'ATIVO' as const,
    ...(escopoProfessorId
      ? { matriculas: { some: { professorId: escopoProfessorId, situacao: 'ATIVA' as const } } }
      : {}),
  }
  const filtroMatriculaAtivaEscopada = {
    situacao: 'ATIVA' as const,
    ...(escopoProfessorId ? { professorId: escopoProfessorId } : {}),
  }
  const filtroHorarioAtivoEscopado = {
    ativo: true,
    ...(escopoProfessorId ? { matricula: { professorId: escopoProfessorId } } : {}),
  }

  const [
    totalAlunosAtivos,
    totalMatriculasAtivas,
    // Sempre da unidade inteira, mesmo escopado — mesma logica de
    // GET /professores (PR 03), que ja e um diretorio nao-escopado.
    totalProfessores,
    professoresParaCapacidade,
    matriculasAgrupadas,
    horariosAtivos,
    alunosZonaVermelha,
  ] = await Promise.all([
    prisma.aluno.count({ where: filtroAlunoAtivoEscopado }),
    prisma.matricula.count({ where: filtroMatriculaAtivaEscopada }),
    prisma.professor.count(),
    prisma.professor.findMany({
      where: escopoProfessorId ? { id: escopoProfessorId } : undefined,
      select: {
        diasDisponiveis: true,
        horarioInicial: true,
        horarioFinal: true,
        capacidadePorHorario: true,
      },
    }),
    prisma.matricula.groupBy({
      by: ['materiaId'],
      where: filtroMatriculaAtivaEscopada,
      _count: { _all: true },
    }),
    // Sem groupBy: precisa do tipoAtendimento (campo da matricula associada,
    // nao do MatriculaHorario) pra pesar cada linha em slotsOcupados.
    prisma.matriculaHorario.findMany({
      where: filtroHorarioAtivoEscopado,
      select: { diaSemana: true, matricula: { select: { tipoAtendimento: true } } },
    }),
    prisma.aluno.findMany({
      where: {
        situacao: 'ATIVO',
        zonaVermelha: true,
        ...(escopoProfessorId
          ? { matriculas: { some: { professorId: escopoProfessorId, situacao: 'ATIVA' } } }
          : {}),
      },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const capacidadeTeorica = professoresParaCapacidade.reduce(
    (soma, professor) => soma + capacidadeSemanal(professor),
    0,
  )
  const totalSlotsOcupados = horariosAtivos.reduce(
    (soma, horario) => soma + slotsOcupados(horario.matricula.tipoAtendimento),
    0,
  )
  const ocupacaoPercentual =
    capacidadeTeorica > 0 ? Math.round((totalSlotsOcupados / capacidadeTeorica) * 1000) / 10 : 0

  const materiaIds = matriculasAgrupadas.map((grupo) => grupo.materiaId)
  const materias = await prisma.materia.findMany({
    where: { id: { in: materiaIds } },
    select: { id: true, nome: true },
  })
  const nomeDaMateria = new Map(materias.map((materia) => [materia.id, materia.nome]))

  const matriculasPorMateria = matriculasAgrupadas.map((grupo) => ({
    materiaId: grupo.materiaId,
    materiaNome: nomeDaMateria.get(grupo.materiaId) ?? '',
    total: grupo._count._all,
  }))

  // Todos os 7 dias sempre presentes (mesmo com total 0) — mais util pra um
  // grafico de barras do que omitir dias sem aula. Contagem crua de aulas
  // (nao pesada por slotsOcupados) -- e "quantas aulas", nao "quanta
  // capacidade ocupada".
  const totalPorDia = new Map<string, number>()
  for (const horario of horariosAtivos) {
    totalPorDia.set(horario.diaSemana, (totalPorDia.get(horario.diaSemana) ?? 0) + 1)
  }
  const aulasPorDiaSemana = DIAS_BANCO.map((dia) => ({
    diaSemana: dia,
    total: totalPorDia.get(dia) ?? 0,
  }))

  // Unico tipo de alerta implementado: a spec nao define nenhuma regra de
  // alerta, mas `Aluno.zonaVermelha` existe no schema sem nenhum outro uso
  // em toda a spec alem de aparecer em `AlunoOutput` — a conexao mais obvia.
  const alertas = alunosZonaVermelha.map((aluno) => ({
    tipo: 'zona_vermelha',
    alunoId: aluno.id,
    mensagem: `${aluno.nome} esta marcado como zona vermelha.`,
  }))

  return {
    totalAlunosAtivos,
    totalMatriculasAtivas,
    totalProfessores,
    ocupacaoPercentual,
    matriculasPorMateria,
    aulasPorDiaSemana,
    alertas,
  }
}
