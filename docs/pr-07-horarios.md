# PR 07 — Horários semanais

## O que foi implementado

Seção 6 da spec, completa:

- `src/server/features/horarios/{horarios.dto,horarios.service,horarios.routes}.ts`:
  os 3 endpoints. Mesmo padrão de dois routers do PR 06 —
  `matriculaHorariosRoutes` (montado em `/matriculas`, convive com
  `matriculasRoutes`) e `horariosRoutes` (montado em `/horarios`).
- Escopo por professor chega em `GET /matriculas/:matriculaId/horarios`
  através da matrícula-pai: se o professor não é dono da matrícula, ela
  "não existe" pra ele — `404`, nunca `403`.
- `PUT /horarios/:id` com `diaSemana` no corpo: descartado em silêncio pelo
  próprio Zod (schema não declara o campo) — comportamento diferente do
  `PUT /matriculas/:id` (PR 06), que usa um `422` explícito. A spec pede
  exatamente essa diferença entre as duas rotas.
- 12 testes e2e em `tests/e2e/horarios.e2e.test.ts`.
- `tests/helpers/factories.ts`: `criarHorario`, seed direto — vai ser
  reaproveitado pelo PR 08 (registro de aula depende de um `horarioId`
  existente).

## Decisões tomadas

- **A duplicidade de horário (`409`) é checada na aplicação, não com uma
  `@@unique` no banco — apesar do apêndice da spec dizer "via constraint
  única".** O apêndice final ("Erros preveníveis pela UI") lista esse caso
  ao lado de "duas matrículas ativas pro mesmo aluno+matéria" como
  situações que o backend continua checando por causa de corrida entre duas
  abas/pessoas, e escreve especificamente "409 via constraint única" pra
  este caso. Mas o schema Prisma completo (seção fechada da spec, pra
  implementar exatamente como está escrito) não declara nenhuma `@@unique`
  em `MatriculaHorario`, e uma constraint única *não-filtrada* aqui seria
  ativamente incorreta: bloquearia recriar o mesmo dia/hora depois de
  desativar o antigo — que é exatamente o fluxo de "trocar horário" que a
  própria seção 6 descreve como válido (`POST` novo + `PUT { ativo: false }`
  no antigo). O que resolveria isso de verdade é um índice único parcial
  (`WHERE ativo = true`), que o Prisma Schema não expressa nativamente — só
  via SQL de migration escrito à mão. Como o schema já foi declarado fechado,
  optei por não introduzir uma migration adicional não pedida e implementei
  a checagem inteira na camada de aplicação (`findFirst` antes do
  `create`), coberta por dois testes: rejeita duplicata ativa, permite
  recriar depois de desativar.

## Pontos para revisão

- A checagem de duplicidade de horário na aplicação (e não como constraint
  de banco) reabre exatamente a janela de corrida que o apêndice da spec
  queria fechar: dois admins criando o mesmo horário ao mesmo tempo em
  telas diferentes podem, em tese, os dois passar pelo `findFirst` antes de
  qualquer um dos dois `create` completar. Isso é de baixa probabilidade
  prática (ação administrativa pouco concorrida), mas se isso importar de
  verdade, a correção é uma migration à mão criando um índice único parcial
  em `matricula_horarios (matricula_id, dia_semana, horario) WHERE ativo` —
  vale essa conversa antes do merge, já que muda o schema que foi declarado
  fechado.
