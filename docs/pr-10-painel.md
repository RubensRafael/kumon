# PR 10 — Painel

Última PR da cadeia. Fecha a implementação completa do `plan.md`.

## O que foi implementado

Seção 9 da spec, completa:

- `src/server/features/painel/{painel.dto,painel.service,painel.routes}.ts`:
  o único endpoint (`GET /painel`).
- Todas as agregações (`totalAlunosAtivos`, `totalMatriculasAtivas`,
  `matriculasPorMateria`, `aulasPorDiaSemana`) escopadas por
  `escopoProfessorId`, reaproveitando exatamente as mesmas condições de
  filtro já usadas em `alunos`/`matriculas`/`agenda` (matrícula ativa do
  professor).
- `aulasPorDiaSemana` sempre traz os 7 dias, mesmo com `total: 0` — mais
  útil para popular um gráfico de barras do que omitir dias sem aula.
- 5 testes e2e em `tests/e2e/painel.e2e.test.ts`.

## Decisões tomadas

Esta seção da spec deixou mais em aberto do que qualquer outra — ela
literalmente pergunta, no meio do texto, "vale decidir se `totalProfessores`
faz sentido nessa visão" e não define nenhuma fórmula pra `ocupacaoPercentual`
nem nenhuma regra pra `alertas`. As três decisões abaixo são minhas,
documentadas aqui para revisão deliberada.

- **`totalProfessores` é sempre da unidade inteira, mesmo na visão do
  professor.** A spec pergunta explicitamente se deveria ser escopado ou
  omitido. Decidi manter o total real, sem escopo, pelo mesmo motivo que
  `GET /professores` (PR 03) já não é escopado: é "diretório de equipe,
  visível pra qualquer papel autenticado" — se um professor já enxerga a
  lista completa de professores (nomes, contato, matérias) por outro
  endpoint, não faz sentido esconder só a *contagem* no painel.
- **`ocupacaoPercentual` — fórmula inventada, documentada aqui por não ter
  nenhuma definição na spec.** Calculada como
  `(horários ativos no escopo) / (capacidade teórica no escopo) × 100`,
  onde a capacidade teórica de cada professor é
  `dias disponíveis × slots de duracaoAulaMin entre horarioInicial e
  horarioFinal × capacidadePorHorario`. É uma aproximação razoável a partir
  dos únicos campos que o schema realmente tem para isso — mas é uma
  invenção, não uma leitura da spec. Bem provável que o time queira ajustar
  o que "ocupação" significa de verdade antes de confiar nesse número em
  produção.
- **`alertas` implementa só um tipo: aluno ativo com `zonaVermelha: true`.**
  A spec não define nenhuma regra de alerta — só a forma
  (`{ tipo, alunoId?, mensagem }`). `Aluno.zonaVermelha` existe no schema
  desde o PR 01 e, em toda a spec, só é usado como campo de saída em
  `AlunoOutput` — nunca aparece em nenhuma regra de negócio própria. Virar
  o único alerta implementado é a conexão mais direta que dá pra fazer sem
  inventar uma regra nova do zero. Não implementei outros alertas
  hipotéticos (ex.: "matrícula pausada há muito tempo", "aluno sem
  matrícula ativa") porque nada na spec sustenta essas regras — ficaria
  inventando escopo de produto, não preenchendo uma lacuna.

## Pontos para revisão

- As três decisões acima (`totalProfessores`, `ocupacaoPercentual`,
  `alertas`) são as que mais precisam de validação com o time antes de ir
  pra produção — nenhuma delas tem uma resposta "certa" extraível da spec,
  só a leitura mais razoável que consegui justificar.
- `ocupacaoPercentual` é arredondado pra uma casa decimal
  (`Math.round(x * 1000) / 10`). Se a capacidade teórica de todo o escopo
  for `0` (nenhum professor com horário configurado), o valor cai pra `0`
  em vez de `NaN`/erro — coberto por teste.

---

## Cadeia completa

Com esta PR, as 10 branches (`feat/01-prisma-setup` até `feat/10-painel`)
implementam o `plan.md` inteiro, seção por seção, cada uma com seus próprios
testes e2e (96 no total) rodando contra um Postgres real via
`docker-compose.yml`. Decisões de arquitetura (stack Cloudflare Workers +
Neon mantida, ver `docs/pr-01-prisma-setup.md`) e toda ambiguidade resolvida
ao longo do caminho estão documentadas PR a PR, para revisão antes de cada
merge.
