/*
  Warnings:

  - You are about to drop the column `duracaoMin` on the `registros_aula` table. All the data in the column will be lost.
  - You are about to drop the column `horaFim` on the `registros_aula` table. All the data in the column will be lost.
  - You are about to drop the column `horaInicio` on the `registros_aula` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "registros_aula" DROP COLUMN "duracaoMin",
DROP COLUMN "horaFim",
DROP COLUMN "horaInicio";
