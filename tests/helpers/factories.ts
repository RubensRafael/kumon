import { hashSenha } from '../../src/server/lib/senha'
import { prisma } from './setup'

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
      email: opcoes.email ?? 'admin@kflow.test',
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
      email: opcoes.email ?? 'professor@kflow.test',
      papel: 'PROFESSOR',
      ativo: opcoes.ativo ?? true,
      senhaHash: await hashSenha(senha),
    },
  })
  await prisma.professor.update({ where: { id: professor.id }, data: { usuarioId: usuario.id } })
  return { usuario, professor, senha }
}

interface CriarMateriaOpcoes {
  nome: string
  ativo?: boolean
}

/**
 * A feature de materias so chega no PR 04 — ate la, os testes que precisam
 * de um `materiaId` valido (ex.: `POST /professores`) semeiam a linha
 * direto pelo Prisma, do mesmo jeito que `criarProfessor` fez pro PR 02.
 *
 * `nome` e obrigatorio (nao tem default gerado) -- `Materia.nome` nao tem
 * `@unique` no schema, entao nao ha colisao a evitar, e o mesmo campo e
 * obrigatorio no DTO real (`MateriaCreateInput`).
 */
export async function criarMateria(opcoes: CriarMateriaOpcoes) {
  return prisma.materia.create({
    data: {
      nome: opcoes.nome,
      ativo: opcoes.ativo ?? true,
    },
  })
}

interface CriarAlunoOpcoes {
  nome: string
  dataMatricula?: Date
}

/** `nome` obrigatorio -- mesmo raciocinio de `criarMateria`. */
export async function criarAluno(opcoes: CriarAlunoOpcoes) {
  return prisma.aluno.create({
    data: {
      nome: opcoes.nome,
      dataMatricula: opcoes.dataMatricula ?? new Date(),
    },
  })
}

interface CriarMatriculaOpcoes {
  alunoId: string
  professorId: string
  materiaId: string
  situacao?: 'ATIVA' | 'PAUSADA' | 'ENCERRADA'
}

/**
 * A feature de matriculas so chega no PR 06 — ate la, os testes de escopo
 * (PR 05 em diante) semeiam a linha direto pelo Prisma, mesma estrategia
 * usada pra `Professor`/`Materia` nos PRs anteriores.
 */
export async function criarMatricula(opcoes: CriarMatriculaOpcoes) {
  return prisma.matricula.create({
    data: {
      alunoId: opcoes.alunoId,
      professorId: opcoes.professorId,
      materiaId: opcoes.materiaId,
      tipoAtendimento: 'REGULAR',
      situacao: opcoes.situacao ?? 'ATIVA',
    },
  })
}

interface CriarHorarioOpcoes {
  matriculaId: string
  diaSemana?: 'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'
  horario?: string
  ativo?: boolean
}

/** A feature de registro de aula (PR 08) precisa de horarios ja existentes pra semear seus proprios testes. */
export async function criarHorario(opcoes: CriarHorarioOpcoes) {
  return prisma.matriculaHorario.create({
    data: {
      matriculaId: opcoes.matriculaId,
      diaSemana: opcoes.diaSemana ?? 'SEG',
      horario: opcoes.horario ?? '14:00',
      ativo: opcoes.ativo ?? true,
    },
  })
}
