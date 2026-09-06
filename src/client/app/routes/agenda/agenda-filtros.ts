/**
 * Chaves de querystring da Agenda individual, centralizadas num só lugar —
 * nenhum literal de filtro solto pelo componente. A URL é a fonte da
 * verdade de todos os 7 filtros da tela (antes só `professorId` lia da
 * URL, e só no mount); um reload recupera exatamente o que estava
 * filtrado, ou cai no padrão de cada filtro (nunca "o que calhar de vir
 * primeiro").
 */
export const AGENDA_FILTRO_PARAMS = {
  connect: 'connect',
  zonaVermelha: 'zonaVermelha',
  regular: 'regular',
  preEscolar: 'preEscolar',
} as const

export const AGENDA_FILTRO_LISTA_PARAMS = {
  professorIds: 'professorIds',
  materiaIds: 'materiaIds',
  estagios: 'estagios',
  alunoIds: 'alunoIds',
} as const

export type AgendaFiltroChave = keyof typeof AGENDA_FILTRO_PARAMS
export type AgendaFiltroListaChave = keyof typeof AGENDA_FILTRO_LISTA_PARAMS

export interface AgendaFiltros {
  professorIds: string[]
  materiaIds: string[]
  estagios: string[]
  alunoIds: string[]
  connect: boolean
  zonaVermelha: boolean
  regular: boolean
  preEscolar: boolean
}

/** CSV num único parâmetro (`a,b,c`) -- lista vazia quando o parâmetro está ausente. */
function lerLista(searchParams: URLSearchParams, paramKey: string): string[] {
  const valor = searchParams.get(paramKey)
  return valor ? valor.split(',').filter(Boolean) : []
}

/** Lê os 8 filtros da querystring — lista vazia/`false` quando ausentes (nunca `undefined`). */
export function lerFiltrosDaUrl(searchParams: URLSearchParams): AgendaFiltros {
  return {
    professorIds: lerLista(searchParams, AGENDA_FILTRO_LISTA_PARAMS.professorIds),
    materiaIds: lerLista(searchParams, AGENDA_FILTRO_LISTA_PARAMS.materiaIds),
    estagios: lerLista(searchParams, AGENDA_FILTRO_LISTA_PARAMS.estagios),
    alunoIds: lerLista(searchParams, AGENDA_FILTRO_LISTA_PARAMS.alunoIds),
    connect: searchParams.get(AGENDA_FILTRO_PARAMS.connect) === 'true',
    zonaVermelha: searchParams.get(AGENDA_FILTRO_PARAMS.zonaVermelha) === 'true',
    regular: searchParams.get(AGENDA_FILTRO_PARAMS.regular) === 'true',
    preEscolar: searchParams.get(AGENDA_FILTRO_PARAMS.preEscolar) === 'true',
  }
}

/** Devolve uma cópia de `searchParams` com um filtro escalar atualizado (removido da URL quando volta ao vazio). */
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

/** Mesma ideia de `comFiltroAtualizado`, pros filtros de múltipla seleção (lista serializada como CSV). */
export function comFiltroListaAtualizado(
  searchParams: URLSearchParams,
  chave: AgendaFiltroListaChave,
  valores: string[],
): URLSearchParams {
  const proximo = new URLSearchParams(searchParams)
  const paramKey = AGENDA_FILTRO_LISTA_PARAMS[chave]
  if (valores.length === 0) {
    proximo.delete(paramKey)
  } else {
    proximo.set(paramKey, valores.join(','))
  }
  return proximo
}
