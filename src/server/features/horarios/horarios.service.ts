import { HTTPException } from 'hono/http-exception'

import type { DiaSemana, PrismaClient } from '../../db/generated/client'
import type { HorarioCreateInputType, HorarioOutputType, HorarioUpdateInputType } from './horarios.dto'

interface HorarioRow {
  id: string
  matriculaId: string
  diaSemana: DiaSemana
  horario: string
  ativo: boolean
}

function paraHorarioOutput(horario: HorarioRow): HorarioOutputType {
  return {
    id: horario.id,
    matriculaId: horario.matriculaId,
    diaSemana: horario.diaSemana,
    horario: horario.horario,
    ativo: horario.ativo,
  }
}

/**
 * Escopo por professor chega aqui via a matricula-pai: se o professor nao e
 * dono da matricula, ela "nao existe" pra ele — mesmo 404 usado em todo
 * outro lugar da API pra visibilidade negada (nunca 403).
 */
async function buscarMatriculaEscopada(
  prisma: PrismaClient,
  matriculaId: string,
  escopoProfessorId: string | null,
) {
  const matricula = await prisma.matricula.findUnique({
    where: { id: matriculaId },
    select: { id: true, professorId: true },
  })

  if (!matricula || (escopoProfessorId !== null && matricula.professorId !== escopoProfessorId)) {
    throw new HTTPException(404, { message: 'Matricula nao encontrada.' })
  }

  return matricula
}

export async function listarHorariosDaMatricula(
  prisma: PrismaClient,
  matriculaId: string,
  escopoProfessorId: string | null,
): Promise<HorarioOutputType[]> {
  await buscarMatriculaEscopada(prisma, matriculaId, escopoProfessorId)

  const horarios = await prisma.matriculaHorario.findMany({
    where: { matriculaId },
    orderBy: [{ diaSemana: 'asc' }, { horario: 'asc' }],
  })
  return horarios.map(paraHorarioOutput)
}

/**
 * `409` se ja existir um horario ATIVO na mesma matricula+dia+hora. A spec
 * (apendice "Erros preveniveis pela UI") sugere que essa checagem deveria
 * ser "via constraint unica" no banco, mas o schema completo (ja fechado)
 * nao declara nenhuma `@@unique` em `MatriculaHorario` — e uma constraint
 * unica *nao-filtrada* aqui seria ativamente errada: bloquearia recriar o
 * mesmo dia/hora depois de desativa-lo, o que a propria spec descreve como
 * fluxo valido (trocar = criar novo + desativar o antigo). Implementado como
 * checagem de aplicacao (ver docs/pr-07-horarios.md, "Pontos para revisao").
 */
export async function criarHorario(
  prisma: PrismaClient,
  matriculaId: string,
  input: HorarioCreateInputType,
): Promise<HorarioOutputType> {
  const matricula = await prisma.matricula.findUnique({ where: { id: matriculaId }, select: { id: true } })
  if (!matricula) {
    throw new HTTPException(404, { message: 'Matricula nao encontrada.' })
  }

  const existente = await prisma.matriculaHorario.findFirst({
    where: { matriculaId, diaSemana: input.diaSemana, horario: input.horario, ativo: true },
    select: { id: true },
  })
  if (existente) {
    throw new HTTPException(409, {
      message: 'Ja existe um horario ativo para esta matricula neste dia e horario.',
    })
  }

  const horario = await prisma.matriculaHorario.create({
    data: { matriculaId, diaSemana: input.diaSemana, horario: input.horario },
  })
  return paraHorarioOutput(horario)
}

export async function atualizarHorario(
  prisma: PrismaClient,
  id: string,
  input: HorarioUpdateInputType,
): Promise<HorarioOutputType> {
  const existente = await prisma.matriculaHorario.findUnique({ where: { id } })
  if (!existente) {
    throw new HTTPException(404, { message: 'Horario nao encontrado.' })
  }

  // Prisma ignora chave com valor `undefined` em `data`.
  const horario = await prisma.matriculaHorario.update({
    where: { id },
    data: { ativo: input.ativo },
  })
  return paraHorarioOutput(horario)
}
