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

## Pontos para revisão

- Mesma ressalva de verificação visual das PRs anteriores. `npm run
  typecheck`, `npm test` (109/109) e `npx vite build` passam limpos (o
  bundle cresce de ~720KB pra ~1.09MB com a entrada do `recharts` — ainda
  sem code-splitting, mesmo aviso de chunk grande que já aparecia antes,
  agora maior).
