import 'dotenv/config'

import { randomUUID } from 'node:crypto'

import { Client } from 'pg'

import { hashSenha } from '../src/server/lib/senha'

/**
 * Só pra dev local — nunca rodar contra um banco de produção. Existe pra não
 * depender do fluxo de reset de senha (`/auth/solicitar-reset`) só pra
 * conseguir logar localmente: o admin (e a professora de teste) nascem com
 * senha já utilizável, ao contrário de todo usuário criado por
 * `POST /usuarios` (que nasce com `SENHA_PLACEHOLDER`, sempre inválida até
 * o primeiro reset).
 *
 * Usa `pg` direto (sem o Prisma Client gerado) de propósito: o client gerado
 * (`runtime = "cloudflare"`) carrega o Query Compiler via um import de WASM
 * module que só o Vite/Vitest sabem resolver (ver `vite-plugins/workerd-wasm-modules.ts`)
 * — um script standalone rodado com `tsx` não passa por esse pipeline.
 *
 * Idempotente pelo mesmo critério de sempre: se o admin já existe, assume
 * que a base já foi semeada (por essa mesma rodada) e não faz nada — assim
 * rodar `db:seed` de novo numa base já populada (ex.: só pra garantir login)
 * não duplica professores/alunos/matrículas.
 */
const ADMIN_EMAIL = 'admin@kflow.local'
const ADMIN_SENHA = 'senha123'
const PROFESSORA_TESTE_EMAIL = 'bianca@kflow.local'
const SENHA_PADRAO = 'senha123'

const DIA_INDEX: Record<string, number> = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 }

/** Data (YYYY-MM-DD) da ocorrência mais recente (hoje ou pra trás) de um dia da semana. */
function dataRecentePara(diaSemana: string, semanasAtras = 0): string {
  const hoje = new Date()
  const alvo = DIA_INDEX[diaSemana]
  const diff = (hoje.getDay() - alvo + 7) % 7
  const data = new Date(hoje)
  data.setDate(hoje.getDate() - diff - semanasAtras * 7)
  return data.toISOString().slice(0, 10)
}

function dataHaMeses(meses: number): Date {
  const data = new Date()
  data.setMonth(data.getMonth() - meses)
  return data
}

interface MateriaSeed {
  nome: string
  conteudos: { nome: string; ativo?: boolean }[]
}

const MATERIAS: MateriaSeed[] = [
  {
    nome: 'Matemática',
    conteudos: [
      { nome: 'Números naturais' },
      { nome: 'Frações' },
      { nome: 'Equações do 1º grau', ativo: false },
    ],
  },
  {
    nome: 'Português',
    conteudos: [{ nome: 'Interpretação de texto' }, { nome: 'Gramática básica' }],
  },
  {
    nome: 'Inglês',
    conteudos: [{ nome: 'Vocabulário básico' }, { nome: 'Verbos irregulares' }],
  },
  {
    nome: 'Japonês',
    conteudos: [{ nome: 'Hiragana' }, { nome: 'Katakana' }],
  },
]

interface ProfessorSeed {
  nome: string
  telefone: string
  email: string
  diasDisponiveis: string[]
  horarioInicial: string
  horarioFinal: string
  capacidadePorHorario: number
  corAgenda: string
  materias: string[]
  usuarioLogin?: string
}

