# PR fe-01 — Setup: shadcn, shell, autenticação, seed

## O que foi implementado

Seção "PR fe-01" do `plan-frontend.md`, completa:

- **shadcn/ui** inicializado (estilo `new-york`) via `components.json` +
  `npx shadcn add`: `button`, `input`, `label`, `card`, `badge` (via
  `status-badge` removido, ver abaixo), `avatar`, `separator`, `dialog`,
  `sheet`, `dropdown-menu`, `select`, `tabs`, `table`, `form`, `sonner`,
  `tooltip`, `skeleton`, `sidebar`, mais `switch`/`textarea`/`toggle`/
  `toggle-group` (adiantados — vão ser usados já na fe-02/fe-03/fe-04).
- **Paleta** (`globals.css`) com os tokens exatos amostrados no
  `plan-frontend.md`: `--primary`/`--sidebar` = `#1842b4`, `--sidebar-accent`
  = `#3a5ebf`, `--chart-1..5` mapeando blue-600/green-600/orange-500/
  emerald-500/orange-600, `--destructive` = `#be123c` (rose-700). O resto
  (`--background`, `--muted`, `--accent` genérico, `--border` etc.) usa
  neutros padrão (branco/slate) — ver "Decisões tomadas".
- **`common/app-shell.tsx`**: sidebar fixa (logo, menu vindo de
  `navItems`, avatar+"Sair" no rodapé) + barra superior (data atual, busca
  só-visual, avatar) — substitui `AppLayout`/`Navbar` antigos.
- **`useAuth`/`AuthProvider`/`RequireAuth`/`RequireGuest`**
  (`app/hooks/use-auth.tsx`, `app/components/common/require-auth.tsx`):
  sessão via cookie `httpOnly` (nada de token em JS), `GET /me` no boot,
  evento `window` `kflow:unauthorized` disparado por `callApi` em qualquer
  `401` (não só `/me`) pra zerar a sessão e mandar pro login de qualquer
  tela.
- **`useApiQuery`/`useApiMutation`** (`app/hooks/`): genéricos e manuais
  sobre `callApi`, sem cache — conforme pedido explicitamente (nada de
  TanStack Query).
- **`shared/dto/auth.dto.ts`** (movido de `server/features/auth/`) +
  `login`/`logout`/`me`/`solicitarReset`/`resetarSenha` registrados em
  `shared/api/contract.ts`.
- Páginas `/login`, `/esqueci-senha`, `/resetar-senha` (`app/routes/auth/`)
  — sem print de referência, formulários shadcn padrão com
  `react-hook-form` + `zodResolver` reusando os schemas movidos acima.
- **`prisma/seed.ts`** + `npm run db:seed`: cria `admin@kflow.local` /
  `senha123` (senha já utilizável, ao contrário do placeholder que
  `POST /usuarios` grava) — idempotente, não recria se já existir.
- Removido por completo: `HomePage`, `AboutPage`, `useHealth`, o
  `Card`/`StatusBadge` de demonstração antigos, `Navbar`, `AppLayout`. `/`
  agora mostra `InicioPage` (placeholder temporário — a fe-05 substitui
  pelo Painel de verdade).

## Decisões tomadas

- **shadcn CLI precisou de dois ajustes que não existiam no projeto**: (1)
  um `components.json` próprio, com os aliases apontando pra
  `@client/app/components/*` etc.; (2) `paths`/`baseUrl` adicionados
  também no `tsconfig.json` da raiz (o solution-file com `"files": []` e só
  `references`) — o CLI resolve aliases lendo esse arquivo direto, sem
  seguir `extends`/`references` pros tsconfigs de projeto. Isso não afeta o
  build de verdade (`tsc --build`): o arquivo raiz continua sem `files`,
  só ganhou `compilerOptions.paths` que nenhum projeto real usa dali.
- **`cn()` deixou de ser hand-rolled.** O shadcn (nesta versão do CLI, mais
  recente que a documentada no `plan-frontend.md`) gera componentes
  importando de um pacote npm oficial chamado `cn` (drop-in de
  clsx+tailwind-merge, mantido pelo próprio shadcn-ui), não de
  clsx+tailwind-merge combinados à mão. Segui o que o CLI gerou: `lib/cn.ts`
  antigo foi apagado, e todo componente novo importa `cn` do pacote — mais
  simples do que reintroduzir uma segunda implementação equivalente.
- **Não sobrescrevi `--accent` com o laranja da sidebar.** O
  `plan-frontend.md` cogitava isso, mas `--accent`/`--accent-foreground` do
  shadcn são usados globalmente (hover de botão `ghost`, item de dropdown
  etc.) — se virasse laranja, todo hover do app ficaria laranja, não só o
  indicador do item ativo da sidebar (que é só isso nos prints: uma faixa
  fina de ~4px). Implementado como um `<span>` absolutamente posicionado
  dentro do `SidebarMenuItem` ativo (`bg-orange-600`), não como token
  global.
- **`next-themes` entrou como dependência transitiva do `sonner.tsx`
  gerado.** `useTheme()` sem nenhum `ThemeProvider` no app simplesmente
  retorna `theme: undefined` (cai no default `"system"` do próprio hook) —
  sem erro, sem necessidade de configurar nada, já que o app não tem toggle
  de tema. Mantido como o CLI gerou.
- **Convenção de import nova para código novo do front**: arquivos criados
  a partir desta PR usam `@client/*`/`@shared/*` (os aliases já existiam
  em `vite.config.ts`/`tsconfig.base.json`, só não eram usados). Arquivos
  já existentes (`api.ts`, `contract.ts` etc.) não foram reescritos — só o
  necessário pra mover `auth.dto.ts` foi tocado ali.
