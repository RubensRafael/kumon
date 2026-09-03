# kumon

Full-stack TypeScript rodando inteiro na Edge da Cloudflare: SPA em **React + Vite**,
API em **Hono** no mesmo Worker e **PostgreSQL do Neon** acessado pelo **Prisma ORM**
via **Driver Adapters**.

## Stack

| Camada    | Tecnologia |
| --------- | ---------- |
| Front-end | React 19, Vite 8, React Router (navegacao 100% client-side), Tailwind CSS v4 |
| Back-end  | Hono 4 em Cloudflare Workers, `@hono/vite-dev-server` como dev server unificado |
| Banco     | Neon (PostgreSQL serverless) + Prisma 6 com `driverAdapters` e `@prisma/adapter-neon` |
| Deploy    | Wrangler (Worker + assets estaticos) |

## Estrutura de pastas

```
.
├── index.html                  # shell da SPA (entrada do Vite)
├── vite.config.ts              # React + Tailwind + dev server do Hono
├── wrangler.jsonc              # config do Worker (main, assets, keep_vars)
├── prisma/
│   └── schema.prisma           # datasource postgresql + driverAdapters
└── src/
    ├── server.tsx              # entrypoint do Worker (fronteira com o runtime)
    ├── server/                 # ── BACK-END ──────────────────────────────
    │   ├── app.ts              # montagem do app Hono
    │   ├── types.ts            # Bindings (c.env) e Variables (c.get)
    │   ├── db/
    │   │   ├── client.ts       # PrismaClient + adapter do Neon
    │   │   ├── prisma.middleware.ts
    │   │   └── generated/      # Prisma Client gerado (nao versionado)
    │   ├── middlewares/        # erro global e fallback da SPA
    │   └── routes/             # /api/health, /api/users
    ├── client/                 # ── FRONT-END ─────────────────────────────
    │   ├── main.tsx            # bootstrap do React
    │   ├── App.tsx             # shell: layout + tabela de rotas
    │   ├── config/             # ── configuracao do cliente ──
    │   │   ├── api.ts          # cliente HTTP tipado
    │   │   ├── env.ts          # variaveis VITE_*
    │   │   ├── routes.tsx      # tabela de rotas da SPA
    │   │   └── styles/         # globals.css (Tailwind + tokens)
    │   └── app/                # ── produto: rotas e componentes ──
    │       ├── routes/         # paginas
    │       ├── components/     # layout/ e ui/
    │       ├── hooks/
    │       └── lib/
    └── shared/
        └── api.ts              # contrato de tipos usado pelos dois lados
```

O cliente nunca importa `src/server/` e o servidor nunca importa `src/client/`.
O unico ponto de contato e `src/shared/api.ts` — tipos puros, que somem no build.
Cada lado tem seu proprio `tsconfig` (`tsconfig.client.json` com libs de DOM,
`tsconfig.server.json` com os tipos do workerd), evitando o conflito classico
entre `lib.dom` e os globais do Workers.

## Como o roteamento funciona

**Desenvolvimento (`npm run dev`)** — o Vite e o unico servidor na porta 5173.
O `@hono/vite-dev-server` executa o Worker sob demanda, mas o `vite.config.ts`
exclui do Hono tudo que nao comeca com `/api/`. Assim o HMR, os modulos e os
assets continuam com o Vite, e so a API vai para o Hono.

**Producao (`npm run deploy`)** — `dist/client` sobe como assets estaticos da
Cloudflare. Um path com arquivo correspondente e servido direto pela CDN; como o
`wrangler.jsonc` usa `not_found_handling: "none"`, qualquer outro path cai no
Worker, onde o Hono responde `/api/*` ou devolve o `index.html` pelo binding
`ASSETS` para o React Router assumir.

## Como rodar

```bash
npm install                 # instala + gera Prisma Client e tipos do Worker
cp .dev.vars.example .dev.vars
# preencha DATABASE_URL com a connection string do POOLER do Neon
npm run db:push             # cria as tabelas do schema no Neon
npm run dev                 # http://localhost:5173
```

A `DATABASE_URL` deve ser a string de **connection pooling** do Neon (host com
sufixo `-pooler`), disponivel em *Neon Console > Project > Connect*.

### Scripts

| Script | O que faz |
| ------ | --------- |
| `npm run dev` | Vite + Hono no mesmo servidor, com HMR |
| `npm run build` | typecheck dos tres projetos + build do front em `dist/client` |
| `npm run preview` | build e depois `wrangler dev` (workerd de verdade) |
| `npm run deploy` | build e `wrangler deploy` |
| `npm run typecheck` | `tsc --build` nos projetos client/server/node |
| `npm run cf-typegen` | regenera `worker-configuration.d.ts` a partir do wrangler.jsonc |
| `npm run db:generate` | regenera o Prisma Client |
| `npm run db:push` | aplica o schema no banco sem criar migration |
| `npm run db:migrate` | cria e aplica uma migration |
| `npm run db:studio` | abre o Prisma Studio |

## Deploy

```bash
npx wrangler secret put DATABASE_URL   # ou defina no dashboard da Cloudflare
npm run deploy
```

`keep_vars: true` no `wrangler.jsonc` garante que um deploy nao apague as
variaveis configuradas pelo dashboard.

## Notas de implementacao

- **Um Prisma Client por requisicao.** Workers nao mantem estado confiavel entre
  invocacoes; o pooling real fica com o pooler do Neon.
- **`poolQueryViaFetch = true`.** Queries fora de transacao trafegam por HTTP em
  vez de abrir WebSocket — menos latencia no caminho quente. Transacoes
  interativas continuam usando WebSocket.
- **`engineType = "client"`.** O Prisma usa o Query Compiler em WASM, sem Query
  Engine nativo: o bundle final fica em ~900 KiB gzip, bem abaixo do limite do
  Worker.
- **Plugin `workerd-wasm-modules` no `vite.config.ts`.** O client gerado para
  workerd carrega o WASM com `import('...wasm?module')`, sintaxe que o Wrangler
  entende mas o dev server do Vite (que roda em Node) nao. O plugin traduz esse
  import para um `WebAssembly.Module` equivalente.
- **`previewFeatures = ["driverAdapters"]`** esta no schema conforme pedido. A
  partir do Prisma 6.6 a funcionalidade e GA e o CLI emite um aviso de
  *deprecated preview feature*; a linha pode ser removida sem efeito algum.

## Referencias

- [Cloudflare Workers — Hono framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)
- [Hono — Cloudflare Workers + Vite](https://hono.dev/docs/getting-started/cloudflare-workers-vite)
- [Prisma — Deploy to Cloudflare](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Hono — exemplo com Prisma](https://hono.dev/examples/prisma)
- [Neon — Cloudflare Workers](https://neon.com/docs/guides/cloudflare-workers)
