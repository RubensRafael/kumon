import { HTTPException } from 'hono/http-exception'

import { diaDaSemana } from '../../lib/data'
import type { Prisma, PrismaClient } from '../../db/generated/client'
import { Prisma as PrismaNamespace } from '../../db/generated/client'
import type {
  RegistroDetalheOutputType,
  RegistroInputType,
  RegistroResumoOutputType,
  RegistroUpdateInputType,
} from './registros.dto'

const INCLUDE_DETALHE = {
  horario: true,
  matricula: { include: { aluno: { select: { id: true, nome: true } } } },
  conteudos: { select: { conteudoId: true } },
} satisfies Prisma.RegistroAulaInclude

type RegistroRow = Prisma.RegistroAulaGetPayload<{ include: typeof INCLUDE_DETALHE }>

function paraDetalheOutput(registro: RegistroRow): RegistroDetalheOutputType {
  return {
    id: registro.id,
    horarioId: registro.horarioId,
    matriculaId: registro.matriculaId,
    alunoId: registro.matricula.alunoId,
    alunoNome: registro.matricula.aluno.nome,
    professorId: registro.matricula.professorId,
    materiaId: registro.matricula.materiaId,
    data: registro.data,
    horarioPrevisto: registro.horario.horario,
    // Nunca vem de nenhum input — sempre derivado aqui na hora de montar o output.
    status: registro.fechado ? 'CONCLUIDO' : 'EM_ANDAMENTO',
    estagio: registro.estagio,
    chegada: registro.chegada,
    boletim: registro.boletim,
    atividadeCasa: registro.atividadeCasa,
    foco: registro.foco,
    autonomia: registro.autonomia,
    comportamento: registro.comportamento,
    desempenho: registro.desempenho,
    conteudoIds: registro.conteudos.map((c) => c.conteudoId),
    anotacao: registro.anotacao,
    fechado: registro.fechado,
  }
}

/**
 * `null` (admin) -> sem checagem. Um `professorId` -> so enxerga registros da
 * propria `MATRICULA`. Mesmo 404 usado em toda a API pra "existe, mas nao e
 * seu" — nunca 403.
 */
async function buscarRegistroEscopado(
  prisma: PrismaClient,
  id: string,
  escopoProfessorId: string | null,
): Promise<RegistroRow> {
  const registro = await prisma.registroAula.findUnique({ where: { id }, include: INCLUDE_DETALHE })

  if (!registro || (escopoProfessorId !== null && registro.matricula.professorId !== escopoProfessorId)) {
    throw new HTTPException(404, { message: 'Registro de aula nao encontrado.' })
  }

  return registro
}

async function validarConteudoIds(
  prisma: PrismaClient,
  conteudoIds: string[] | undefined,
): Promise<string[] | undefined> {
  if (!conteudoIds) return undefined

  const encontrados = await prisma.conteudo.findMany({
    where: { id: { in: conteudoIds } },
    select: { id: true },
  })
  if (encontrados.length !== conteudoIds.length) {
    throw new HTTPException(400, {
      message: 'conteudoIds inclui id(s) que nao correspondem a nenhum conteudo existente.',
    })
  }

  return conteudoIds
}

/**
 * Nunca cria linha nenhuma: `LEFT JOIN` (aqui, um `include` filtrado) entre
 * `MATRICULA_HORARIO` (`ativo=true`, `diaSemana` batendo com o dia da semana
 * de `data`) e `REGISTRO_AULA` existente pra aquela data. Sem linha -> `id:
 * null`, `status: 'NAO_INICIADO'`.
 */
export async function listarRegistrosDoDia(
  prisma: PrismaClient,
  data: Date,
  escopoProfessorId: string | null,
): Promise<RegistroResumoOutputType[]> {
  const diaSemana = diaDaSemana(data)

  const horarios = await prisma.matriculaHorario.findMany({
    where: {
      ativo: true,
      diaSemana,
      ...(escopoProfessorId ? { matricula: { professorId: escopoProfessorId } } : {}),
    },
    include: {
      matricula: { include: { aluno: { select: { id: true, nome: true } } } },
      registros: { where: { data } },
    },
    orderBy: { horario: 'asc' },
  })

  return horarios.map((horario) => {
    const registro = horario.registros[0] ?? null
    return {
      id: registro?.id ?? null,
      horarioId: horario.id,
      matriculaId: horario.matriculaId,
      alunoId: horario.matricula.alunoId,
      alunoNome: horario.matricula.aluno.nome,
      professorId: horario.matricula.professorId,
      materiaId: horario.matricula.materiaId,
      data,
      horarioPrevisto: horario.horario,
      status: !registro ? 'NAO_INICIADO' : registro.fechado ? 'CONCLUIDO' : 'EM_ANDAMENTO',
    }
  })
}

