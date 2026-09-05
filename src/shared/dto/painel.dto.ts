import { z } from 'zod'

import { DiaSemanaEnum, HorarioDoDia, SituacaoAlunoEnum, SituacaoMatriculaEnum, TipoAtendimentoEnum } from './enums'

/**
 * Snapshot bruto da unidade inteira: `GET /painel` devolve isto, sem
 * agregacao nenhuma no backend. Agenda e painel (e qualquer outra visao
 * futura que precise cruzar professor/aluno/materia/matricula) sao todas
 * derivadas disso no client -- uma unica busca serve todas, em vez de cada
 * feature ter seu proprio endpoint com sua propria query.
 *
 * `horarios` de cada matricula ja vem filtrado por `ativo: true` -- nenhum
 * consumidor (agenda, ocupacao) precisa de horario inativo, entao nao ha
 * razao pra carregar esse peso morto no payload.
 *
 * Sem escopo por professor na query: como e leitura pura (visualizacao),
 * qualquer usuario autenticado ve a unidade inteira. O escopo por professor
 * continua existindo como conceito, so que agora e so um filtro de
 * conveniencia que os helpers abaixo aplicam sob demanda (ex.: dashboard do
 * professor mostrando so o proprio), nunca mais um corte de seguranca na
 * query -- ver docs/pr-10-painel.md, "Atualizacoes pos-revisao".
 */
export const PainelDadosOutput = z.object({
  professores: z.array(
    z.object({
      id: z.uuid(),
      nome: z.string(),
      diasDisponiveis: z.array(DiaSemanaEnum),
      horarioInicial: HorarioDoDia,
      horarioFinal: HorarioDoDia,
      capacidadePorHorario: z.number().int(),
      materiaIds: z.array(z.uuid()),
    }),
  ),
  alunos: z.array(
    z.object({
      id: z.uuid(),
      nome: z.string(),
      situacao: SituacaoAlunoEnum,
      zonaVermelha: z.boolean(),
    }),
  ),
  materias: z.array(
    z.object({
      id: z.uuid(),
      nome: z.string(),
      conteudos: z.array(
        z.object({
          id: z.uuid(),
          nome: z.string(),
          ativo: z.boolean(),
        }),
      ),
    }),
  ),
  matriculas: z.array(
    z.object({
      id: z.uuid(),
      alunoId: z.uuid(),
      professorId: z.uuid(),
      materiaId: z.uuid(),
      situacao: SituacaoMatriculaEnum,
      tipoAtendimento: TipoAtendimentoEnum,
      horarios: z.array(
        z.object({
          id: z.uuid(),
          diaSemana: DiaSemanaEnum,
          horario: HorarioDoDia,
        }),
      ),
    }),
  ),
})
export type PainelDadosOutputType = z.infer<typeof PainelDadosOutput>

// Sem 'DOM': o cadastro de professor (fe-03) so oferece Seg-Sab no toggle
// de dias disponiveis -- nenhuma unidade Kumon abre aos domingos, entao
// essa coluna nunca teria valor no grafico "Aulas por dia da semana".
const DIAS_BANCO = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

/** Mesmo grid de 30min que `HorarioDoDia` forca em todo `MatriculaHorario.horario`. */
const DURACAO_SLOT_MIN = 30

/** Duracao real de uma aula, por `tipoAtendimento` da matricula -- nao do professor. */
const DURACAO_AULA_MIN: Record<z.infer<typeof TipoAtendimentoEnum>, number> = {
  REGULAR: 50,
  PRE_ESCOLAR: 30,
}

function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

/**
 * Quantos slots de `DURACAO_SLOT_MIN` uma aula desse `tipoAtendimento`
 * ocupa, arredondado pra cima. `REGULAR` (50min) ocupa 2 -- o proprio
 * horario mais um "spillover" informativo no slot seguinte. `PRE_ESCOLAR`
 * (30min) ocupa exatamente 1.
 *
 * Caso raro e deliberadamente nao tratado aqui: um aluno com 2 matriculas
 * (mesmo professor) em horarios adjacentes pode contar 2x no mesmo slot --
 * ver plan.md, "Coisas pra fazer". So faz sentido resolver isso na UI, nao
 * no calculo agregado.
 */
function slotsOcupados(tipoAtendimento: z.infer<typeof TipoAtendimentoEnum>): number {
  return Math.ceil(DURACAO_AULA_MIN[tipoAtendimento] / DURACAO_SLOT_MIN)
}

/** Vagas-horario que um professor abre por semana -- base de `ocupacaoPercentual`. */
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

