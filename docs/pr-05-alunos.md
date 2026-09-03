# PR 05 — Alunos

## O que foi implementado

Seção 4 da spec, completa:

- `src/server/middlewares/scope-to-professor.middleware.ts`: primeira
  implementação do `scopeToProfessor` descrito na seção "Middlewares" do
  `plan.md`. Só calcula o valor do filtro (`c.var.escopoProfessorId`) — quem
  aplica é cada `*.service.ts`, porque a forma de filtrar muda por feature
  (aqui, `EXISTS` numa relação to-many; em matrícula, PR 06, vai ser uma
  coluna direta).
- `src/server/lib/data.ts`: `parseData`/`formatarData` — converte
  "AAAA-MM-DD" ↔ `Date`, com erro `400` legível para data inválida em vez do
  erro cru do Prisma. Reaproveitável por qualquer feature futura com campo
  de data (registro de aula, PR 08).
- `src/server/features/alunos/{alunos.dto,alunos.service,alunos.routes}.ts`:
  os 4 endpoints da seção 4.
- 12 testes e2e em `tests/e2e/alunos.e2e.test.ts`, incluindo um teste
  específico para "aluno com duas matrículas ativas do mesmo professor
  aparece uma única vez" — a checagem direta de que o filtro é `EXISTS`
  (`some`) e não um `JOIN` que duplicaria a linha.
- `tests/helpers/factories.ts`: `criarAluno`, `criarMatricula` (seed direto —
  a feature de matrícula só chega no PR 06).

## Decisões tomadas

- **`scopeToProfessor` não filtra "como" — só calcula o valor.** O
  pseudocódigo do `plan.md` fala em "injeta `professorId` no filtro da
  query", frase que descreve bem uma única feature, mas a spec lista seis
  entidades escopadas com formas de filtro completamente diferentes entre si
  (coluna direta, `EXISTS`, join encadeado, vista computada). Fazer o
  middleware "injetar o filtro" de verdade exigiria ele conhecer o formato
  de cada query, o que quebraria a separação entre middleware (autorização)
  e service (acesso a dado). Resolvido assim: o middleware só decide *quem*
  (`null` ou um `professorId`), cada service decide *como*.
- **`dataNascimento`/`dataMatricula` formatados como "AAAA-MM-DD", não
  timestamp ISO completo.** A spec declara os dois como `z.string()` puro,
  sem especificar formato. Como são conceitualmente datas de calendário (não
  timestamps com hora), escolhi data pura — e validada com uma mensagem
  amigável (`parseData`) em vez de deixar um valor inválido virar erro cru
  do Postgres.
- **Filtro de escopo usa `matriculas: { some: { professorId, situacao: 'ATIVA' } }`.**
  A regra de negócio fala em "matrícula ativa" — só contam matrículas com
  `situacao: 'ATIVA'` (não `PAUSADA`, que também é "não encerrada" mas não é
  literalmente "ativa"). Testado explicitamente: um aluno cuja única
  matrícula com aquele professor está `ENCERRADA` não aparece pra ele.

## Pontos para revisão

- Segui a leitura literal de "matrícula ativa" = `situacao: 'ATIVA'`, não
  "matrícula não encerrada" (o que incluiria `PAUSADA`). Se a intenção real
  for "professor ainda tem algum vínculo com esse aluno, mesmo pausado",
  isso muda o filtro — vale confirmar com o time antes do PR 06 (matrículas)
  fixar esse mesmo padrão em mais lugares.
- Não há endpoint de exclusão de aluno na spec (nem físico, nem soft
  delete) — só `situacao` como enum (`ativo`/`trancado`/`desistente`) sinaliza
  o "fim" de um aluno. Comportamento implementado exatamente como
  especificado, só registrando que não há como remover um cadastro de
  teste/erro de digitação por essa API.
