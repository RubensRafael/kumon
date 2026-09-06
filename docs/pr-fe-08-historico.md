# PR fe-08 — Histórico de acompanhamento

## O que foi implementado

- **Endpoint novo**: `GET /alunos/:alunoId/registros/historico?periodo=DIA|SEMANA|MES|TUDO`
  (`src/server/features/registros/historico.{dto,service,routes}.ts`,
  registrado em `plan.md` seção 9). Agregação sobre `RegistroAula`
  existente — **sem migration** — coberta por 4 testes e2e novos
  (`tests/e2e/historico.e2e.test.ts`, suíte total 120).
- `historico.dto.ts` já nasce em `shared/dto/` (não precisou de PR de
  "mover depois") + `obterHistoricoAluno` registrado em `contract.ts`.
- **`HistoricoSheet`** (`routes/acompanhamento/components/`): painel
  lateral com abas Dia/Semana/Mês/Tudo, cards de Previstas/Realizadas/
  Presença/Tarefas feitas, médias de Foco/Autonomia/Comportamento/
  Desempenho (escala 1–4) e a seção "Evolução" (delta contra o período
  anterior de mesmo tamanho).
- **"Ver acompanhamento"** (linha `CONCLUIDO` na lista diária da fe-07)
  agora abre este sheet de verdade, no lugar do `RegistrarAulaDialog`
  read-only que era o interino daquela PR.

## Decisões tomadas

- **Revisado antes de implementar**: nem tudo que
  `historico-acompanhamento-aluno.png` mostra é real. Ficaram de fora, de
  propósito: atraso em minutos (não existe no schema — `Chegada` é só o
  enum) e "Feedback semana"/"Gerar" (feature de IA, issue #17).
- **`previstas` conta ocorrências do dia da semana dentro da janela**, não
  o número cru de `MatriculaHorario` — pra `periodo=MES`/`TUDO` isso já
  multiplica certo (ex.: um horário semanal conta ~4x num mês), em vez de
  aparecer sempre "1 prevista" independente do período escolhido.
- **Escala 1–4 dos 4 indicadores** usa a ordem que os enums já têm no
  schema (`BAIXO/BAIXA/NECESSITOU_INTERVENCAO/PRECISOU_INTERVENCAO` = 1,
  ..., `EXCELENTE` = 4 em todos) — não precisou inventar mapeamento novo.
- **"Evolução" é `null` pra `periodo=TUDO`** (não existe "período anterior
  a tudo") e `null` pra qualquer indicador sem dado suficiente num dos
  dois lados (sem aula registrada ainda no período anterior, por
  exemplo) — em vez de mostrar zero, que sugeriria "não mudou".
- **Sem a lista "Registros concluídos do período"** que o print mostra
  embaixo dos cards — ficou de fora pra manter esta PR focada nos KPIs
  agregados (o pedido original); listar os registros individuais do
  período é uma extensão natural depois, se fizer falta.

## Correções de QA (PR #26) — rebase, não achado novo

Esta branch não foi alvo do QA manual da PR #26 (que cobre fe-01→fe-07);
o trabalho aqui foi reconciliar o rebase depois que a fe-07 removeu o
autosave (achado crítico daquela rodada). `registrar-aula-dialog.tsx`,
`registro-row.tsx` e `acompanhamento.page.tsx` foram todos tocados nos
dois lados (fe-07 removendo autosave, fe-08 trocando "Ver acompanhamento"
pelo `HistoricoSheet`) — a resolução manteve as duas coisas juntas:

- O dialog fica exatamente como a fe-08 já tinha decidido — **sem** o
  conceito de read-only (`isCompleto`/`eraCompletoAoAbrir` removidos de
  vez, não só nesta PR): ele nunca mais é aberto para uma linha
  `CONCLUIDO`. Mas por cima disso, o fluxo de escrita agora é o da fe-07
  — Fase 1 (Chegada, `POST` só na primeira vez) + Fase 2 (estado local,
  um único `PUT` no "Enviar") —, não mais o autosave campo a campo que a
  fe-08 original ainda tinha.
- `RegistroRow` ganhou `bloqueadoFuturo` (fe-07) mantendo
  `onRegistrarAula`/`onVerHistorico` (fe-08) — a escrita fica bloqueada
  numa data futura, e a leitura (`Ver acompanhamento` → `HistoricoSheet`)
  continua sempre liberada.
- `plan.md`: a lista de "Coisas pra fazer" ganhou os dois itens novos que
  a fe-01/fe-02 registraram (issues #27 e #28) lado a lado com o
  "`ApiContract` só tem health" já riscado que esta PR documentava.

Verificado em browser real (Playwright/Chromium) depois do rebase: fluxo
completo Chegada → preenchimento → Enviar (1 `POST` + 1 `PUT`, sem
chamada por campo) seguido de "Ver acompanhamento" abrindo o
`HistoricoSheet` com os KPIs agregados corretos — nenhum resquício do
dialog antigo reaparece.

## Pontos para revisão

- **Reabrir/corrigir um registro já concluído não tem mais nenhum
  caminho na UI.** Antes desta PR (fe-07), "Ver acompanhamento" abria o
  mesmo formulário em modo leitura — ainda dava pra ver as notas
  específicas daquele dia. Agora ele abre só a agregação. O backend nunca
  bloqueou editar um registro completo (`plan.md` seção 7), então se
  corrigir uma nota específica de um dia já fechado for um caso real, falta
  um entry point (ex.: um link "ver detalhes desse dia" dentro do próprio
  `HistoricoSheet`, ainda não construído). Registrado também em `plan.md`,
  "Coisas pra fazer".
- Verificado em browser real (Playwright/Chromium, `LOCAL_DEV_SERVER=true`)
  depois do rebase sobre a cadeia fe-01→fe-07 corrigida. `npm run
  typecheck`, `npm test` (125/125, 4 novos) e `npx vite build` passam
  limpos.

---

Com esta PR fecha a cadeia fe-01..fe-08 do `plan-frontend.md`.