- **Seed via `pg` cru, não o Prisma Client gerado.** O client gerado
  (`runtime = "cloudflare"`) carrega o Query Compiler via
  `import(...wasm?module)`, uma sintaxe que só o plugin
  `workerdWasmModules` (registrado em `vite.config.ts`/`vitest.config.ts`)
  sabe resolver — um script standalone rodado com `tsx` não passa por esse
  pipeline (tentei `vite-node` antes, que resolve o WASM mas encerra o
  processo antes da promise assíncrona terminar — "the server is being
  restarted"; não valia a pena arrastar essa complexidade toda pra um único
  `INSERT`). `prisma/seed.ts` usa `pg.Client` direto, com o `id`/
  `atualizadoEm` gerados à mão (a tabela não tem default de banco pra
  nenhum dos dois — o Prisma Client normalmente gera isso client-side).
- **`tsx` adicionado como devDependency** só pra rodar o seed
  (`npm run db:seed`).

## Correções de QA (PR #26)

QA manual em browser real da cadeia fe-01→fe-07 (`docs/qa-fe-01-setup.md`,
PR [#26](https://github.com/RubensRafael/kumon/pull/26)) encontrou 6
achados nesta branch, todos corrigidos:

- **`npm run dev` sem Postgres local acessível — fechado.** Causa raiz
  confirmada exatamente como a ressalva abaixo já previa. Correção: env
  `LOCAL_DEV_SERVER` (`.env`, default `"false"`) lida via `loadEnv` no topo
  do `vite.config.ts`; com `"true"`, o `devServer()` do Hono sobe sem
  `cloudflareAdapter` (Node puro) e com `env: loadEnv(...)` substituindo os
  bindings do workerd — `isCloudflareWorkers()` passa a retornar `false`
  naturalmente, o Prisma usa `PrismaPg`, e `GET /api/health` responde
  `connected: true` contra o Postgres do `docker-compose.yml`. Verificado
  em browser de verdade (Playwright/Chromium) com esta flag ligada: login,
  sessão, sidebar e as duas telas abaixo.
- **Dois `<main>` aninhados — corrigido.** `SidebarInset` (`ui/sidebar.tsx`)
  ganhou suporte a `asChild` (mesmo padrão `Slot.Root` já usado por
  `SidebarMenuButton` etc.); `AppShell` passa a usar
  `<SidebarInset asChild><div>...</div></SidebarInset>`, com um único
  `<main>` (o do conteúdo da página) no documento.
- **Copy do 404 vazava implementação — corrigido.** `NotFoundPage` não
  menciona mais Worker/index.html/React Router; mensagem final: "Página não
  encontrada" / "O endereço acessado não existe ou foi movido.".
- **Busca decorativa do topo — removida.** O `<Input>` sem `onChange` saiu
  do `AppShell`; issue aberta pra a busca de verdade:
  [#27](https://github.com/RubensRafael/kumon/issues/27).
- **Data do cabeçalho capitalizando errado — corrigido.** Trocado o
  `capitalize` do CSS (maiusculizava toda palavra, inclusive "De") por
  sentence-case aplicado só à primeira letra da string já formatada por
  `Intl.DateTimeFormat('pt-BR', ...)` — "Sábado, 05 de setembro".
- **"E-mail ou senha invalidos." sem acento — corrigido** em
  `auth.service.ts` (`CREDENCIAIS_INVALIDAS`).

A mesma rodada também trouxe, cedo na pilha por decisão do QA (item que
`fe-03`/`fe-04` já precisam consumir adiante — ver
`docs/prompt-implementacao-qa.md`):

- **`useApiMutation` passou a disparar `toast.error` automaticamente** em
  qualquer falha de mutação (mensagem do backend, ou um fallback genérico),
  com um `{ silent: true }` opcional pra quem já mostra o erro inline.
  Nenhum dos 12 componentes que usam o hook precisa mais lembrar de tratar
  `error`/`try-catch` sozinho.
- **Mensagens de validação do Zod em pt-BR**, globalmente: `zod/locales`
  já traz `ptBR` pronto — `z.config(ptBR())` roda como import de efeito
  colateral (`shared/zod-locale.ts`) no topo de `client/main.tsx` e
  `server/app.ts` (este último também cobre os testes e2e, que importam
  `createApp` direto).
- **`useAuth()` ganhou `isAdmin`/`podeEditarProfessor(professorId)`** —
  telas consultam isso em vez de checar `usuario?.papel` na unha pra
  esconder/desabilitar ações que o backend recusaria.
- **Novo `PainelSnapshotProvider`/`usePainelSnapshot()`**
  (`app/hooks/use-painel-snapshot.tsx`), montado dentro de `RequireAuth` em
  `App.tsx`: busca `GET /painel` uma única vez por sessão de navegação e
  expõe `{ dados, loading, error, refetch }` pra qualquer tela cruzar
  professor/aluno/matéria/matrícula sem duplicar a busca. Precisou
  registrar `obterPainel` em `shared/api/contract.ts` já nesta PR (o
  endpoint em si já existe no backend desde a PR 10) — antes do previsto
  originalmente (fe-05), porque é exatamente o dado que falta pras
  validações cruzadas da fe-04 (ver `docs/qa-fe-04-alunos.md`).

## Pontos para revisão

- **Sidebar sem nenhum item de navegação ainda.** `navItems` está vazio
  nesta PR (só a landing temporária em `/`, sem `label`) — cada PR
  seguinte acrescenta o seu. Visualmente a sidebar aparece só com
  logo/avatar/sair até a fe-02.
