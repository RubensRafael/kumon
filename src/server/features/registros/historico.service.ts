import type { Autonomia, Comportamento, Desempenho, Foco } from '../../../shared/dto/enums'
import type { HistoricoAcompanhamentoOutputType, PeriodoHistorico } from '../../../shared/dto/historico.dto'
import { diaDaSemana } from '../../lib/data'
import type { PrismaClient } from '../../db/generated/client'

const FOCO_ESCALA: Record<Foco, number> = { BAIXO: 1, REGULAR: 2, BOM: 3, EXCELENTE: 4 }
const AUTONOMIA_ESCALA: Record<Autonomia, number> = { BAIXA: 1, REGULAR: 2, BOA: 3, EXCELENTE: 4 }
const COMPORTAMENTO_ESCALA: Record<Comportamento, number> = {
  NECESSITOU_INTERVENCAO: 1,
  OSCILOU: 2,
  ADEQUADO: 3,
  EXCELENTE: 4,
}
const DESEMPENHO_ESCALA: Record<Desempenho, number> = {
  PRECISOU_INTERVENCAO: 1,
  APRESENTOU_DIFICULDADE: 2,
  BOM: 3,
  EXCELENTE: 4,
}

function inicioDoDia(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
}

function inicioDaSemana(data: Date): Date {
  const dia = inicioDoDia(data)
  const diaSemana = dia.getUTCDay()
  dia.setUTCDate(dia.getUTCDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
  return dia
}

function inicioDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1))
}

/** Janela `[inicio, fim)` do período atual, ancorada em `agora`. */
function janelaAtual(periodo: PeriodoHistorico, agora: Date): { inicio: Date; fim: Date } {
  const hoje = inicioDoDia(agora)
  const amanha = new Date(hoje)
  amanha.setUTCDate(amanha.getUTCDate() + 1)

  switch (periodo) {
    case 'DIA':
      return { inicio: hoje, fim: amanha }
    case 'SEMANA': {
      const inicio = inicioDaSemana(agora)
      const fim = new Date(inicio)
      fim.setUTCDate(fim.getUTCDate() + 7)
      return { inicio, fim }
    }
    case 'MES': {
      const inicio = inicioDoMes(agora)
      const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1))
      return { inicio, fim }
    }
    case 'TUDO':
      return { inicio: new Date(0), fim: amanha }
  }
}

/** Janela imediatamente anterior, do mesmo tamanho — base da "Evolução". `null` pra "tudo" (não há "anterior a tudo"). */
function janelaAnterior(periodo: PeriodoHistorico, atual: { inicio: Date; fim: Date }): { inicio: Date; fim: Date } | null {
  if (periodo === 'TUDO') return null
  const duracaoMs = atual.fim.getTime() - atual.inicio.getTime()
  return { inicio: new Date(atual.inicio.getTime() - duracaoMs), fim: atual.inicio }
}

/** Quantas vezes um dia da semana ocorre dentro de `[inicio, fim)`. */
function contarOcorrenciasDoDia(diaSemana: string, inicio: Date, fim: Date): number {
  let total = 0
  const cursor = new Date(inicio)
  while (cursor < fim) {
    if (diaDaSemana(cursor) === diaSemana) total += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return total
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return Math.round((valores.reduce((soma, v) => soma + v, 0) / valores.length) * 10) / 10
}

async function calcularJanela(
  prisma: PrismaClient,
  alunoId: string,
  escopoProfessorId: string | null,
  janela: { inicio: Date; fim: Date },
) {
  const filtroMatricula = {
    alunoId,
    ...(escopoProfessorId ? { professorId: escopoProfessorId } : {}),
  }

  const [horariosAtivos, registros] = await Promise.all([
    prisma.matriculaHorario.findMany({
      where: { ativo: true, matricula: filtroMatricula },
      select: { diaSemana: true },
    }),
    prisma.registroAula.findMany({
      where: { matricula: filtroMatricula, data: { gte: janela.inicio, lt: janela.fim } },
      select: {
        chegada: true,
        atividadeCasa: true,
        foco: true,
        autonomia: true,
        comportamento: true,
        desempenho: true,
      },
    }),
  ])

  const previstas = horariosAtivos.reduce(
    (soma, horario) => soma + contarOcorrenciasDoDia(horario.diaSemana, janela.inicio, janela.fim),
    0,
  )

  const realizados = registros.filter((r) => r.chegada !== null)
  const presentes = realizados.filter((r) => r.chegada !== 'FALTOU')
  const comTarefa = realizados.filter((r) => r.atividadeCasa !== null && r.atividadeCasa !== 'NAO_HAVIA')

  return {
    previstas,
    realizadas: realizados.length,
    presencaPercentual: realizados.length > 0 ? Math.round((presentes.length / realizados.length) * 1000) / 10 : 0,
    tarefasFeitasPercentual:
      comTarefa.length > 0
        ? Math.round((comTarefa.filter((r) => r.atividadeCasa === 'FEZ').length / comTarefa.length) * 1000) / 10
        : null,
    mediaFoco: media(presentes.flatMap((r) => (r.foco ? [FOCO_ESCALA[r.foco]] : []))),
    mediaAutonomia: media(presentes.flatMap((r) => (r.autonomia ? [AUTONOMIA_ESCALA[r.autonomia]] : []))),
    mediaComportamento: media(presentes.flatMap((r) => (r.comportamento ? [COMPORTAMENTO_ESCALA[r.comportamento]] : []))),
    mediaDesempenho: media(presentes.flatMap((r) => (r.desempenho ? [DESEMPENHO_ESCALA[r.desempenho]] : []))),
  }
}

function delta(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null) return null
  return Math.round((atual - anterior) * 10) / 10
}

export async function obterHistoricoAluno(
  prisma: PrismaClient,
  alunoId: string,
  periodo: PeriodoHistorico,
  escopoProfessorId: string | null,
): Promise<HistoricoAcompanhamentoOutputType> {
  const agora = new Date()
  const atual = janelaAtual(periodo, agora)
  const anteriorJanela = janelaAnterior(periodo, atual)

  const [resultadoAtual, resultadoAnterior] = await Promise.all([
    calcularJanela(prisma, alunoId, escopoProfessorId, atual),
    anteriorJanela ? calcularJanela(prisma, alunoId, escopoProfessorId, anteriorJanela) : null,
  ])

  return {
    previstas: resultadoAtual.previstas,
    realizadas: resultadoAtual.realizadas,
    presencaPercentual: resultadoAtual.presencaPercentual,
    tarefasFeitasPercentual: resultadoAtual.tarefasFeitasPercentual,
    mediaFoco: resultadoAtual.mediaFoco,
    mediaAutonomia: resultadoAtual.mediaAutonomia,
    mediaComportamento: resultadoAtual.mediaComportamento,
    mediaDesempenho: resultadoAtual.mediaDesempenho,
    evolucao: {
      foco: delta(resultadoAtual.mediaFoco, resultadoAnterior?.mediaFoco ?? null),
      autonomia: delta(resultadoAtual.mediaAutonomia, resultadoAnterior?.mediaAutonomia ?? null),
      comportamento: delta(resultadoAtual.mediaComportamento, resultadoAnterior?.mediaComportamento ?? null),
      desempenho: delta(resultadoAtual.mediaDesempenho, resultadoAnterior?.mediaDesempenho ?? null),
    },
  }
}
