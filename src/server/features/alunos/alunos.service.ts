import { HTTPException } from 'hono/http-exception'

import { formatarData, parseData } from '../../lib/data'
import type { PrismaClient, SituacaoAluno } from '../../db/generated/client'
import type { AlunoCreateInputType, AlunoOutputType, AlunoUpdateInputType } from './alunos.dto'

interface AlunoRow {
  id: string
  nome: string
  responsavel: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  dataNascimento: Date | null
  observacoes: string | null
  dataMatricula: Date
  situacao: SituacaoAluno
  zonaVermelha: boolean
  connect: boolean
}

function paraAlunoOutput(aluno: AlunoRow): AlunoOutputType {
  return {
    id: aluno.id,
    nome: aluno.nome,
    responsavel: aluno.responsavel,
    telefone: aluno.telefone,
    whatsapp: aluno.whatsapp,
    email: aluno.email,
    dataNascimento: aluno.dataNascimento ? formatarData(aluno.dataNascimento) : null,
    observacoes: aluno.observacoes,
    dataMatricula: formatarData(aluno.dataMatricula),
    situacao: aluno.situacao,
    zonaVermelha: aluno.zonaVermelha,
    connect: aluno.connect,
  }
}

/**
 * `null` (admin) -> sem filtro. Um `professorId` -> "aluno tem ao menos uma
 * MATRICULA ativa com esse professorId", via `some` (EXISTS/semi-join no SQL
 * gerado pelo Prisma para filtro em relacao to-many — nunca um join que
 * duplicaria a linha do aluno por matricula).
 */
function condicaoEscopo(escopoProfessorId: string | null) {
  if (!escopoProfessorId) return {}
  return {
    matriculas: { some: { professorId: escopoProfessorId, situacao: 'ATIVA' as const } },
  }
}

export async function listarAlunos(
  prisma: PrismaClient,
  escopoProfessorId: string | null,
): Promise<AlunoOutputType[]> {
  const alunos = await prisma.aluno.findMany({
    where: condicaoEscopo(escopoProfessorId),
    orderBy: { nome: 'asc' },
  })
  return alunos.map(paraAlunoOutput)
}

export async function buscarAluno(
  prisma: PrismaClient,
  id: string,
  escopoProfessorId: string | null,
): Promise<AlunoOutputType> {
  // `findFirst`, nao `findUnique`: precisa combinar `id` com a condicao de
  // escopo, que nao e uma chave unica.
  const aluno = await prisma.aluno.findFirst({ where: { id, ...condicaoEscopo(escopoProfessorId) } })
  if (!aluno) {
    // Mesmo 404 tanto pra "nao existe" quanto pra "existe, mas e de outro
    // professor" — escopo por filtragem, nunca por 403 (ver plan.md, convencoes gerais).
    throw new HTTPException(404, { message: 'Aluno nao encontrado.' })
  }
  return paraAlunoOutput(aluno)
}

/** Cria so o aluno — matricula e um fluxo separado (seção 5 da spec). */
export async function criarAluno(prisma: PrismaClient, input: AlunoCreateInputType): Promise<AlunoOutputType> {
  const aluno = await prisma.aluno.create({
    data: {
      nome: input.nome,
      responsavel: input.responsavel ?? null,
      telefone: input.telefone ?? null,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      dataNascimento: input.dataNascimento ? parseData(input.dataNascimento, 'dataNascimento') : null,
      observacoes: input.observacoes ?? null,
      dataMatricula: parseData(input.dataMatricula, 'dataMatricula'),
      situacao: input.situacao,
      zonaVermelha: input.zonaVermelha,
      connect: input.connect,
    },
  })
  return paraAlunoOutput(aluno)
}

/** Admin-only mesmo pro professor "dono" do aluno — sem checagem de escopo aqui. */
export async function atualizarAluno(
  prisma: PrismaClient,
  id: string,
  input: AlunoUpdateInputType,
): Promise<AlunoOutputType> {
  const existente = await prisma.aluno.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Aluno nao encontrado.' })
  }

  const aluno = await prisma.aluno.update({
    where: { id },
    // Prisma ignora chave com valor `undefined` -- spread condicional so
    // sobra pra `dataNascimento`/`dataMatricula`, onde a guarda nao e sobre
    // o que o Prisma faz e sim pra nao chamar `parseData` (que exige
    // `string`) com `undefined` quando o campo nao veio no corpo.
    data: {
      nome: input.nome,
      responsavel: input.responsavel,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      email: input.email,
      ...(input.dataNascimento !== undefined
        ? { dataNascimento: parseData(input.dataNascimento, 'dataNascimento') }
        : {}),
      observacoes: input.observacoes,
      ...(input.dataMatricula !== undefined
        ? { dataMatricula: parseData(input.dataMatricula, 'dataMatricula') }
        : {}),
      situacao: input.situacao,
      zonaVermelha: input.zonaVermelha,
      connect: input.connect,
    },
  })
  return paraAlunoOutput(aluno)
}
