/**
 * Chaves de querystring da Agenda individual, centralizadas num só lugar —
 * nenhum literal de filtro solto pelo componente. A URL é a fonte da
 * verdade de todos os 7 filtros da tela (antes só `professorId` lia da
 * URL, e só no mount); um reload recupera exatamente o que estava
 * filtrado, ou cai no padrão de cada filtro (nunca "o que calhar de vir
 * primeiro").
 */
export const AGENDA_FILTRO_PARAMS = {
  professorId: 'professorId',
  materiaId: 'materiaId',
  estagio: 'estagio',
  connect: 'connect',
  zonaVermelha: 'zonaVermelha',
  regular: 'regular',
  preEscolar: 'preEscolar',
} as const

export type AgendaFiltroChave = keyof typeof AGENDA_FILTRO_PARAMS

export interface AgendaFiltros {
  professorId: string
  materiaId: string
  estagio: string
  connect: boolean
  zonaVermelha: boolean
  regular: boolean
  preEscolar: boolean
}

/** Lê os 7 filtros da querystring — string vazia/`false` quando ausentes (nunca `undefined`). */
export function lerFiltrosDaUrl(searchParams: URLSearchParams): AgendaFiltros {
  return {
    professorId: searchParams.get(AGENDA_FILTRO_PARAMS.professorId) ?? '',
    materiaId: searchParams.get(AGENDA_FILTRO_PARAMS.materiaId) ?? '',
    estagio: searchParams.get(AGENDA_FILTRO_PARAMS.estagio) ?? '',
    connect: searchParams.get(AGENDA_FILTRO_PARAMS.connect) === 'true',
    zonaVermelha: searchParams.get(AGENDA_FILTRO_PARAMS.zonaVermelha) === 'true',
    regular: searchParams.get(AGENDA_FILTRO_PARAMS.regular) === 'true',
    preEscolar: searchParams.get(AGENDA_FILTRO_PARAMS.preEscolar) === 'true',
  }
}

/** Devolve uma cópia de `searchParams` com um filtro atualizado (removido da URL quando volta ao vazio). */
export function comFiltroAtualizado(
  searchParams: URLSearchParams,
  chave: AgendaFiltroChave,
  valor: string | boolean,
): URLSearchParams {
  const proximo = new URLSearchParams(searchParams)
  const paramKey = AGENDA_FILTRO_PARAMS[chave]
  if (valor === '' || valor === false) {
    proximo.delete(paramKey)
  } else {
    proximo.set(paramKey, String(valor))
  }
  return proximo
}