export async function buscarRegistroDetalhe(
  prisma: PrismaClient,
  id: string,
  escopoProfessorId: string | null,
): Promise<RegistroDetalheOutputType> {
  const registro = await buscarRegistroEscopado(prisma, id, escopoProfessorId)
  return paraDetalheOutput(registro)
}

/**
 * `horarioId` de outro professor "nao existe" pra quem chama — `400` de
 * referencia invalida, nunca `403` (ver `plan.md`, "Middlewares" e
 * docs/pr-08-registros.md, "Decisoes tomadas").
 */
export async function criarRegistro(
  prisma: PrismaClient,
  input: RegistroInputType,
  escopoProfessorId: string | null,
): Promise<RegistroDetalheOutputType> {
  const horario = await prisma.matriculaHorario.findUnique({
    where: { id: input.horarioId },
    include: { matricula: true },
  })
  if (!horario || (escopoProfessorId !== null && horario.matricula.professorId !== escopoProfessorId)) {
    throw new HTTPException(400, { message: 'horarioId nao corresponde a nenhum horario existente.' })
  }

  const conteudoIds = await validarConteudoIds(prisma, input.conteudoIds)

  try {
    const registro = await prisma.registroAula.create({
      data: {
        horarioId: input.horarioId,
        matriculaId: horario.matriculaId,
        data: input.data,
        // Unica copia (snapshot) intencional do schema: nunca vem do input.
        estagio: horario.matricula.estagio,
        chegada: input.chegada,
        boletim: input.boletim,
        atividadeCasa: input.atividadeCasa,
        foco: input.foco,
        autonomia: input.autonomia,
        comportamento: input.comportamento,
        desempenho: input.desempenho,
        anotacao: input.anotacao,
        conteudos: conteudoIds ? { create: conteudoIds.map((conteudoId) => ({ conteudoId })) } : undefined,
      },
      include: INCLUDE_DETALHE,
    })
    return paraDetalheOutput(registro)
  } catch (error) {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HTTPException(409, {
        message: 'Ja existe um registro de aula para este horario nesta data.',
      })
    }
    throw error
  }
}

/** Nao bloqueia edicao de um registro `fechado: true` — convencao de UI (form read-only apos "Finalizar"). */
export async function atualizarRegistro(
  prisma: PrismaClient,
  id: string,
  input: RegistroUpdateInputType,
  escopoProfessorId: string | null,
): Promise<RegistroDetalheOutputType> {
  await buscarRegistroEscopado(prisma, id, escopoProfessorId)
  const conteudoIds = await validarConteudoIds(prisma, input.conteudoIds)

  const registro = await prisma.$transaction(async (tx) => {
    if (conteudoIds) {
      await tx.registroAulaConteudo.deleteMany({ where: { registroId: id } })
    }

    // Prisma ignora chave com valor `undefined` em `data` -- spread
    // condicional so sobra pra `conteudos`, que e escrita de relacao.
    return tx.registroAula.update({
      where: { id },
      data: {
        chegada: input.chegada,
        boletim: input.boletim,
        atividadeCasa: input.atividadeCasa,
        foco: input.foco,
        autonomia: input.autonomia,
        comportamento: input.comportamento,
        desempenho: input.desempenho,
        anotacao: input.anotacao,
        ...(conteudoIds ? { conteudos: { create: conteudoIds.map((conteudoId) => ({ conteudoId })) } } : {}),
      },
      include: INCLUDE_DETALHE,
    })
  })

  return paraDetalheOutput(registro)
}

/** Marca `fechado: true`. Idempotente: numa segunda chamada, so devolve o estado atual. */
export async function finalizarRegistro(
  prisma: PrismaClient,
  id: string,
  escopoProfessorId: string | null,
): Promise<RegistroDetalheOutputType> {
  const registro = await buscarRegistroEscopado(prisma, id, escopoProfessorId)

  if (registro.fechado) {
    return paraDetalheOutput(registro)
  }

  const atualizado = await prisma.registroAula.update({
    where: { id },
    data: { fechado: true },
    include: INCLUDE_DETALHE,
  })
  return paraDetalheOutput(atualizado)
}
