import { describe, expect, it } from 'vitest'

import { horariosOcupados, minutosDoHorario, slotsOcupados } from '../../src/shared/dto/ocupacao'

describe('minutosDoHorario', () => {
  it('converte HH:mm em minutos desde meia-noite', () => {
    expect(minutosDoHorario('00:00')).toBe(0)
    expect(minutosDoHorario('14:30')).toBe(870)
  })
})

describe('slotsOcupados', () => {
  it('REGULAR (50min) ocupa 2 slots de 30min, PRE_ESCOLAR (30min) ocupa 1', () => {
    expect(slotsOcupados('REGULAR')).toBe(2)
    expect(slotsOcupados('PRE_ESCOLAR')).toBe(1)
  })
})

describe('horariosOcupados', () => {
  it('REGULAR as 14:00 ocupa o proprio horario mais o spillover em 14:30', () => {
    expect(horariosOcupados('14:00', 'REGULAR')).toEqual(['14:00', '14:30'])
  })

  it('PRE_ESCOLAR as 14:00 ocupa so o proprio horario', () => {
    expect(horariosOcupados('14:00', 'PRE_ESCOLAR')).toEqual(['14:00'])
  })
})
