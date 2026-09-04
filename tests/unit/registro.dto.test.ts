import { describe, expect, it } from 'vitest'

import { isCompleto, isFalta } from '../../src/shared/dto/registro.dto'

function registro(overrides: Partial<Parameters<typeof isCompleto>[0]> = {}) {
  return {
    chegada: null,
    boletim: null,
    atividadeCasa: null,
    foco: null,
    autonomia: null,
    comportamento: null,
    desempenho: null,
    ...overrides,
  }
}

describe('isFalta', () => {
  it('true quando chegada e FALTOU', () => {
    expect(isFalta(registro({ chegada: 'FALTOU' }))).toBe(true)
  })

  it('false pra qualquer outro valor de chegada, incluindo null', () => {
    expect(isFalta(registro({ chegada: 'PRESENTE' }))).toBe(false)
    expect(isFalta(registro({ chegada: 'ATRASADO' }))).toBe(false)
    expect(isFalta(registro())).toBe(false)
  })
})

describe('isCompleto', () => {
  it('false sem chegada preenchida', () => {
    expect(isCompleto(registro())).toBe(false)
  })

  it('true assim que chegada e FALTOU, sem precisar de mais nenhum campo', () => {
    expect(isCompleto(registro({ chegada: 'FALTOU' }))).toBe(true)
  })

  it('false com chegada PRESENTE mas alguma nota faltando', () => {
    expect(isCompleto(registro({ chegada: 'PRESENTE', boletim: 'PEGOU' }))).toBe(false)
  })

  it('true com chegada PRESENTE e todas as notas preenchidas', () => {
    expect(
      isCompleto(
        registro({
          chegada: 'PRESENTE',
          boletim: 'PEGOU',
          atividadeCasa: 'FEZ',
          foco: 'BOM',
          autonomia: 'BOA',
          comportamento: 'ADEQUADO',
          desempenho: 'BOM',
        }),
      ),
    ).toBe(true)
  })

  it('true com chegada ATRASADO e todas as notas preenchidas', () => {
    expect(
      isCompleto(
        registro({
          chegada: 'ATRASADO',
          boletim: 'NAO_PEGOU',
          atividadeCasa: 'NAO_FEZ',
          foco: 'BAIXO',
          autonomia: 'BAIXA',
          comportamento: 'OSCILOU',
          desempenho: 'APRESENTOU_DIFICULDADE',
        }),
      ),
    ).toBe(true)
  })
})
