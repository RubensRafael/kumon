import { z } from 'zod'

/**
 * Agregação por período do histórico de acompanhamento de um aluno — a
 * parte de `historico-acompanhamento-aluno.png` que dá pra construir sem
 * mudança de schema (sem migration: só leitura/agregação de
 * `RegistroAula` já existente). Revisado antes de implementar: nem tudo
 * que o print mostra é real — "Atrasos"/"Média de atraso em minutos" não
 * entram (`Chegada` é só o enum, sem valor numérico de atraso), e o
 * "Feedback semana"/"Gerar" (IA) é a issue #17, fora do escopo daqui.
 */
export const PeriodoHistoricoEnum = z.enum(['DIA', 'SEMANA', 'MES', 'TUDO'])
export type PeriodoHistorico = z.infer<typeof PeriodoHistoricoEnum>

export const HistoricoQuery = z.object({
  periodo: PeriodoHistoricoEnum,
})
export type HistoricoQueryType = z.infer<typeof HistoricoQuery>

export const HistoricoAcompanhamentoOutput = z.object({
  previstas: z.number().int(),
  realizadas: z.number().int(),
  presencaPercentual: z.number(),
  tarefasFeitasPercentual: z.number().nullable(),
  mediaFoco: z.number().nullable(),
  mediaAutonomia: z.number().nullable(),
  mediaComportamento: z.number().nullable(),
  mediaDesempenho: z.number().nullable(),
  evolucao: z.object({
    foco: z.number().nullable(),
    autonomia: z.number().nullable(),
    comportamento: z.number().nullable(),
    desempenho: z.number().nullable(),
  }),
})
export type HistoricoAcompanhamentoOutputType = z.infer<typeof HistoricoAcompanhamentoOutput>
