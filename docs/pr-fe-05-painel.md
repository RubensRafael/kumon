# PR fe-05 — Painel

## O que foi implementado

- `obterPainel` (`GET /painel` → `PainelDadosOutput`, já em `shared/dto/`
  desde a PR 10 do backend) registrado em `contract.ts`.
- `calcularAgregacoesPainel`/`PainelAgregacoes`
  (`shared/dto/painel.dto.ts`) ganham `matriculasPorProfessor`
  (`{ professorId, professorNome, total }[]`) — mesmo padrão de
  `matriculasPorMateria`, só que agrupando por professor em vez de
  matéria. 100% derivável do snapshot que já existia; os testes unitários
  existentes (`tests/unit/painel.dto.test.ts`) continuam passando sem
  alteração, porque checam propriedades específicas, não o objeto inteiro.
- **`/painel`** vira a landing de verdade — `/` agora só redireciona pra
  lá (`InicioPage`, a landing temporária da fe-01, foi removida). 4 cards
  de métrica (Alunos, Matrículas Ativas, Professores, Ocupação) + 3
  gráficos (`recharts`, via o wrapper `chart` do shadcn: donut de
  matrículas por matéria, barra de distribuição por professor, barra de
  aulas por dia da semana) + lista de alertas.
- Cores dos gráficos usam os tokens `--chart-1`..`--chart-5` já definidos
  em `globals.css` desde a fe-01 (paleta amostrada dos prints).

## Decisões tomadas

- Cards "Reposições" e "Faltas na semana" do print, e a mensagem de alerta
  baseada em contagem de faltas, continuam de fora — decisão definitiva
  já tomada antes de começar a implementação (ver `plan-frontend.md`,
  "Decisões desta rodada"), não uma omissão desta PR especificamente.

## Correções de QA (PR #26)

`docs/qa-fe-05-painel.md` confirmou que os números batem (ocupação
conferida à mão contra o banco) e encontrou 5 achados de leitura, todos
corrigidos:

- **Donut sem legenda nem rótulo — corrigido.** `<ChartLegend
  content={<ChartLegendContent nameKey="name" />} />` dentro do
  `<PieChart>`, mesmo wrapper que os outros dois gráficos já usam.
- **Alerta com português quebrado — corrigido.** "Fernanda Dias esta
  marcado como zona vermelha." virou "Fernanda Dias está na zona
  vermelha." — formulação neutra, sem depender de concordância de gênero.
- **Subtítulo "disciplinas ativas" não batia com a métrica — corrigido.**
  "Matrículas Ativas" agora diz "matrículas em curso".
- **Coluna de domingo sem uso no gráfico "Aulas por dia da semana" —
  corrigida.** `DIAS_BANCO` (`painel.dto.ts`) não inclui mais `'DOM'` — o
  cadastro de professor (fe-03) só oferece Seg–Sáb, então a coluna nunca
  teria valor. `aulasPorDiaSemana.length` passa de 7 pra 6 (teste unitário
  atualizado).
- **Eixo Y com ticks fracionários — corrigido.** `allowDecimals={false}`
  no `<YAxis>` dos dois gráficos de barra.

## Pontos para revisão

- Visualmente verificado em browser real (Playwright/Chromium,
  `LOCAL_DEV_SERVER=true`), com 2 professores/2 matérias/2 alunos (um em
  zona vermelha): legenda do donut, mensagem do alerta, subtítulo do card,
  eixo Seg–Sáb e ticks inteiros — todos conforme o esperado. `npm run
  typecheck`, `npm test` (114/114) e `npx vite build` passam limpos (o
  bundle cresce de ~720KB pra ~1.10MB com a entrada do `recharts` — ainda
  sem code-splitting, mesmo aviso de chunk grande que já aparecia antes,
  agora maior).
