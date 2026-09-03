# PR 06 — Matrículas

## O que foi implementado

Seção 5 da spec, completa:

- `src/server/features/matriculas/matriculas.middleware.ts`:
  `rejeitarTrocaProfessorMateria` — o `422` explícito quando `PUT /matriculas/:id`
  recebe `professorId` ou `materiaId` no corpo, com a mensagem exata que a
  spec pede, explicando o caminho certo (encerrar + criar nova).
- `src/server/features/matriculas/{matriculas.dto,matriculas.service,matriculas.routes}.ts`:
  os 3 endpoints da seção 5. `matriculas.routes.ts` exporta dois routers —
  `alunoMatriculasRoutes` (montado em `/alunos`, convive com `alunosRoutes`
  porque os padrões de rota não colidem: `/:id` tem um segmento, `/:alunoId/matriculas`
  tem dois) e `matriculasRoutes` (montado em `/matriculas`).
- 12 testes e2e em `tests/e2e/matriculas.e2e.test.ts`, incluindo o fluxo
  completo de troca de professor/matéria (encerrar a antiga → criar a nova)
  e a checagem de que a matrícula nova nasce com zero `MatriculaHorario`.

## Decisões tomadas

- **`rejeitarTrocaProfessorMateria` lê o corpo com `c.req.json()` antes do
  `zValidator` rodar.** A checagem depende de saber se `professorId`/`materiaId`
  *vieram* no corpo — informação que o `MatriculaUpdateInput` já não carrega
  (ele nem declara esses campos), então tem que ser antes da validação, não
  depois. `c.req.json()` é seguro de chamar mais de uma vez na mesma request
  (o Hono cacheia o corpo parseado), então o `zValidator` que roda em
  seguida, no mesmo handler, não recebe stream já consumido.
- **`POST /alunos/:alunoId/matriculas` valida existência do `professorId` e
  do `materiaId`, além do `materiaId` estar ativo.** Mesmo padrão de todas
  as PRs anteriores: `400` legível em vez de erro cru de FK. Adicionalmente,
  `alunoId` (vindo da URL, não do corpo) responde `404` se não existir — é o
  recurso pai do aninhamento, então tratei como "recurso não encontrado",
  não como erro de validação de campo.
- **"Matrícula ativa" para a checagem de duplicidade é `situacao === 'ATIVA'`**,
  mesma leitura já registrada no PR 05 para o escopo de alunos — uma
  matrícula `pausada` não bloqueia a criação de uma nova ativa na mesma
  matéria.

## Pontos para revisão

- O fluxo de troca (encerrar a antiga, depois criar a nova) não é
  transacional entre as duas chamadas — exatamente como a spec já avisa
  ("isso deixa uma janela real... se o segundo passo falhar, o aluno fica
  sem matrícula ativa daquela matéria"). Não implementei nenhuma
  mitigação (ex.: um endpoint único de "transferir" que fizesse as duas
  coisas numa transação) porque a spec explicitamente descreve isso como
  comportamento esperado da composição de duas chamadas já existentes, e
  não como algo a corrigir — só deixando registrado que a decisão de
  manter os dois passos separados foi da spec, não minha.
- Nenhuma validação de coerência entre `tipoAtendimento` e a idade do aluno
  (`ativo`, "regular" vs. "pre_escolar") — a spec não define essa regra,
  então os dois valores são aceitos livremente para qualquer aluno.