/** Nomes/cores batem com a referência "vibe coding" que o usuário mandou -- só pra dar familiaridade visual nos prints. */
const PROFESSORES: ProfessorSeed[] = [
  {
    nome: 'Serena',
    telefone: '(11) 98888-1001',
    email: 'serena@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUI', 'SEX'],
    horarioInicial: '08:30',
    horarioFinal: '18:00',
    capacidadePorHorario: 2,
    corAgenda: '#e8a36b',
    materias: ['Matemática', 'Português', 'Inglês'],
  },
  {
    nome: 'Bianca',
    telefone: '(11) 98888-1002',
    email: 'bianca@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
    horarioInicial: '08:30',
    horarioFinal: '18:00',
    capacidadePorHorario: 2,
    corAgenda: '#987abf',
    materias: ['Matemática', 'Português', 'Inglês'],
    usuarioLogin: PROFESSORA_TESTE_EMAIL,
  },
  {
    nome: 'Manuela',
    telefone: '(11) 98888-1003',
    email: 'manuela@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
    horarioInicial: '08:30',
    horarioFinal: '18:00',
    capacidadePorHorario: 2,
    corAgenda: '#858585',
    materias: ['Matemática', 'Português', 'Inglês'],
  },
  {
    nome: 'Ilana',
    telefone: '(11) 98888-1004',
    email: 'ilana@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
    horarioInicial: '07:00',
    horarioFinal: '17:30',
    capacidadePorHorario: 5,
    corAgenda: '#81b076',
    materias: ['Matemática', 'Português', 'Inglês', 'Japonês'],
  },
  {
    nome: 'Paulo',
    telefone: '(11) 98888-1005',
    email: 'paulo@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
    horarioInicial: '08:30',
    horarioFinal: '17:20',
    capacidadePorHorario: 4,
    corAgenda: '#b34089',
    materias: ['Matemática', 'Português'],
  },
  {
    nome: 'Wesley',
    telefone: '(11) 98888-1006',
    email: 'wesley@kflow.local',
    diasDisponiveis: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
    horarioInicial: '13:00',
    horarioFinal: '18:20',
    capacidadePorHorario: 5,
    corAgenda: '#5d85c9',
    materias: ['Português', 'Inglês', 'Japonês'],
  },
]

interface AlunoSeed {
  nome: string
  responsavel: string
  telefone: string
  idadeAnos: number
  mesesDesdeMatricula: number
  situacao: 'ATIVO' | 'TRANCADO' | 'DESISTENTE'
  zonaVermelha?: boolean
  connect?: boolean
}

const ALUNOS: AlunoSeed[] = [
  { nome: 'Ana Clara Ferreira', responsavel: 'Marta Ferreira', telefone: '(11) 97777-2001', idadeAnos: 9, mesesDesdeMatricula: 8, situacao: 'ATIVO' },
  { nome: 'Bernardo Souza', responsavel: 'Rita Souza', telefone: '(11) 97777-2002', idadeAnos: 11, mesesDesdeMatricula: 14, situacao: 'ATIVO', connect: true },
  { nome: 'Camila Rodrigues', responsavel: 'Paulo Rodrigues', telefone: '(11) 97777-2003', idadeAnos: 8, mesesDesdeMatricula: 3, situacao: 'ATIVO', zonaVermelha: true },
  { nome: 'Diego Almeida', responsavel: 'Sandra Almeida', telefone: '(11) 97777-2004', idadeAnos: 10, mesesDesdeMatricula: 20, situacao: 'ATIVO' },
  { nome: 'Elisa Martins', responsavel: 'Carlos Martins', telefone: '(11) 97777-2005', idadeAnos: 7, mesesDesdeMatricula: 5, situacao: 'ATIVO' },
  { nome: 'Felipe Costa', responsavel: 'Renata Costa', telefone: '(11) 97777-2006', idadeAnos: 12, mesesDesdeMatricula: 24, situacao: 'ATIVO', connect: true },
  { nome: 'Gabriela Lima', responsavel: 'Fernanda Lima', telefone: '(11) 97777-2007', idadeAnos: 9, mesesDesdeMatricula: 6, situacao: 'ATIVO' },
  { nome: 'Henrique Pereira', responsavel: 'Marcos Pereira', telefone: '(11) 97777-2008', idadeAnos: 13, mesesDesdeMatricula: 30, situacao: 'TRANCADO' },
  { nome: 'Isabela Santos', responsavel: 'Juliana Santos', telefone: '(11) 97777-2009', idadeAnos: 6, mesesDesdeMatricula: 2, situacao: 'ATIVO' },
  { nome: 'João Vitor Oliveira', responsavel: 'Cláudia Oliveira', telefone: '(11) 97777-2010', idadeAnos: 10, mesesDesdeMatricula: 11, situacao: 'ATIVO', zonaVermelha: true },
  { nome: 'Karina Nunes', responsavel: 'Roberto Nunes', telefone: '(11) 97777-2011', idadeAnos: 8, mesesDesdeMatricula: 9, situacao: 'ATIVO' },
  { nome: 'Lucas Barbosa', responsavel: 'Patrícia Barbosa', telefone: '(11) 97777-2012', idadeAnos: 11, mesesDesdeMatricula: 18, situacao: 'DESISTENTE' },
  { nome: 'Mariana Teixeira', responsavel: 'André Teixeira', telefone: '(11) 97777-2013', idadeAnos: 9, mesesDesdeMatricula: 7, situacao: 'ATIVO' },
  { nome: 'Nicolas Ribeiro', responsavel: 'Vanessa Ribeiro', telefone: '(11) 97777-2014', idadeAnos: 12, mesesDesdeMatricula: 15, situacao: 'ATIVO' },
]

