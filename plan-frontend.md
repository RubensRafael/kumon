# Plano — Frontend (KFlow)

Derivado das telas do app original (organizadas em `01-agenda` a `05-painel`,
mais `api-spec-kflow.md` como referência de contrato) e do estado **atual**
do backend (`plan.md`, `src/server/`, `src/shared/dto/`) — não do
`api-spec-kflow.md` puro, que é um documento anterior a várias revisões já
feitas no backend (ex.: sem `duracaoAulaMin`, sem `status`/`fechado` em
registro, painel virou snapshot bruto). Onde os dois divergem, este plano
segue o backend real, e a divergência fica anotada em "Decisões desta
rodada" no final.

A pasta `06-schema-app-original-nao-e-ui` foi ignorada como referência
visual (é só nomenclatura de banco do app antigo), como o próprio README dos
prints já instrui.

## Convenções gerais

### Stack

- **shadcn/ui** sobre Tailwind v4 (já presente no projeto, config em CSS via
  `@theme`, sem `tailwind.config.js`). Estilo `new-york`. Paleta: ver seção
  dedicada abaixo — extraída por amostragem de pixel direto nos prints, não
  a paleta `brand-*`/slate que já existe em `globals.css`.
  Ícones: `lucide-react` (padrão do shadcn).
- **Sem TanStack Query.** Dois hooks genéricos e manuais,
  `useApiQuery`/`useApiMutation` (`app/hooks/`), envolvendo `callApi` do
  contrato — `data`/`error`/`loading` + `refetch`, sem cache nem
  invalidação automática. Depois de uma mutation bem-sucedida, a própria
  página chama `refetch()` da query correspondente à mão. Simples o
  suficiente pro tamanho do app; sem dependência nova.
- **react-hook-form + `@hookform/resolvers/zod`** para formulários — reusa
  direto o mesmo `z.object(...)` que o backend já valida (ver "Contrato"
  abaixo), em vez de duplicar regra de validação no client.
- **recharts** (o que o componente `chart` do shadcn embrulha) para os
  gráficos do painel.
- **sonner** para toast (autosave do registro de aula, confirmações).
- Dependências novas a adicionar na PR de setup: `clsx`, `tailwind-merge`,
  `class-variance-authority`, `lucide-react`, `tw-animate-css` (substituto
  compatível com Tailwind v4 do antigo `tailwindcss-animate`),
  `react-hook-form`, `@hookform/resolvers`, `recharts`, `sonner`, mais os
  `@radix-ui/react-*` que cada componente do shadcn for puxando.
- `cn()` (`src/client/app/lib/cn.ts`) troca de "join de string" pra
  `clsx` + `tailwind-merge` — é o que todo componente gerado pelo shadcn
  espera (resolve conflito de classe Tailwind, ex. `p-2` vs `p-4` no mesmo
  elemento), o `cn` atual não faz isso.
- O health-check (`useHealth`, `HomePage`, `AboutPage`, `Card`/
  `StatusBadge` de demo) é **jogado fora** inteiro na PR de setup — nem
  vira rota escondida, some.

### Paleta — extraída dos prints por amostragem de pixel

Os prints usam a paleta padrão do Tailwind quase sem alteração (as cores de
gráfico/badge batem quase exatas com `blue-600`, `emerald-500/600`,
`orange-500/600`, `rose-700`, `slate-100/500` etc.) — a única coisa
realmente customizada é o azul da sidebar/botões primários, que **não**
é nenhum azul padrão do Tailwind:

