import type {
  AtividadeCasa,
  Autonomia,
  Boletim,
  Chegada,
  Comportamento,
  Desempenho,
  Foco,
} from '@shared/dto'
import type { StatusRegistro } from '@shared/dto'

export const CHEGADA_LABEL: Record<Chegada, string> = {
  PRESENTE: 'Presente',
  ATRASADO: 'Atrasado',
  FALTOU: 'Faltou',
}

export const BOLETIM_LABEL: Record<Boletim, string> = {
  PEGOU: 'Pegou',
  NAO_PEGOU: 'Não pegou',
  PROBLEMA: 'Problema',
}

export const ATIVIDADE_CASA_LABEL: Record<AtividadeCasa, string> = {
  FEZ: 'Fez',
  FEZ_PARCIALMENTE: 'Fez parcialmente',
  NAO_FEZ: 'Não fez',
  NAO_HAVIA: 'Não havia',
}

export const FOCO_LABEL: Record<Foco, string> = {
  BAIXO: 'Baixo',
  REGULAR: 'Regular',
  BOM: 'Bom',
  EXCELENTE: 'Excelente',
}

export const AUTONOMIA_LABEL: Record<Autonomia, string> = {
  BAIXA: 'Baixa',
  REGULAR: 'Regular',
  BOA: 'Boa',
  EXCELENTE: 'Excelente',
}

export const COMPORTAMENTO_LABEL: Record<Comportamento, string> = {
  NECESSITOU_INTERVENCAO: 'Necessitou intervenção',
  OSCILOU: 'Oscilou',
  ADEQUADO: 'Adequado',
  EXCELENTE: 'Excelente',
}

export const DESEMPENHO_LABEL: Record<Desempenho, string> = {
  PRECISOU_INTERVENCAO: 'Precisou de muita intervenção',
  APRESENTOU_DIFICULDADE: 'Apresentou dificuldade',
  BOM: 'Bom',
  EXCELENTE: 'Excelente',
}

export const STATUS_REGISTRO_LABEL: Record<StatusRegistro, string> = {
  NAO_INICIADO: 'Não iniciado',
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
}
