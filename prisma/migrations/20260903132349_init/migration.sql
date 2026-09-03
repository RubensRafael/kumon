-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB');

-- CreateEnum
CREATE TYPE "SituacaoAluno" AS ENUM ('ATIVO', 'TRANCADO', 'DESISTENTE');

-- CreateEnum
CREATE TYPE "TipoAtendimento" AS ENUM ('REGULAR', 'PRE_ESCOLAR');

-- CreateEnum
CREATE TYPE "SituacaoMatricula" AS ENUM ('ATIVA', 'PAUSADA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "Chegada" AS ENUM ('PRESENTE', 'ATRASADO', 'FALTOU');

-- CreateEnum
CREATE TYPE "Boletim" AS ENUM ('PEGOU', 'NAO_PEGOU', 'PROBLEMA');

-- CreateEnum
CREATE TYPE "AtividadeCasa" AS ENUM ('FEZ', 'FEZ_PARCIALMENTE', 'NAO_FEZ', 'NAO_HAVIA');

-- CreateEnum
CREATE TYPE "Foco" AS ENUM ('BAIXO', 'REGULAR', 'BOM', 'EXCELENTE');

-- CreateEnum
CREATE TYPE "Autonomia" AS ENUM ('BAIXA', 'REGULAR', 'BOA', 'EXCELENTE');

-- CreateEnum
CREATE TYPE "Comportamento" AS ENUM ('NECESSITOU_INTERVENCAO', 'OSCILOU', 'ADEQUADO', 'EXCELENTE');

-- CreateEnum
CREATE TYPE "Desempenho" AS ENUM ('PRECISOU_INTERVENCAO', 'APRESENTOU_DIFICULDADE', 'BOM', 'EXCELENTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "resetTokenHash" TEXT,
    "resetTokenExpiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "diasDisponiveis" "DiaSemana"[],
    "horarioInicial" TEXT NOT NULL,
    "horarioFinal" TEXT NOT NULL,
    "capacidadePorHorario" INTEGER NOT NULL,
    "duracaoAulaMin" INTEGER NOT NULL,
    "corAgenda" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_materia" (
    "professorId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "professor_materia_pkey" PRIMARY KEY ("professorId","materiaId")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "responsavel" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "dataMatricula" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoAluno" NOT NULL DEFAULT 'ATIVO',
    "zonaVermelha" BOOLEAN NOT NULL DEFAULT false,
    "connect" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "estagio" TEXT,
    "tipoAtendimento" "TipoAtendimento" NOT NULL,
    "situacao" "SituacaoMatricula" NOT NULL DEFAULT 'ATIVA',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matricula_horarios" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horario" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matricula_horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_aula" (
    "id" TEXT NOT NULL,
    "horarioId" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "estagio" TEXT,
    "chegada" "Chegada",
    "boletim" "Boletim",
    "atividadeCasa" "AtividadeCasa",
    "foco" "Foco",
    "autonomia" "Autonomia",
    "comportamento" "Comportamento",
    "desempenho" "Desempenho",
    "anotacao" TEXT,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "horaInicio" TIMESTAMP(3),
    "horaFim" TIMESTAMP(3),
    "duracaoMin" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_aula_conteudo" (
    "registroId" TEXT NOT NULL,
    "conteudoId" TEXT NOT NULL,

    CONSTRAINT "registro_aula_conteudo_pkey" PRIMARY KEY ("registroId","conteudoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professores_usuarioId_key" ON "professores"("usuarioId");

-- CreateIndex
CREATE INDEX "conteudos_materiaId_idx" ON "conteudos"("materiaId");

-- CreateIndex
CREATE INDEX "matriculas_professorId_idx" ON "matriculas"("professorId");

-- CreateIndex
CREATE INDEX "matriculas_alunoId_idx" ON "matriculas"("alunoId");

-- CreateIndex
CREATE INDEX "matricula_horarios_matriculaId_idx" ON "matricula_horarios"("matriculaId");

-- CreateIndex
CREATE INDEX "registros_aula_data_idx" ON "registros_aula"("data");

-- CreateIndex
CREATE UNIQUE INDEX "registros_aula_horarioId_data_key" ON "registros_aula"("horarioId", "data");

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_materia" ADD CONSTRAINT "professor_materia_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_materia" ADD CONSTRAINT "professor_materia_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula_horarios" ADD CONSTRAINT "matricula_horarios_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_aula" ADD CONSTRAINT "registros_aula_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "matricula_horarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_aula" ADD CONSTRAINT "registros_aula_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_aula_conteudo" ADD CONSTRAINT "registro_aula_conteudo_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_aula_conteudo" ADD CONSTRAINT "registro_aula_conteudo_conteudoId_fkey" FOREIGN KEY ("conteudoId") REFERENCES "conteudos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
