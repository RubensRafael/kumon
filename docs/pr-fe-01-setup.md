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

## Pontos para revisão

- **Não consegui verificar o login visualmente num browser real.** `npm
  run dev` nesta sessão roda o Hono dentro de um `workerd` de verdade (via
  o adapter `@hono/vite-dev-server/cloudflare`, que usa Miniflare) — e
  `navigator.userAgent` ali já é `"Cloudflare-Workers"`, o mesmo sinal que
  `isCloudflareWorkers()` (`src/server/db/client.ts`) usa pra escolher o
  Driver Adapter do Neon em vez do `pg`. Resultado: mesmo com
  `BACKEND_DATABASE_URL` apontando pro Postgres local (`.env` já vem assim
  por padrão), a API tenta falar com o Neon e cai com
  `TypeError: fetch failed`. Confirmei que isso **não é causado por esta
  PR** — `GET /api/health` (endpoint que não toquei, existe desde a PR 1)
  falha exatamente da mesma forma no `npm run dev` desta sessão. A suíte
  `npm test` (Vitest, Node puro, adapter `pg`) continua passando 109/109,
  incluindo o e2e de auth — então a lógica de login/logout no backend está
  coberta. O que fica sem verificação visual é só a tela React em si
  (formulário, redirecionamento, sidebar renderizando). `npm run typecheck`
  e `npx vite build` passam limpos.
- **Sidebar sem nenhum item de navegação ainda.** `navItems` está vazio
  nesta PR (só a landing temporária em `/`, sem `label`) — cada PR
  seguinte acrescenta o seu. Visualmente a sidebar aparece só com
  logo/avatar/sair até a fe-02.
- **Busca "Buscar aluno..."** no topo é só visual (input não-controlado,
  sem `onChange`) — decisão explícita, ver `plan-frontend.md`.
