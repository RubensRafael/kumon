import { HTTPException } from 'hono/http-exception'

import type { Prisma, PrismaClient } from '../../db/generated/client'
import type { ProfessorCreateInputType, ProfessorOutputType } from './professores.dto'

const INCLUDE_MATERIAS = { materias: { select: { materiaId: true } } } as const

type ProfessorComMaterias = Prisma.ProfessorGetPayload<{ include: typeof INCLUDE_MATERIAS }>

function paraProfessorOutput(professor: ProfessorComMaterias): ProfessorOutputType {
  return {
    id: professor.id,
    usuarioId: professor.usuarioId,
    nome: professor.nome,
    telefone: professor.telefone,
    email: professor.email,
    photoUrl: professor.photoUrl,
    diasDisponiveis: professor.diasDisponiveis,
    horarioInicial: professor.horarioInicial,
    horarioFinal: professor.horarioFinal,
    capacidadePorHorario: professor.capacidadePorHorario,
    duracaoAulaMin: professor.duracaoAulaMin,
    corAgenda: professor.corAgenda,
    observacoes: professor.observacoes,
    materiaIds: professor.materias.map((m) => m.materiaId),
  }
}

/**
 * `GET /professores` nao e filtrado por escopo — e diretorio de equipe,
 * visivel pra qualquer papel autenticado.
 */
export async function listarProfessores(prisma: PrismaClient): Promise<ProfessorOutputType[]> {
  const professores = await prisma.professor.findMany({
    include: INCLUDE_MATERIAS,
    orderBy: { nome: 'asc' },
  })
  return professores.map(paraProfessorOutput)
}

export async function buscarProfessor(prisma: PrismaClient, id: string): Promise<ProfessorOutputType> {
  const professor = await prisma.professor.findUnique({ where: { id }, include: INCLUDE_MATERIAS })
  if (!professor) {
    throw new HTTPException(404, { message: 'Professor nao encontrado.' })
  }
  return paraProfessorOutput(professor)
}

/**
 * Valida que todo `materiaId` existe e esta ativo. Nenhuma das duas checagens
 * esta escrita na spec como regra separada da segunda ("rejeitar materiaId
 * inativo") — a primeira evita que um id inexistente vire um erro cru de FK
 * do Postgres em vez de uma mensagem legivel (mesmo raciocinio aplicado a
 * `professorId` em `POST /usuarios`, PR 02).
 */
async function validarMateriaIds(prisma: PrismaClient, materiaIds: string[]): Promise<void> {
  const materias = await prisma.materia.findMany({ where: { id: { in: materiaIds } } })
  const encontrados = new Map(materias.map((materia) => [materia.id, materia]))

  const inexistentes = materiaIds.filter((id) => !encontrados.has(id))
  if (inexistentes.length > 0) {
    throw new HTTPException(400, {
      message: `materiaIds nao corresponde a materia(s) existente(s): ${inexistentes.join(', ')}.`,
    })
  }

  const inativas = materiaIds.filter((id) => encontrados.get(id)?.ativo === false)
  if (inativas.length > 0) {
    throw new HTTPException(400, {
      message: `materiaIds inclui materia(s) inativa(s): ${inativas.join(', ')}.`,
    })
  }
}

export async function criarProfessor(
  prisma: PrismaClient,
  input: ProfessorCreateInputType,
): Promise<ProfessorOutputType> {
  await validarMateriaIds(prisma, input.materiaIds)

  const professor = await prisma.professor.create({
    data: {
      nome: input.nome,
      telefone: input.telefone ?? null,
      email: input.email ?? null,
      photoUrl: input.photoUrl ?? null,
      diasDisponiveis: input.diasDisponiveis,
      horarioInicial: input.horarioInicial,
      horarioFinal: input.horarioFinal,
      capacidadePorHorario: input.capacidadePorHorario,
      duracaoAulaMin: input.duracaoAulaMin,
      corAgenda: input.corAgenda,
      observacoes: input.observacoes ?? null,
      materias: { create: input.materiaIds.map((materiaId) => ({ materiaId })) },
    },
    include: INCLUDE_MATERIAS,
  })

  return paraProfessorOutput(professor)
}

/**
 * Usada tanto por `admin` (schema completo) quanto por um professor editando
 * a si mesmo (schema restrito) — o handler ja escolheu e validou o schema
 * certo antes de chegar aqui; esta funcao so olha quais campos vieram
 * presentes no objeto parseado.
 */
export async function atualizarProfessor(
  prisma: PrismaClient,
  id: string,
  input: Partial<ProfessorCreateInputType>,
): Promise<ProfessorOutputType> {
  const existente = await prisma.professor.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Professor nao encontrado.' })
  }

  if (input.materiaIds !== undefined) {
    await validarMateriaIds(prisma, input.materiaIds)
  }

  const professor = await prisma.$transaction(async (tx) => {
    if (input.materiaIds !== undefined) {
      await tx.professorMateria.deleteMany({ where: { professorId: id } })
    }

    return tx.professor.update({
      where: { id },
      // Prisma ignora chave com valor `undefined` em `data` — spread
      // condicional so e necessario pra `materias`, que e escrita de
      // relacao (nao campo escalar) e teria que ser omitida por inteiro,
      // nao só ter um valor `undefined`.
      data: {
        nome: input.nome,
        telefone: input.telefone,
        email: input.email,
        photoUrl: input.photoUrl,
        diasDisponiveis: input.diasDisponiveis,
        horarioInicial: input.horarioInicial,
        horarioFinal: input.horarioFinal,
        capacidadePorHorario: input.capacidadePorHorario,
        duracaoAulaMin: input.duracaoAulaMin,
        corAgenda: input.corAgenda,
        observacoes: input.observacoes,
        materias:
          input.materiaIds !== undefined
            ? { create: input.materiaIds.map((materiaId) => ({ materiaId })) }
            : undefined,
      },
      include: INCLUDE_MATERIAS,
    })
  })

  return paraProfessorOutput(professor)
}
