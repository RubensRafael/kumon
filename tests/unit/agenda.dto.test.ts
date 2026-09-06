import { describe, expect, it } from 'vitest'

import { calcularOcupacaoCelula, derivarAgendaSlots } from '../../src/shared/dto/agenda.dto'
import type { DiaSemana } from '../../src/shared/dto/enums'
import type { PainelDadosOutputType } from '../../src/shared/dto/painel.dto'

const PROFESSOR_PADRAO = {
  diasDisponiveis: ['SEG', 'QUA', 'SEX'] as DiaSemana[],
  horarioInicial: '08:00',
  horarioFinal: '18:00',
  capacidadePorHorario: 4,
  materiaIds: [] as string[],
  corAgenda: '#2563eb',
}

const SNAPSHOT: PainelDadosOutputType = {
  professores: [
    { id: 'p1', nome: 'Professor 1', ...PROFESSOR_PADRAO },
    { id: 'p2', nome: 'Professor 2', ...PROFESSOR_PADRAO },
  ],
  alunos: [
    { id: 'a1', nome: 'Aluno 1', situacao: 'ATIVO', zonaVermelha: false, connect: false },
    { id: 'a2', nome: 'Aluno 2', situacao: 'ATIVO', zonaVermelha: false, connect: false },
  ],
  materias: [
    { id: 'm1', nome: 'Materia 1', conteudos: [] },
    { id: 'm2', nome: 'Materia 2', conteudos: [] },
  ],
  matriculas: [
    {
      id: 'mat1',
      alunoId: 'a1',
      professorId: 'p1',
      materiaId: 'm1',
      estagio: null,
      situacao: 'ATIVA',
      tipoAtendimento: 'REGULAR',
      horarios: [{ id: 'h1', diaSemana: 'QUA', horario: '10:00' }],
    },
    {
      id: 'mat2',
      alunoId: 'a2',
      professorId: 'p2',
      materiaId: 'm2',
      estagio: null,
      situacao: 'ATIVA',
      tipoAtendimento: 'REGULAR',
      horarios: [{ id: 'h2', diaSemana: 'SEG', horario: '14:00' }],
    },
    {
      id: 'mat3',
      alunoId: 'a1',
      professorId: 'p2',
      materiaId: 'm2',
      estagio: null,
      situacao: 'ATIVA',
      tipoAtendimento: 'REGULAR',
      horarios: [{ id: 'h3', diaSemana: 'SEG', horario: '09:00' }],
    },
  ],
}

describe('derivarAgendaSlots', () => {
  it('sem filtro devolve os slots de todos os professores, ordenados por dia (DOM..SAB) e horario', () => {
    const slots = derivarAgendaSlots(SNAPSHOT)
    expect(slots.length).toBe(3)
    expect(slots.map((slot) => slot.horarioId)).toEqual(['h3', 'h2', 'h1'])
  })

  it('professorId filtra so os slots daquele professor', () => {
    const slots = derivarAgendaSlots(SNAPSHOT, { professorId: 'p1' })
    expect(slots.length).toBe(1)
    expect(slots[0]).toMatchObject({ horarioId: 'h1', professorId: 'p1', alunoNome: 'Aluno 1' })
  })

  it('alunoId filtra so os slots daquele aluno, mesmo com professores diferentes', () => {
    const slots = derivarAgendaSlots(SNAPSHOT, { alunoId: 'a1' })
    expect(slots.length).toBe(2)
    expect(slots.every((slot) => slot.alunoId === 'a1')).toBe(true)
  })

  it('professorId + alunoId combinados', () => {
    const slots = derivarAgendaSlots(SNAPSHOT, { professorId: 'p2', alunoId: 'a1' })
    expect(slots.length).toBe(1)
    expect(slots[0]?.horarioId).toBe('h3')
  })

  it('resolve alunoNome/professorNome a partir do snapshot', () => {
    const slots = derivarAgendaSlots(SNAPSHOT, { professorId: 'p2', alunoId: 'a2' })
    expect(slots[0]).toMatchObject({ alunoNome: 'Aluno 2', professorNome: 'Professor 2' })
  })
})

describe('calcularOcupacaoCelula', () => {
  it('ocupantes sao os slots que comecam exatamente naquele horario', () => {
    const ocupacao = calcularOcupacaoCelula(SNAPSHOT, { professorId: 'p2', diaSemana: 'SEG', horario: '09:00' })
    expect(ocupacao.ocupantes.map((s) => s.horarioId)).toEqual(['h3'])
    expect(ocupacao.overflow).toEqual([])
    expect(ocupacao.capacidade).toBe(4)
  })

  it('overflow traz o REGULAR do horario anterior que ainda "vaza" pra essa celula', () => {
    const ocupacao = calcularOcupacaoCelula(SNAPSHOT, { professorId: 'p2', diaSemana: 'SEG', horario: '09:30' })
    expect(ocupacao.ocupantes).toEqual([])
    expect(ocupacao.overflow.map((s) => s.horarioId)).toEqual(['h3'])
  })

  it('celula vazia (sem ocupantes nem overflow) quando nao ha aula nem antes nem no horario', () => {
    const ocupacao = calcularOcupacaoCelula(SNAPSHOT, { professorId: 'p2', diaSemana: 'SEG', horario: '11:00' })
    expect(ocupacao.ocupantes).toEqual([])
    expect(ocupacao.overflow).toEqual([])
  })

  it('capacidade e 0 quando o professor nao existe mais no snapshot', () => {
    const ocupacao = calcularOcupacaoCelula(SNAPSHOT, { professorId: 'inexistente', diaSemana: 'SEG', horario: '09:00' })
    expect(ocupacao.capacidade).toBe(0)
  })
})
