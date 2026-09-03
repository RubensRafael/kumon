import { hashSenha } from '../../src/server/lib/senha'
import { prisma } from './setup'

let contador = 0
/** Sufixo curto e unico por chamada, para nao colidir campos `@unique` entre testes. */
function unico(prefixo: string): string {
  contador += 1
  return `${prefixo}-${Date.now()}-${contador}`
}

interface CriarUsuarioOpcoes {
  nome?: string
  email?: string
  senha?: string
  ativo?: boolean
}

/** Usuario admin com senha real (bcrypt) — pronto para `POST /auth/login`. */
export async function criarUsuarioAdmin(opcoes: CriarUsuarioOpcoes = {}) {
  const senha = opcoes.senha ?? 'senha-super-secreta'
  const usuario = await prisma.usuario.create({
    data: {
      nome: opcoes.nome ?? 'Admin de Teste',
      email: opcoes.email ?? `${unico('admin')}@kflow.test`,
      papel: 'ADMIN',
      ativo: opcoes.ativo ?? true,
      senhaHash: await hashSenha(senha),
    },
  })
  return { usuario, senha }
}

interface CriarProfessorOpcoes {
  nome?: string
}

/**
 * Cria so a linha de `Professor`, sem `Usuario` vinculado — o suficiente para
 * os testes de PR 02 (que precisam de um `professorId` valido para exercitar
 * `POST /usuarios`), sem depender da feature de professores (PR 03).
 */
export async function criarProfessor(opcoes: CriarProfessorOpcoes = {}) {
  return prisma.professor.create({
    data: {
      nome: opcoes.nome ?? 'Professor de Teste',
      diasDisponiveis: ['SEG', 'QUA', 'SEX'],
      horarioInicial: '08:00',
      horarioFinal: '18:00',
      capacidadePorHorario: 4,
      duracaoAulaMin: 60,
      corAgenda: '#4f46e5',
    },
  })
}

/** Usuario professor, ja com o vinculo em `Professor.usuarioId`, e senha real. */
export async function criarUsuarioProfessor(opcoes: CriarUsuarioOpcoes = {}) {
  const professor = await criarProfessor()
  const senha = opcoes.senha ?? 'senha-super-secreta'
  const usuario = await prisma.usuario.create({
    data: {
      nome: opcoes.nome ?? 'Professor de Teste',
      email: opcoes.email ?? `${unico('professor')}@kflow.test`,
      papel: 'PROFESSOR',
      ativo: opcoes.ativo ?? true,
      senhaHash: await hashSenha(senha),
    },
  })
  await prisma.professor.update({ where: { id: professor.id }, data: { usuarioId: usuario.id } })
  return { usuario, professor, senha }
}

interface CriarMateriaOpcoes {
  nome?: string
  ativo?: boolean
}

/**
 * A feature de materias so chega no PR 04 — ate la, os testes que precisam
 * de um `materiaId` valido (ex.: `POST /professores`) semeiam a linha
 * direto pelo Prisma, do mesmo jeito que `criarProfessor` fez pro PR 02.
 */
export async function criarMateria(opcoes: CriarMateriaOpcoes = {}) {
  return prisma.materia.create({
    data: {
      nome: opcoes.nome ?? unico('Materia'),
      ativo: opcoes.ativo ?? true,
    },
  })
}
