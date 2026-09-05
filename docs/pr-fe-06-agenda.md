# PR fe-06 — Agenda

## O que foi implementado

- **`PainelDadosOutput` estendido** (pequena mudança de backend bundlada
  aqui, como já previsto em `plan-frontend.md`): `professores[].corAgenda`,
  `alunos[].connect`, `matriculas[].estagio` — nenhum dos três exigia
  migration (colunas já existiam no schema, só não eram selecionadas em
  `obterDadosPainel`). São exatamente os três dados que faltavam pra
  Agenda colorir por professor de verdade e filtrar por Connect/Estágio.
- **`AgendaSlotOutput`/`derivarAgendaSlots` estendidos**:
  `alunoConnect`, `alunoZonaVermelha`, `professorCorAgenda`, `estagio`,
  `tipoAtendimento` — todos derivados do mesmo snapshot, só passaram a ser
  incluídos no slot porque agora tem consumidor. Testes unitários
  existentes (`tests/unit/agenda.dto.test.ts`) continuam passando sem
  alteração de asserção (usam `toMatchObject`).
- **Duas rotas**, igual às duas telas do print (não uma só com abas):
  - `/agenda-geral` (`AgendaGeralPage`) — colunas = professores (nome +
    matérias + contagem de alunos no dia), linhas = horário, abas de dia
    da semana no topo, busca por aluno/professor.
  - `/agenda` (`AgendaPage`) — seletor de professor (aceita
    `?professorId=` da querystring, usado pelo botão "Agenda" do card de
    Professor), paginação de semana, colunas = dias da semana, linhas =
    horário, filtros (Disciplina, Estágio, Connect, Zona Vermelha,
    Regular, Pré-escolar).
- **`ScheduleGrid`/`WeekdayTabs`/`gerarSlotsHorario`** (`components/common/`)
  — grade horário×coluna reaproveitada pelas duas telas, e o gerador dos
  rótulos de horário (grid de 30min entre `horarioInicial`/`horarioFinal`
  do(s) professor(es) relevante(s)).
- **`AlunoInspectorSheet`** (criado na fe-04, sem consumidor até agora)
  passa a ser usado de verdade: clicar num slot ocupado, em qualquer uma
  das duas telas, abre o painel lateral com os dados daquele aluno.
- Botão "Agenda" do card de Professor (fe-03) deixa de ser desabilitado —
  agora linka pra `/agenda?professorId=...`.

## Decisões tomadas

- **A paginação de semana em `/agenda` é só rótulo de data, não muda
  quais células aparecem ocupadas.** `MatriculaHorario` não tem campo de
  data — é um template semanal recorrente (`diaSemana` + `horario`), não
  uma instância de calendário. Navegar a semana troca as datas mostradas
  no cabeçalho de cada coluna (ex.: "Segunda 08/09" → "Segunda 15/09"),
  mas a grade em si reflete sempre a mesma programação recorrente. Não é
  um bug — é o que os dados realmente representam; um comportamento
  diferente exigiria o conceito de reposição/exceção pontual, que não
  existe no schema.
- **Toggles "Regular"/"Pré-escolar" são dois estados do mesmo campo**
  (`tipoAtendimento`), não filtros independentes de verdade: nenhum dos
  dois ativo = sem filtro; um ativo = filtra só aquele tipo; os dois
  ativos ao mesmo tempo equivale a nenhum (redundante, mas inofensivo) —
  mais simples que impedir a combinação na UI.
- **Botão "Novo aluno" da Agenda Geral só navega pra `/alunos`**, não abre
  um dialog de criação ali mesmo — evita duplicar toda a lógica de
  `AlunoFormDialog` numa tela que não é o lugar principal de cadastro.

## Pontos para revisão

- Mesma ressalva de verificação visual das PRs anteriores. `npm run
  typecheck`, `npm test` (109/109) e `npx vite build` passam limpos.