| Papel | Hex amostrado | Onde apareceu |
|---|---|---|
| `sidebar` (bg da sidebar, botões primários, avatar do usuário, ícone da logo) | `#1842b4` | fundo da sidebar inteira, "Novo aluno"/"Novo professor", "Salvar", "Registrar aula" |
| `sidebar-active` (item de nav ativo, fundo) | `#3a5ebf` | linha "Painel"/"Agenda" realçada na sidebar |
| `accent` (indicador do item ativo, faixa esquerda) | `#f5600a` (≈ `orange-600`) | barra fina à esquerda do item ativo na sidebar |
| `chart-blue` | `#2563eb` (`blue-600` exato) | fatia do donut, barra "Distribuição por professor", chip de matéria selecionado |
| `chart-green` | `#16a34a` (`green-600` exato) | fatia do donut (Português) |
| `chart-emerald` | `#10b981` (`emerald-500` exato) | barras "Aulas por dia da semana", ícone de "Connect" |
| `chart-orange` | `#f97316` (`orange-500` exato) | fatia do donut (Inglês), ponto de status "Ativo" |
| `destructive`/alerta | bg `#fff1f2` (`rose-50`), texto `#be123c` (`rose-700` exato) | alerta "zona vermelha", texto do alerta inteligente |
| `success` (badge "Concluído") | bg `#ecfdf5` (`emerald-50`) | chip de resumo "Concluídos" e badge do registro |
| `warning` (badge "Em andamento") | bg `#fffbeb` (`amber-50`) | chip de resumo "Em andamento" |
| `muted` (badge "Não iniciado") | bg `#f1f5f9` (`slate-100`) | chip "Não iniciados", badge padrão |

Decisão: em vez de recriar a escala `brand-*` inteira, `@theme` em
`globals.css` ganha só os 3 tokens que não existem no Tailwind padrão
(`--color-sidebar`, `--color-sidebar-active`, e a variável semântica
`--primary` do shadcn apontando pra `sidebar`) — todo o resto (`chart-*`,
`destructive`, `success`, `warning`, `muted`) usa as escalas padrão do
Tailwind (`blue`, `green`, `emerald`, `orange`, `rose`, `slate`, `amber`)
direto, sem reinventar. O mapeamento pros nomes de variável que o shadcn
usa internamente (`--primary`, `--accent`, `--sidebar-foreground` etc., do
bloco `sidebar` do shadcn) é feito na hora de rodar `shadcn add sidebar` na
PR de setup.

### Organização de componentes (regra pedida)

```
src/client/app/
  components/
    ui/                 # gerados pelo shadcn (`npx shadcn add ...`) — não é editado à mão além do que o CLI escreve
    common/              # reutilizável em 2+ páginas, construído EM CIMA do ui/ (AppShell, Sidebar, PageHeader, EnumBadge, WeekdayToggles, EmptyState, AlunoInspectorSheet, ConfirmDialog...)
  hooks/                 # hooks cross-page (useAuth, useApiQuery, useApiMutation)
  lib/                   # cn.ts
  routes/
    <feature>/
      <feature>.page.tsx
      components/        # só usado dentro dessa feature
      hooks/              # busca/derivação de dado só dessa feature (use-professores.ts etc.)
```

Regra: um componente só migra de `routes/<feature>/components/` pra
`components/common/` quando uma **segunda** página passa a precisar dele —
nunca antes, pra não criar abstração especulativa.

Componentes ficam magros: renderização + composição. Busca de dado vive em
hooks (`use-*.ts`); derivação/agregação pura vive em `shared/dto/*` (mesmo
padrão já usado por `calcularAgregacoesPainel`/`derivarAgendaSlots`/
`isCompleto`/`isFalta`) — nunca inline dentro de um componente grande.

### Contrato com o backend — rollout progressivo

`plan.md` (seção "Coisas pra fazer") deixou em aberto como dar tipagem real
ao client: mover cada `*.dto.ts` de `src/server/features/*/` pra
`src/shared/dto/`, ou importar só o tipo do server. Este plano resolve isso
a favor da primeira opção, **feature a feature, na mesma PR que constrói a
tela daquela feature** — não tudo de uma vez:

1. Zod não é server-only (roda no browser), então mover o arquivo inteiro
   não tem custo técnico.
2. É o que permite o formulário usar `zodResolver(ProfessorCreateInput)`
   direto, sem duplicar validação.
3. Cada PR de tela, então, também: (a) move o `*.dto.ts` da feature pra
   `shared/dto/`, (b) registra a(s) rota(s) em
   `src/shared/api/contract.ts` (`apiEndpoints` + `ApiContract`).

`src/shared/dto/painel.dto.ts` e `agenda.dto.ts` já vivem em `shared/` desde
a PR 10 do backend — só falta registrar `painel` em `contract.ts`.

### Autenticação + seed local

