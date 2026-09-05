import type { SituacaoAluno, SituacaoMatricula, TipoAtendimento } from '@shared/dto'

export const SITUACAO_ALUNO_LABEL: Record<SituacaoAluno, string> = {
  ATIVO: 'Ativo',
  TRANCADO: 'Trancado',
  DESISTENTE: 'Desistente',
}

export const SITUACAO_MATRICULA_LABEL: Record<SituacaoMatricula, string> = {
  ATIVA: 'Ativa',
  PAUSADA: 'Pausada',
  ENCERRADA: 'Encerrada',
}

/** Duração real (`shared/dto/painel.dto.ts`, `DURACAO_AULA_MIN`) — não editável, só informativa. */
export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  REGULAR: 'Regular (50 min)',
  PRE_ESCOLAR: 'Pré-escolar (30 min)',
}