export interface PainelAgregacoes {
  totalAlunosAtivos: number
  totalMatriculasAtivas: number
  totalProfessores: number
  ocupacaoPercentual: number
  matriculasPorMateria: { materiaId: string; materiaNome: string; total: number }[]
  matriculasPorProfessor: { professorId: string; professorNome: string; total: number }[]
  aulasPorDiaSemana: { diaSemana: string; total: number }[]
  alertas: { tipo: string; alunoId: string; mensagem: string }[]
}

/**
 * Agregacoes que antes vinham prontas do backend (`GET /painel` da PR 10
 * original) -- agora calculadas aqui, em cima do snapshot bruto de
 * `PainelDadosOutput`. `professorId` e so um filtro de conveniencia
 * (dashboard do professor mostrando so o proprio): omitido, agrega a
 * unidade inteira. `totalProfessores` nunca e filtrado por ele -- mesma
 * logica de `GET /professores`, que ja e um diretorio nao-escopado.
 */
export function calcularAgregacoesPainel(
  dados: PainelDadosOutputType,
  professorId: string | null = null,
): PainelAgregacoes {
  const matriculasEscopadas = professorId
    ? dados.matriculas.filter((matricula) => matricula.professorId === professorId)
    : dados.matriculas

  const alunoIdsEscopados = new Set(matriculasEscopadas.map((matricula) => matricula.alunoId))
  const alunosEscopados = professorId
    ? dados.alunos.filter((aluno) => alunoIdsEscopados.has(aluno.id))
    : dados.alunos

  const matriculasAtivas = matriculasEscopadas.filter((matricula) => matricula.situacao === 'ATIVA')

  const professoresParaCapacidade = professorId
    ? dados.professores.filter((professor) => professor.id === professorId)
    : dados.professores
  const capacidadeTeorica = professoresParaCapacidade.reduce(
    (soma, professor) => soma + capacidadeSemanal(professor),
    0,
  )

  const horariosEscopados = matriculasEscopadas.flatMap((matricula) =>
    matricula.horarios.map((horario) => ({ ...horario, tipoAtendimento: matricula.tipoAtendimento })),
  )
  const totalSlotsOcupados = horariosEscopados.reduce(
    (soma, horario) => soma + slotsOcupados(horario.tipoAtendimento),
    0,
  )
  const ocupacaoPercentual =
    capacidadeTeorica > 0 ? Math.round((totalSlotsOcupados / capacidadeTeorica) * 1000) / 10 : 0

  const nomeDaMateria = new Map(dados.materias.map((materia) => [materia.id, materia.nome]))
  const porMateria = new Map<string, number>()
  for (const matricula of matriculasAtivas) {
    porMateria.set(matricula.materiaId, (porMateria.get(matricula.materiaId) ?? 0) + 1)
  }
  const matriculasPorMateria = [...porMateria.entries()].map(([materiaId, total]) => ({
    materiaId,
    materiaNome: nomeDaMateria.get(materiaId) ?? '',
    total,
  }))

  const nomeDoProfessor = new Map(dados.professores.map((professor) => [professor.id, professor.nome]))
  const porProfessor = new Map<string, number>()
  for (const matricula of matriculasAtivas) {
    porProfessor.set(matricula.professorId, (porProfessor.get(matricula.professorId) ?? 0) + 1)
  }
  const matriculasPorProfessor = [...porProfessor.entries()].map(([professorId, total]) => ({
    professorId,
    professorNome: nomeDoProfessor.get(professorId) ?? '',
    total,
  }))

  const porDia = new Map<string, number>()
  for (const horario of horariosEscopados) {
    porDia.set(horario.diaSemana, (porDia.get(horario.diaSemana) ?? 0) + 1)
  }
  const aulasPorDiaSemana = DIAS_BANCO.map((dia) => ({ diaSemana: dia, total: porDia.get(dia) ?? 0 }))

  const alertas = alunosEscopados
    .filter((aluno) => aluno.situacao === 'ATIVO' && aluno.zonaVermelha)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((aluno) => ({
      tipo: 'zona_vermelha',
      alunoId: aluno.id,
      // Formulacao neutra de proposito -- "esta marcado" nao concorda com
      // o genero do nome, e o sistema nao tem como saber isso.
      mensagem: `${aluno.nome} está na zona vermelha.`,
    }))

  return {
    totalAlunosAtivos: alunosEscopados.filter((aluno) => aluno.situacao === 'ATIVO').length,
    totalMatriculasAtivas: matriculasAtivas.length,
    totalProfessores: dados.professores.length,
    ocupacaoPercentual,
    matriculasPorMateria,
    matriculasPorProfessor,
    aulasPorDiaSemana,
    alertas,
  }
}