Sessão é cookie `httpOnly` (`kflow_token`, mesma origem, sem CORS) — nunca
há token em JS. O client mantém um `AuthContext` (usuário atual), populado
por `GET /me` no boot e pela resposta de `POST /auth/login`. Um
`RequireAuth` redireciona pra `/login` em qualquer `401`. Rotas públicas:
`/login`, `/esqueci-senha`, `/resetar-senha` — a UI e a lógica desse fluxo
completo **existem** mesmo com o seed abaixo (é o único caminho real de
"esqueci minha senha" em produção).

Para não depender do fluxo de reset em dev local, `prisma/seed.ts` cria um
usuário admin com senha já utilizável (fora do padrão "nasce com senha
inválida" que vale pra usuários criados via `POST /usuarios`) — só pro
seed, hasheada normalmente com `bcryptjs`, não um placeholder. Credenciais
de dev (documentadas no `readme.md`/`.env.example`, óbvias o bastante pra
nunca serem confundidas com produção): `admin@kflow.local` /
`senha123`. `npm run db:seed` roda o script; `postinstall`/`db:migrate`
continuam não disparando seed sozinhos, pra não repovoar sem querer um
banco não-local.

### Layout

Troca o `Navbar` (topo) atual por uma sidebar fixa à esquerda, igual às
telas: logo "KFlow" no topo, itens de navegação, avatar/menu do usuário +
sair embaixo; área de conteúdo com uma barra superior (data atual + busca +
avatar). `/` redireciona pra `/painel` (autenticado) ou `/login`
(não-autenticado).

A busca "Buscar aluno..." da barra superior fica só visual nesta rodada —
sem filtro, sem navegação, sem nenhum comportamento ligado (decisão
explícita: ignorar por enquanto).

"Reposições" (visto nos prints) não tem nenhum conceito correspondente no
backend e **fica de fora** — nem como item desabilitado. "Configurações",
diferente do que o plano anterior assumia, ganha tela própria (sem print de
referência, seguindo o mesmo padrão visual das outras) — ver PR fe-02.

---

## Ordem das PRs

Reordenado a pedido: **dados primeiro (professores/alunos), visões
derivadas depois (painel/agenda)** — painel e agenda são só leitura e
filtro sobre o que professores/alunos/matrículas já criaram, então
demonstrar essas telas com dado real exige que o cadastro já exista.
Acompanhamento continua por último — é a peça mais complexa e depende de
matrícula+horário já cadastrados.

| PR | Nome | Tela(s) de origem | Depende de |
|---|---|---|---|
| fe-01 | Setup + shell + auth + seed | (sem print) | — |
| fe-02 | Configurações — Matérias/Conteúdos | (sem print — UI própria) | fe-01 |
| fe-03 | Professores (+ aba Usuários em Configurações) | `03-professores/*` | fe-02 (precisa de matéria pra existir) |
| fe-04 | Alunos | `02-alunos/*` | fe-03 (matrícula referencia professor) |
| fe-05 | Painel | `05-painel/painel-da-unidade.png` | fe-04 |
| fe-06 | Agenda | `01-agenda/*` | fe-05 (reusa snapshot/agregação) |
| fe-07 | Acompanhamento | `04-acompanhamento/*` (exceto histórico agregado) | fe-04 |
| fe-08 | Histórico de acompanhamento | `historico-acompanhamento-aluno.png` (parcial, ver ressalvas) | fe-07 |

Branches: `feat/fe-01-setup` → `feat/fe-02-configuracoes` → ... (cadeia
linear, mesmo padrão stacked-PR do backend). Docs: `docs/pr-fe-0N-<nome>.md`.

---

## PR fe-01 — Setup: shadcn, shell, autenticação, seed

### O que entra

- `npx shadcn@latest init` (estilo `new-york`) + tokens da paleta acima +
  primitives iniciais: `button`, `input`, `label`, `card`, `badge`,
  `avatar`, `separator`, `dialog`, `sheet`, `dropdown-menu`, `select`,
  `tabs`, `table`, `form`, `sonner`, `tooltip`, `skeleton`, `sidebar`.
- `cn()` migrado pra `clsx` + `tailwind-merge`.
- `common/app-shell/` (sidebar + topbar via o bloco `sidebar` do shadcn),
  substitui `AppLayout`/`Navbar`.
- `useApiQuery`/`useApiMutation` (`app/hooks/`) — genéricos sobre
  `ApiEndpointName`, sem cache.
- `shared/dto/auth.dto.ts` (movido do server) + `auth` registrado em
  `contract.ts` (`login`, `logout`, `me`, `solicitarReset`, `resetarSenha`).
- `AuthProvider`/`useAuth`, `RequireAuth`.
- Páginas: `/login`, `/esqueci-senha`, `/resetar-senha?token=...` — sem
  referência visual nos prints, layout shadcn padrão.
- `prisma/seed.ts` + script `db:seed`, usuário admin de dev pronto pra uso.
- Remove `HomePage`/`AboutPage`/`use-health.ts`/`Card`/`StatusBadge` de
  demo por completo.

---

## PR fe-02 — Configurações (aba Matérias e Conteúdos)

Sem print de referência — tela nova, seguindo o mesmo padrão visual
(sidebar + cards) das demais. "Configurações" nasce aqui como uma página
com `Tabs` (shadcn) — extensível: esta PR entrega só a primeira aba, a
fe-03 adiciona a segunda (Usuários), e novas configurações futuras entram
como aba nova, sem reestruturar a página.

### O que entra

- `materias.dto.ts` movido pra `shared/dto/`; `materias`/`conteudos`
  (list, create, update — sem delete físico, é sempre `PUT { ativo }`)
  registrados em `contract.ts`.
- Página "Configurações" na sidebar, com `Tabs`: aba "Matérias e
  Conteúdos" — lista de matérias (nome + toggle ativo/inativo) com um
  painel/accordion por matéria expandindo os conteúdos dela (nome + toggle
  ativo/inativo), botão de criar matéria e criar conteúdo.
- `GET /materias` por padrão só ativas — a tela de Configurações usa
  `?incluirInativas=true` pra também listar e poder reativar.

---

## PR fe-03 — Professores

Fontes: `lista-professores.png`, `novo-professor-vazio.png`,
`editar-professor.png`.

### O que entra

- `professores.dto.ts` movido pra `shared/dto/`, `professores` (list, get,
  create, update) registrado em `contract.ts`.
- Lista (grid de cards: nome, matérias, alunos/cap.horário/dias, botão
  "Agenda" — desabilitado/sem link até a fe-06 existir —, editar).
- Dialog de criar/editar: Nome, Telefone, Email, Matérias (toggle group,
  lendo de `GET /materias` da fe-02), Dias disponíveis (toggle group),
  Horário inicial/final, Capacidade por horário, Cor da agenda (color
  picker) — **sem** o campo "Duração da aula (min)" do print (ver
  divergência abaixo).
- Quando o usuário logado é o próprio professor (`papel === 'PROFESSOR' &&
  professorId === id`), o dialog usa `ProfessorUpdateInputSelf` (só
  telefone/email/photoUrl/observações editáveis) — mesmo dialog, campos
  reduzidos, não uma tela separada (não há print de "meu perfil").
- **Aba "Usuários" em Configurações** (segunda aba da página criada na
  fe-02): `usuarios` (list, create, update — já em `shared/dto/auth.dto.ts`
  desde a fe-01) registrado em `contract.ts`. Lista de usuários (nome,
  email, papel, ativo/inativo) + dialog de criar (nome, email, papel,
  professor vinculado — obrigatório só se papel = PROFESSOR, picker lendo
  a lista de professores desta mesma PR) + toggle de ativar/desativar e
  trocar papel. Sem campo de senha em lugar nenhum (o backend nunca aceita
  isso por aqui — nasce com o placeholder inválido, primeiro acesso é
  sempre via reset).

### Divergência assumida

- `duracaoAulaMin` não existe mais no schema do professor — a duração da
  aula é derivada de `tipoAtendimento` por matrícula (50min REGULAR / 30min
  PRE_ESCOLAR), decisão já tomada e documentada no backend
  (`shared/dto/painel.dto.ts`). O campo do print é resquício de uma versão
  anterior da spec; a PR constrói sem ele.

---

## PR fe-04 — Alunos

Fontes: `lista-alunos.png`, `novo-aluno-dados-pessoais.png`,
`novo-aluno-matricula-e-programacao-semanal.png`, `editar-aluno.png`,
dropdowns de situação/tipo-atendimento.

### O que entra

- `alunos.dto.ts`, `matriculas.dto.ts`, `horarios.dto.ts` movidos pra
  `shared/dto/`; `alunos`, `matriculas`, `horarios` registrados em
  `contract.ts`.
- Lista (busca rápida + filtro por matéria + cards).
- Dialog de criar/editar aluno: Dados pessoais, Categorias (Zona Vermelha /
  Connect, toggles), Matrículas (grupo repetível e colapsável: Disciplina,
  Professor — lendo de `GET /professores` da fe-03 —, Estágio, Tipo de
  atendimento, Situação + tabela de Programação semanal com toggle por dia
  + input de horário) — **sem** o campo "Permanência (min)" como input
  próprio (ver divergência abaixo).
- Fluxo de criação é 3 chamadas encadeadas no client (`POST /alunos` →
  `POST /alunos/:id/matriculas` → `POST /matriculas/:id/horarios` por
  horário marcado) — o backend não tem endpoint combinado, de propósito
  (mesma lógica documentada em `plan.md` seção 5 pro fluxo de
  transferência: sem transação atômica entre as chamadas). A UI trata
  falha parcial de forma explícita (ex.: "aluno criado, mas a matrícula
  falhou — tente novamente"), reaproveitando a mesma recomendação que
  `plan.md` já registra pro caso de troca de matrícula.
- Cria o `AlunoInspectorSheet` (`components/common/`, shadcn `Sheet`) que a
  fe-06 (Agenda) vai reaproveitar — painel lateral de inspecionar/editar um
  aluno, aberto a partir da lista.

### Divergência assumida

- "Permanência (min)" (50 no print) não vira campo — some, e no lugar
  onde ficava, o próprio select de "Tipo de atendimento" ganha um texto
  auxiliar pequeno embaixo (ex.: "Duração: 50 min"), que troca sozinho pra
  "30 min" quando o tipo muda pra Pré-escolar — mesma razão da fe-03: não
  existe mais como campo próprio, é função de `tipoAtendimento`.

---

## PR fe-05 — Painel

Fonte: `painel-da-unidade.png`.

### O que entra

- `painel` registrado em `contract.ts` (`GET /painel` →
  `PainelDadosOutput`, já em `shared/dto/`).
- Extensão pequena de `calcularAgregacoesPainel`/`PainelAgregacoes`
  (`shared/dto/painel.dto.ts`) com `matriculasPorProfessor: { professorId,
  professorNome, total }[]` — dado 100% derivável do snapshot bruto já
  existente, só não tinha sido calculado ainda porque nada consumia.
- 4 cards de métrica (Alunos, Matrículas Ativas, Professores, Ocupação) +
  3 cards de gráfico (donut "Matrículas por matéria", barra "Distribuição
  por professor", barra "Aulas por dia da semana") + lista de alertas —
  cores conforme a tabela de paleta acima (`chart-blue`/`chart-green`/
  `chart-orange`/`chart-emerald`).

### Divergências assumidas nesta PR (decisão definitiva, não só desta rodada)

- Cards "Reposições" e "Faltas na semana" do print **saem de vez** —
  nenhum conceito de reposição/falta agregada entra no painel, nem agora
  nem depois; não é lacuna de dado, é decisão de produto.
- Mensagem de alerta usa o texto genérico que já existe
  (`"{nome} esta marcado como zona vermelha."`), não o
  `"Liz acumula 3 faltas"` do print (que dependeria do mesmo dado
  descartado acima).

---

## PR fe-06 — Agenda

Fontes: `agenda-geral-por-professor.png`, `agenda-individual-professor-semanal.png`.

### O que entra

- Duas visões, ambas em cima de `derivarAgendaSlots` (já em
  `shared/dto/agenda.dto.ts`) + do snapshot de `/painel`:
  - **Agenda Geral**: colunas = professores, linhas = horário, abas de dia
    da semana (Seg–Sáb) no topo.
  - **Agenda** (individual): seletor de professor + paginação de semana,
    colunas = dias da semana selecionada, linhas = horário, chips de filtro
    (Disciplina, Estágio, Connect, Zona Vermelha, Regular, Pré-escolar) —
    todos client-side sobre o mesmo snapshot.
- `common/`: `WeekdayTabs`, `ScheduleGrid` (grade horário×coluna
  reaproveitável pelas duas visões) — reusa o `AlunoInspectorSheet` criado
  na fe-04, agora totalmente funcional (leitura + edição).
- Liga o botão "Agenda" dos cards de Professor (fe-03) a
  `/agenda?professorId=...`.
- Cor por professor na grade: `PainelDadosOutput.professores` ganha o
  campo `corAgenda` nesta PR — pequena extensão de backend bundlada aqui
  (`shared/dto/painel.dto.ts` + o `select` em `painel.service.ts`), já que
  é a Agenda quem de fato consome essa cor (a Painel, na fe-05, não
  precisava dela). A grade usa a cor real escolhida no cadastro do
  professor, não um hash calculado.

---

## PR fe-07 — Acompanhamento

Fontes: `lista-diaria-por-horario.png`, `registrar-aula-passo1-chegada.png`,
`registrar-aula-passo2-formulario-completo.png`,
`registrar-aula-formulario-zoom.png`, `toast-salvo-automaticamente.png`.
**Não inclui** `historico-acompanhamento-aluno.png` (ver abaixo).

### O que entra

- `registros.dto.ts` movido pra `shared/dto/`; `registros` (list por data,
  get, create, update) registrado em `contract.ts`.
- Lista diária: paginação de data, chips de resumo, busca + filtro por
  professor/horário, uma linha por `MatriculaHorario` ativo do dia
  (`RegistroResumoOutput`), botão "Registrar aula" (ou "Ver
  acompanhamento" quando `isCompleto`).
- Estados exibidos: os 4 do print, todos derivados do preenchimento dos
  campos — sem mudança de backend, estendendo o mesmo raciocínio de
  `isFalta`/`isCompleto` (`shared/dto/registro.dto.ts`) com uma nova função
  pura ao lado delas (`contarNotasPreenchidas`, conta quantas das 6 notas
  — `boletim`/`atividadeCasa`/`foco`/`autonomia`/`comportamento`/
  `desempenho` — estão preenchidas):
  - **Não iniciado**: `id === VIRTUAL_REGISTRO_ID` (linha nem existe).
  - **Pendente**: linha existe (`chegada` já foi marcada), mas nenhuma das
    6 notas foi preenchida ainda (`contarNotasPreenchidas === 0` e
    `!isFalta`).
  - **Em andamento**: linha existe, pelo menos 1 mas não todas as 6 notas
    preenchidas (`!isCompleto`, `contarNotasPreenchidas > 0`).
  - **Concluído**: `isCompleto` (todas as 6, ou `isFalta`).
  A mesma `contarNotasPreenchidas` alimenta a barra de progresso do dialog
  de registrar aula (`contarNotasPreenchidas / 6`), no lugar de um cálculo
  solto dentro do componente.
- "Registrar aula": **um único dialog**, não duas telas — divulgação
  progressiva controlada por `chegada`: só o card "Chegada" aparece
  primeiro; escolher "Faltou" encerra ali (== completo, por definição de
  `isFalta`); escolher "Presente"/"Atrasado" revela Boletim → Atividade de
  casa → Comportamento (Foco/Autonomia/Comportamento) → Desempenho →
  Conteúdos trabalhados (chips vindos de `materias[materiaId].conteudos`)
  → "+ Adicionar observação" (textarea sob demanda) → barra de progresso
  (campos preenchidos / 6) → "Finalizar aula".
- Cada clique salva sozinho (`POST` na primeira mudança, `PUT` depois) e
  mostra o toast "Acompanhamento salvo automaticamente" (`sonner`).
- "Finalizar aula" **não chama endpoint nenhum** — só garante que a última
  mudança já foi salva e fecha o dialog; reabrir um registro com
  `isCompleto` mostra o formulário read-only (regra de UI, não de
  backend — já documentada em `plan.md` seção 7).

### Fora de escopo desta PR

"Histórico de acompanhamento" (o botão "Ver acompanhamento" abrindo
estatísticas agregadas por aluno) tem PR própria — ver fe-08 — porque
precisa de um endpoint novo (agregação), não porque precisa de schema
novo: revisado nesta rodada, não vai ter campo de atraso em minutos nem
feature de IA aqui (issue #17 continua separada). Ainda assim é grande o
bastante (endpoint novo + tela nova) pra não empilhar na mesma PR da lista
diária/registrar aula.

---

## PR fe-08 — Histórico de acompanhamento

Fonte: `historico-acompanhamento-aluno.png` — usado como inspiração de
layout, **não como especificação literal**: revisado nesta rodada, nem
todo número que o print mostra corresponde a um dado real que o backend
tem hoje, e a decisão foi construir só o que é genuinamente computável, em
vez de inventar valor pra preencher card.

### O que entra

- Endpoint novo (`GET /alunos/:id/registros/historico?periodo=dia|semana|mes|tudo`
  ou equivalente — nome exato a decidir na implementação), agregando
  `RegistroAula` existentes pro aluno num intervalo de data. **Sem
  migration** — nada aqui precisa de coluna nova, só leitura/agregação do
  que já existe.
- Estatísticas incluídas: Previstas (quantos `MatriculaHorario` ativos do
  aluno caíram no período), Realizadas (quantos têm registro com
  `chegada` preenchida), Presença % (`chegada !== 'FALTOU'` sobre
  realizadas), médias de Foco/Autonomia/Comportamento/Desempenho (mapeando
  cada enum pra uma escala numérica 1–4, mesma ideia do "3.0"/"4.0" do
  print), Tarefas feitas % (`atividadeCasa === 'FEZ'` sobre realizadas), e
  uma "Evolução" simples comparando as médias do período atual com as do
  período anterior de mesmo tamanho.
- **Não incluído, de propósito**: atrasos/média de atraso em minutos (dado
  que não existe — `Chegada` é só o enum, sem valor numérico, e não vai
  ganhar campo novo pra isso); "Feedback semana"/"Gerar" (feature de IA da
  issue #17, fora do escopo deste plano).
- Tela: sheet/dialog aberto a partir de "Ver acompanhamento" na lista da
  fe-07, com abas Dia/Semana/Mês/Tudo (o mesmo endpoint parametrizado por
  período atende as 4).

---

## Decisões desta rodada

Pontos que estavam em aberto na revisão anterior deste plano e já foram
resolvidos nesta conversa (mantidos aqui só como registro, não como
pergunta):

- Tudo relacionado a **faltas agregadas ou reposições** (cards do painel,
  alerta de faltas, conceito de reposição) sai do escopo — não é lacuna de
  dado a resolver depois, é decisão definitiva.
- Campo "Duração da aula (min)" do Professor e "Permanência (min)" do
  Aluno/matrícula: confirmados removidos — o segundo vira texto auxiliar
  embaixo do select de "Tipo de atendimento", não um campo à parte.
- "Histórico de acompanhamento" ganhou PR própria (fe-08) — não precisa de
  schema novo (sem atraso em minutos), mas precisa de endpoint novo;
  "Feedback semana" (IA) continua de fora, é a issue #17.
- Estados "Pendente"/"Em andamento"/progresso da lista diária: derivados
  100% client-side a partir de quantas notas estão preenchidas — sem
  mudança de backend (ver fe-07).
- Busca "Buscar aluno..." no topo: fica só visual por enquanto.
- Ícone "+" na Agenda individual: confirmado — abre criação de
  aluno/matrícula com dia+horário pré-preenchidos.
- `corAgenda`: `PainelDadosOutput` é estendido pra incluir o campo real
  (pequena mudança de backend bundlada na fe-06), no lugar de gerar cor por
  hash.
- Configurações ganha estrutura de abas — Matérias/Conteúdos (fe-02) e
  Usuários (fe-03), com espaço pra novas abas depois sem reestruturar a
  página.
- Credenciais do seed de dev: `admin@kflow.local` / `senha123`.
