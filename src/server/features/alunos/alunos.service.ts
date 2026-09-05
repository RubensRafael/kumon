import { HTTPException } from 'hono/http-exception'

import type { Aluno, PrismaClient } from '../../db/generated/client'
import type { AlunoCreateInputType, AlunoOutputType, AlunoUpdateInputType } from '../../../shared/dto/alunos.dto'

// Nenhuma query de aluno usa `include`/`select` -- a linha sempre vem
// completa, entao o model `Aluno` exportado pelo client ja e o shape certo,
// sem precisar de uma interface copiada campo a campo.
function paraAlunoOutput(aluno: Aluno): AlunoOutputType {
  return {
    id: aluno.id,
    nome: aluno.nome,
    responsavel: aluno.responsavel,
    telefone: aluno.telefone,
    whatsapp: aluno.whatsapp,
    email: aluno.email,
    dataNascimento: aluno.dataNascimento,
    observacoes: aluno.observacoes,
    dataMatricula: aluno.dataMatricula,
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
      dataNascimento: input.dataNascimento ?? null,
      observacoes: input.observacoes ?? null,
      dataMatricula: input.dataMatricula,
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

  // Prisma ignora chave com valor `undefined` em `data` -- `dataNascimento`/
  // `dataMatricula` ja chegam como `Date` (coagidas pelo Zod em
  // `alunos.dto.ts`), entao nao ha mais motivo pra tratamento especial.
  const aluno = await prisma.aluno.update({
    where: { id },
    data: {
      nome: input.nome,
      responsavel: input.responsavel,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      email: input.email,
      dataNascimento: input.dataNascimento,
      observacoes: input.observacoes,
      dataMatricula: input.dataMatricula,
      situacao: input.situacao,
      zonaVermelha: input.zonaVermelha,
      connect: input.connect,
    },
  })
  return paraAlunoOutput(aluno)
}
