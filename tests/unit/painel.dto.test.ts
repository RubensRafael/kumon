import { describe, expect, it } from 'vitest'

import type { DiaSemana } from '../../src/shared/dto/enums'
import { calcularAgregacoesPainel } from '../../src/shared/dto/painel.dto'
import type { PainelDadosOutputType } from '../../src/shared/dto/painel.dto'

const PROFESSOR_PADRAO = {
  diasDisponiveis: ['SEG', 'QUA', 'SEX'] as DiaSemana[],
  horarioInicial: '08:00',
  horarioFinal: '18:00',
  capacidadePorHorario: 4,
  materiaIds: [] as string[],
  corAgenda: '#2563eb',
}

function dados(overrides: Partial<PainelDadosOutputType> = {}): PainelDadosOutputType {
  return {
    professores: [],
    alunos: [],
    materias: [],
    matriculas: [],
    ...overrides,
  }
}

describe('calcularAgregacoesPainel', () => {
  it('agrega a unidade inteira quando nenhum professorId e passado', () => {
    const snapshot = dados({
      professores: [
        { id: 'p1', nome: 'Professor 1', ...PROFESSOR_PADRAO },
        { id: 'p2', nome: 'Professor 2', ...PROFESSOR_PADRAO },
      ],
      alunos: [
        { id: 'a1', nome: 'Aluno 1', situacao: 'ATIVO', zonaVermelha: false, connect: false },
        { id: 'a2', nome: 'Aluno 2', situacao: 'ATIVO', zonaVermelha: false, connect: false },
      ],
      materias: [{ id: 'm1', nome: 'Materia', conteudos: [] }],
      matriculas: [
        {
          id: 'mat1',
          alunoId: 'a1',
          professorId: 'p1',
          materiaId: 'm1',
          estagio: null,
          situacao: 'ATIVA',
          tipoAtendimento: 'REGULAR',
          horarios: [{ id: 'h1', diaSemana: 'SEG', horario: '14:00' }],
        },
        {
          id: 'mat2',
          alunoId: 'a2',
          professorId: 'p2',
          materiaId: 'm1',
          estagio: null,
          situacao: 'ATIVA',
          tipoAtendimento: 'REGULAR',
          horarios: [{ id: 'h2', diaSemana: 'TER', horario: '14:00' }],
        },
      ],
    })

    const agregado = calcularAgregacoesPainel(snapshot)

    expect(agregado.totalAlunosAtivos).toBe(2)
    expect(agregado.totalMatriculasAtivas).toBe(2)
    expect(agregado.totalProfessores).toBe(2)
    expect(agregado.matriculasPorMateria).toEqual([{ materiaId: 'm1', materiaNome: 'Materia', total: 2 }])
    expect(agregado.aulasPorDiaSemana.length).toBe(6)
    expect(agregado.aulasPorDiaSemana.find((dia) => dia.diaSemana === 'SEG')?.total).toBe(1)
  })

  it('professorId filtra alunos/matriculas, mas totalProfessores continua sendo da unidade inteira', () => {
    const snapshot = dados({
      professores: [
        { id: 'p1', nome: 'Professor 1', ...PROFESSOR_PADRAO },
        { id: 'p2', nome: 'Professor 2', ...PROFESSOR_PADRAO },
      ],
      alunos: [
        { id: 'a1', nome: 'Meu Aluno', situacao: 'ATIVO', zonaVermelha: false, connect: false },
        { id: 'a2', nome: 'Aluno de Outro', situacao: 'ATIVO', zonaVermelha: false, connect: false },
      ],
      materias: [{ id: 'm1', nome: 'Materia', conteudos: [] }],
      matriculas: [
        {
          id: 'mat1',
          alunoId: 'a1',
          professorId: 'p1',
          materiaId: 'm1',
          estagio: null,
          situacao: 'ATIVA',
          tipoAtendimento: 'REGULAR',
          horarios: [],
        },
        {
          id: 'mat2',
          alunoId: 'a2',
          professorId: 'p2',
          materiaId: 'm1',
          estagio: null,
          situacao: 'ATIVA',
          tipoAtendimento: 'REGULAR',
          horarios: [],
        },
      ],
    })

    const agregado = calcularAgregacoesPainel(snapshot, 'p1')

    expect(agregado.totalAlunosAtivos).toBe(1)
    expect(agregado.totalMatriculasAtivas).toBe(1)
    expect(agregado.totalProfessores).toBe(2)
  })

  it('alertas trazem so alunos em zona vermelha dentro do escopo', () => {
    const snapshot = dados({
      professores: [{ id: 'p1', nome: 'Professor 1', ...PROFESSOR_PADRAO }],
      alunos: [
        { id: 'a1', nome: 'Aluno Vermelho', situacao: 'ATIVO', zonaVermelha: true, connect: false },
        { id: 'a2', nome: 'Vermelho de Outro', situacao: 'ATIVO', zonaVermelha: true, connect: false },
      ],
      materias: [{ id: 'm1', nome: 'Materia', conteudos: [] }],
      matriculas: [
        {
          id: 'mat1',
          alunoId: 'a1',
          professorId: 'p1',
          materiaId: 'm1',
          estagio: null,
          situacao: 'ATIVA',
          tipoAtendimento: 'REGULAR',
          horarios: [],
        },
      ],
    })

    const agregado = calcularAgregacoesPainel(snapshot, 'p1')

    expect(agregado.alertas.length).toBe(1)
    expect(agregado.alertas[0]?.alunoId).toBe('a1')
    expect(agregado.alertas[0]?.tipo).toBe('zona_vermelha')
  })

  it('ocupacaoPercentual e 0 quando nao ha capacidade nem horarios', () => {
    expect(calcularAgregacoesPainel(dados()).ocupacaoPercentual).toBe(0)
  })

  it('ocupacaoPercentual pesa REGULAR (2 slots de 30min) o dobro de PRE_ESCOLAR (1 slot)', () => {
    function ocupacaoCom(tipoAtendimento: 'REGULAR' | 'PRE_ESCOLAR') {
      const snapshot = dados({
        professores: [{ id: 'p1', nome: 'Professor', ...PROFESSOR_PADRAO }],
        alunos: [{ id: 'a1', nome: 'Aluno', situacao: 'ATIVO', zonaVermelha: false, connect: false }],
        materias: [{ id: 'm1', nome: 'Materia', conteudos: [] }],
        matriculas: [
          {
            id: 'mat1',
            alunoId: 'a1',
            professorId: 'p1',
            materiaId: 'm1',
          estagio: null,
            situacao: 'ATIVA',
            tipoAtendimento,
            horarios: [{ id: 'h1', diaSemana: 'SEG', horario: '14:00' }],
          },
        ],
      })
      return calcularAgregacoesPainel(snapshot).ocupacaoPercentual
    }

    const ocupacaoRegular = ocupacaoCom('REGULAR')
    const ocupacaoPreEscolar = ocupacaoCom('PRE_ESCOLAR')

    expect(ocupacaoRegular).toBeGreaterThan(0)
    expect(ocupacaoRegular).toBeCloseTo(ocupacaoPreEscolar * 2, 5)
  })
})