/** Slots de horário (grade de 30min) usados nas matrículas, escolhidos dentro da janela de cada professor. */
const SLOTS_POR_PROFESSOR: Record<string, string[]> = {
  Serena: ['09:00', '10:30', '14:00'],
  Bianca: ['09:00', '11:00', '15:00'],
  Manuela: ['08:30', '10:00', '16:00'],
  Ilana: ['07:30', '09:30', '13:00'],
  Paulo: ['09:00', '11:30', '14:30'],
  Wesley: ['13:30', '15:30', '17:00'],
}

async function main() {
  const databaseUrl = process.env.BACKEND_DATABASE_URL
  if (!databaseUrl) {
    throw new Error('BACKEND_DATABASE_URL nao definida -- confira o seu .env.')
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const existente = await client.query('SELECT 1 FROM "usuarios" WHERE "email" = $1', [ADMIN_EMAIL])
    if (existente.rowCount) {
      console.log(`Usuario admin de dev ja existe (${ADMIN_EMAIL}) -- nada a fazer.`)
      return
    }

    const senhaHash = await hashSenha(ADMIN_SENHA)
    await client.query(
      `INSERT INTO "usuarios" ("id", "nome", "email", "senhaHash", "papel", "ativo", "criadoEm", "atualizadoEm")
       VALUES ($1, $2, $3, $4, 'ADMIN'::"Papel", true, now(), now())`,
      [randomUUID(), 'Admin (dev)', ADMIN_EMAIL, senhaHash],
    )
    console.log(`Usuario admin de dev criado: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`)

    // -- Materias + conteudos --------------------------------------------
    const materiaIdPorNome = new Map<string, string>()
    for (const materia of MATERIAS) {
      const materiaId = randomUUID()
      materiaIdPorNome.set(materia.nome, materiaId)
      await client.query(`INSERT INTO "materias" ("id", "nome", "ativo") VALUES ($1, $2, true)`, [
        materiaId,
        materia.nome,
      ])
      for (const conteudo of materia.conteudos) {
        await client.query(
          `INSERT INTO "conteudos" ("id", "materiaId", "nome", "ativo") VALUES ($1, $2, $3, $4)`,
          [randomUUID(), materiaId, conteudo.nome, conteudo.ativo ?? true],
        )
      }
    }
    console.log(`${MATERIAS.length} materias criadas.`)

    // -- Professores + professor_materia + (1) usuario vinculado ---------
    const professorIdPorNome = new Map<string, string>()
    for (const professor of PROFESSORES) {
      const professorId = randomUUID()
      professorIdPorNome.set(professor.nome, professorId)

      let usuarioId: string | null = null
      if (professor.usuarioLogin) {
        usuarioId = randomUUID()
        await client.query(
          `INSERT INTO "usuarios" ("id", "nome", "email", "senhaHash", "papel", "ativo", "criadoEm", "atualizadoEm")
           VALUES ($1, $2, $3, $4, 'PROFESSOR'::"Papel", true, now(), now())`,
          [usuarioId, professor.nome, professor.usuarioLogin, await hashSenha(SENHA_PADRAO)],
        )
      }

      await client.query(
        `INSERT INTO "professores"
           ("id", "usuarioId", "nome", "telefone", "email", "diasDisponiveis", "horarioInicial",
            "horarioFinal", "capacidadePorHorario", "corAgenda", "criadoEm", "atualizadoEm")
         VALUES ($1, $2, $3, $4, $5, $6::"DiaSemana"[], $7, $8, $9, $10, now(), now())`,
        [
          professorId,
          usuarioId,
          professor.nome,
          professor.telefone,
          professor.email,
          professor.diasDisponiveis,
          professor.horarioInicial,
          professor.horarioFinal,
          professor.capacidadePorHorario,
          professor.corAgenda,
        ],
      )

      for (const nomeMateria of professor.materias) {
        const materiaId = materiaIdPorNome.get(nomeMateria)
        if (!materiaId) continue
        await client.query(
          `INSERT INTO "professor_materia" ("professorId", "materiaId") VALUES ($1, $2)`,
          [professorId, materiaId],
        )
      }
    }
    console.log(`${PROFESSORES.length} professores criados (login de teste: ${PROFESSORA_TESTE_EMAIL} / ${SENHA_PADRAO}).`)

    // -- Alunos ------------------------------------------------------------
    const alunoIds: { id: string; nome: string }[] = []
    for (const aluno of ALUNOS) {
      const alunoId = randomUUID()
      alunoIds.push({ id: alunoId, nome: aluno.nome })
      const dataNascimento = new Date()
      dataNascimento.setFullYear(dataNascimento.getFullYear() - aluno.idadeAnos)

      await client.query(
        `INSERT INTO "alunos"
           ("id", "nome", "responsavel", "telefone", "whatsapp", "dataNascimento", "dataMatricula",
            "situacao", "zonaVermelha", "connect", "criadoEm", "atualizadoEm")
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7::"SituacaoAluno", $8, $9, now(), now())`,
        [
          alunoId,
          aluno.nome,
          aluno.responsavel,
          aluno.telefone,
          dataNascimento,
          dataHaMeses(aluno.mesesDesdeMatricula),
          aluno.situacao,
          aluno.zonaVermelha ?? false,
          aluno.connect ?? false,
        ],
      )
    }
    console.log(`${ALUNOS.length} alunos criados.`)

    // -- Matriculas + horarios + registros de aula -------------------------
    // Cada aluno ativo ganha 1 matricula (os 2 primeiros ganham uma segunda,
    // pra ter pelo menos alguns casos de "mais de uma materia"). Professor +
    // materia sempre respeitam professor_materia (pares validos de verdade,
    // nao so no schema -- o mesmo cruzamento que o backend valida).
    let totalMatriculas = 0
    let totalHorarios = 0
    let totalRegistros = 0

    for (let i = 0; i < alunoIds.length; i++) {
      const aluno = alunoIds[i]!
      const alunoSeed = ALUNOS[i]!
      if (alunoSeed.situacao === 'DESISTENTE') continue // aluno desistente sem matricula ativa nova

      const numMatriculas = i < 2 ? 2 : 1
      const professoresEscolhidos = new Set<string>()

      for (let m = 0; m < numMatriculas; m++) {
        const professor = PROFESSORES[(i + m) % PROFESSORES.length]!
        if (professoresEscolhidos.has(professor.nome)) continue
        professoresEscolhidos.add(professor.nome)

        const nomeMateria = professor.materias[m % professor.materias.length]!
        const materiaId = materiaIdPorNome.get(nomeMateria)!
        const professorId = professorIdPorNome.get(professor.nome)!
        const matriculaId = randomUUID()
        const tipoAtendimento = alunoSeed.idadeAnos <= 6 ? 'PRE_ESCOLAR' : 'REGULAR'

        await client.query(
          `INSERT INTO "matriculas"
             ("id", "alunoId", "professorId", "materiaId", "estagio", "tipoAtendimento",
              "situacao", "criadoEm", "atualizadoEm")
           VALUES ($1, $2, $3, $4, $5, $6::"TipoAtendimento", 'ATIVA'::"SituacaoMatricula", now(), now())`,
          [matriculaId, aluno.id, professorId, materiaId, `Nível ${1 + (i % 4)}A`, tipoAtendimento],
        )
        totalMatriculas++

        // 1-2 dias por matricula, dentro da disponibilidade real do professor.
        const dias = professor.diasDisponiveis
        const diasEscolhidos = dias.length > 3 ? [dias[0]!, dias[2]!] : [dias[0]!]
        const slots = SLOTS_POR_PROFESSOR[professor.nome] ?? [professor.horarioInicial]

        for (let d = 0; d < diasEscolhidos.length; d++) {
          const diaSemana = diasEscolhidos[d]!
          const horarioValor = slots[(m + d) % slots.length]!
          const horarioId = randomUUID()

          await client.query(
            `INSERT INTO "matricula_horarios" ("id", "matriculaId", "diaSemana", "horario", "ativo", "criadoEm")
             VALUES ($1, $2, $3::"DiaSemana", $4, true, now())`,
            [horarioId, matriculaId, diaSemana, horarioValor],
          )
          totalHorarios++

          // Semana passada: sempre registrada (da volume pro Historico).
          // Semana atual: só metade dos horarios -- deixa a outra metade
          // "pendente" pro Acompanhamento ter o que mostrar.
          const conteudosDaMateria = MATERIAS.find((mt) => mt.nome === nomeMateria)?.conteudos ?? []
          const conteudoAtivo = conteudosDaMateria.find((c) => c.ativo !== false)

          const ocorrencias = totalHorarios % 2 === 0 ? [0, 1] : [1]
          for (const semanasAtras of ocorrencias) {
            const registroId = randomUUID()
            await client.query(
              `INSERT INTO "registros_aula"
                 ("id", "horarioId", "matriculaId", "data", "chegada", "boletim", "atividadeCasa",
                  "foco", "autonomia", "comportamento", "desempenho", "criadoEm", "atualizadoEm")
               VALUES ($1, $2, $3, $4, 'PRESENTE'::"Chegada", 'PEGOU'::"Boletim", 'FEZ'::"AtividadeCasa",
                       'BOM'::"Foco", 'BOA'::"Autonomia", 'ADEQUADO'::"Comportamento", 'BOM'::"Desempenho",
                       now(), now())`,
              [registroId, horarioId, matriculaId, dataRecentePara(diaSemana, semanasAtras)],
            )
            totalRegistros++

            if (conteudoAtivo) {
              const conteudoRow = await client.query(
                `SELECT "id" FROM "conteudos" WHERE "materiaId" = $1 AND "nome" = $2 LIMIT 1`,
                [materiaId, conteudoAtivo.nome],
              )
              const conteudoId = conteudoRow.rows[0]?.id as string | undefined
              if (conteudoId) {
                await client.query(
                  `INSERT INTO "registro_aula_conteudo" ("registroId", "conteudoId") VALUES ($1, $2)`,
                  [registroId, conteudoId],
                )
              }
            }
          }
        }
      }
    }
    console.log(`${totalMatriculas} matriculas, ${totalHorarios} horarios, ${totalRegistros} registros de aula criados.`)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
