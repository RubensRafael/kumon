import { HTTPException } from 'hono/http-exception'

import type { PrismaClient } from '../../db/generated/client'
import type {
  ConteudoCreateInputType,
  ConteudoOutputType,
  ConteudoUpdateInputType,
  MateriaCreateInputType,
  MateriaOutputType,
  MateriaUpdateInputType,
} from './materias.dto'

function paraMateriaOutput(materia: { id: string; nome: string; ativo: boolean }): MateriaOutputType {
  return { id: materia.id, nome: materia.nome, ativo: materia.ativo }
}

function paraConteudoOutput(conteudo: {
  id: string
  materiaId: string
  nome: string
  ativo: boolean
}): ConteudoOutputType {
  return { id: conteudo.id, materiaId: conteudo.materiaId, nome: conteudo.nome, ativo: conteudo.ativo }
}

export async function listarMaterias(
  prisma: PrismaClient,
  incluirInativas: boolean,
): Promise<MateriaOutputType[]> {
  const materias = await prisma.materia.findMany({
    where: incluirInativas ? undefined : { ativo: true },
    orderBy: { nome: 'asc' },
  })
  return materias.map(paraMateriaOutput)
}

export async function criarMateria(
  prisma: PrismaClient,
  input: MateriaCreateInputType,
): Promise<MateriaOutputType> {
  const materia = await prisma.materia.create({ data: { nome: input.nome } })
  return paraMateriaOutput(materia)
}

export async function atualizarMateria(
  prisma: PrismaClient,
  id: string,
  input: MateriaUpdateInputType,
): Promise<MateriaOutputType> {
  const existente = await prisma.materia.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Materia nao encontrada.' })
  }

  const materia = await prisma.materia.update({
    where: { id },
    data: {
      ...(input.nome !== undefined ? { nome: input.nome } : {}),
      ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
    },
  })
  return paraMateriaOutput(materia)
}

/** `GET /materias/:id/conteudos` sempre traz todos os conteudos (ativos e inativos) da materia. */
export async function listarConteudosDaMateria(
  prisma: PrismaClient,
  materiaId: string,
): Promise<ConteudoOutputType[]> {
  const materia = await prisma.materia.findUnique({ where: { id: materiaId }, select: { id: true } })
  if (!materia) {
    throw new HTTPException(404, { message: 'Materia nao encontrada.' })
  }

  const conteudos = await prisma.conteudo.findMany({ where: { materiaId }, orderBy: { nome: 'asc' } })
  return conteudos.map(paraConteudoOutput)
}

export async function criarConteudo(
  prisma: PrismaClient,
  input: ConteudoCreateInputType,
): Promise<ConteudoOutputType> {
  const materia = await prisma.materia.findUnique({ where: { id: input.materiaId } })
  if (!materia) {
    throw new HTTPException(400, { message: 'materiaId nao corresponde a nenhuma materia existente.' })
  }
  if (!materia.ativo) {
    throw new HTTPException(400, { message: 'Nao e possivel criar conteudo numa materia inativa.' })
  }

  const conteudo = await prisma.conteudo.create({
    data: { materiaId: input.materiaId, nome: input.nome },
  })
  return paraConteudoOutput(conteudo)
}

export async function atualizarConteudo(
  prisma: PrismaClient,
  id: string,
  input: ConteudoUpdateInputType,
): Promise<ConteudoOutputType> {
  const existente = await prisma.conteudo.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Conteudo nao encontrado.' })
  }

  if (input.materiaId !== undefined && input.materiaId !== existente.materiaId) {
    const materia = await prisma.materia.findUnique({ where: { id: input.materiaId } })
    if (!materia) {
      throw new HTTPException(400, { message: 'materiaId nao corresponde a nenhuma materia existente.' })
    }
    if (!materia.ativo) {
      throw new HTTPException(400, { message: 'Nao e possivel mover conteudo para uma materia inativa.' })
    }
  }

  const conteudo = await prisma.conteudo.update({
    where: { id },
    data: {
      ...(input.materiaId !== undefined ? { materiaId: input.materiaId } : {}),
      ...(input.nome !== undefined ? { nome: input.nome } : {}),
      ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
    },
  })
  return paraConteudoOutput(conteudo)
}
