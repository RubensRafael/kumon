# kumon

Full-stack TypeScript rodando inteiro na Edge da Cloudflare: SPA em **React + Vite**,
API em **Hono** no mesmo Worker e **PostgreSQL do Neon** acessado pelo **Prisma ORM**
via **Driver Adapters**.

## Stack

| Camada    | Tecnologia |
| --------- | ---------- |
| Front-end | React 19, Vite 8, React Router (navegacao 100% client-side), Tailwind CSS v4 |
| Back-end  | Hono 4 em Cloudflare Workers, `@hono/vite-dev-server` como dev server unificado |
| Banco     | Neon (PostgreSQL serverless) + Prisma 7 com `@prisma/adapter-neon` |
| Contrato  | DTOs em zod compartilhados + `@hono/zod-validator` na entrada da API |
| Deploy    | Wrangler (Worker + assets estaticos) |

## Estrutura de pastas

```
.
├── index.html                  # shell da SPA (entrada do Vite)
├── vite.config.ts              # React + Tailwind + dev server do Hono + validacao de env
├── wrangler.jsonc              # config do Worker (main, assets, keep_vars)
├── prisma.config.ts            # connection string do CLI (Prisma 7)
├── .env.example                # template das BACKEND_* e FRONTEND_*
├── prisma/
│   └── schema.prisma           # datasource postgresql (sem url, Prisma 7)
└── src/
    ├── server.tsx              # entrypoint do Worker (fronteira com o runtime)
    ├── server/                 # ── BACK-END ──────────────────────────────
    │   ├── app.ts              # montagem do app Hono
    │   ├── types.ts            # Bindings (c.env) e Variables (c.get)
    │   ├── db/
    │   │   ├── client.ts       # PrismaClient + adapter do Neon
    │   │   ├── prisma.middleware.ts
    │   │   └── generated/      # Prisma Client gerado (nao versionado)
    │   ├── lib/validator.ts    # zValidator com erro padronizado
    │   ├── middlewares/        # env, erro global e fallback da SPA
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
    └── shared/                 # ── FRONTEIRA ─────────────────────────────
        ├── api/contract.ts     # rotas + tipos de entrada/saida de cada uma
        ├── dto/                # schemas zod: health, user, error
        └── env.ts              # schemas zod das BACKEND_* e FRONTEND_*
```

O cliente nunca importa `src/server/` e o servidor nunca importa `src/client/`.
O unico ponto de contato e `src/shared/`. Cada lado tem seu proprio `tsconfig`
(`tsconfig.client.json` com libs de DOM, `tsconfig.server.json` com os tipos do
workerd), evitando o conflito classico entre `lib.dom` e os globais do Workers.

## Contrato tipado da API

`src/shared/api/contract.ts` declara, para cada rota, o que ela recebe e o que
devolve. Os tipos vem dos DTOs em zod de `src/shared/dto`, importados com
`import type` — o zod fica inteiramente fora do bundle do browser (verificado:
o bundle nao contem uma linha da biblioteca).

```ts
// servidor: a anotacao amarra a rota ao contrato
const body: ApiResponse<'listUsers'> = { data: users.map(toUserDto), count: users.length }
return c.json(body)

// cliente: metodo, path, query, corpo e retorno saem todos do contrato
const health = await callApi('health', {})            // HealthResponse
const list = await callApi('listUsers', { query: { limit: 10 } })
await callApi('createUser', { body: { email, name } }) // erra o body -> nao compila
```

O servidor nao exporta nenhum tipo para o cliente: a dependencia vai nos dois
sentidos apenas para `src/shared/`, e o front-end jamais carrega o grafo do
back-end (nem o Prisma Client gerado) no seu projeto de compilacao.

Os DTOs sao escritos a mao, nunca derivados dos modelos do Prisma: uma coluna
nova no banco nao vaza para a API sem alguem decidir por isso.

## Validacao de entrada

`src/server/lib/validator.ts` embrulha o `@hono/zod-validator` para que uma
falha de validacao responda no mesmo formato `ApiError` dos demais erros, com
os problemas campo a campo:

```json
{
  "error": "validation_error",
  "message": "Os dados enviados em \"json\" sao invalidos.",
  "issues": [{ "path": "email", "message": "e-mail invalido" }]
}
```

O cliente usa `error.issueFor('email')` para destacar o campo no formulario
(veja `/usuarios`).

## Variaveis de ambiente

O prefixo define quem enxerga a variavel:

| Prefixo | Onde vive | Chega ao bundle do browser? |
| --- | --- | --- |
| `BACKEND_*` | `c.env` no Worker, `process.env` no Prisma CLI | **Nao** |

| `FRONTEND_*` | `import.meta.env` no browser | Sim — nunca coloque segredo |

`envPrefix: ['FRONTEND_']` no `vite.config.ts` substitui o `VITE_` padrao, entao
uma `BACKEND_DATABASE_URL` no mesmo `.env` fica inacessivel ao codigo do
cliente mesmo por engano.

A validacao acontece em dois pontos, cobrindo dev e producao:

1. **Build e dev** — o plugin `validateEnv` do `vite.config.ts` roda no
   `configResolved` e derruba o processo listando o que falta. As `BACKEND_*`
   sao checadas apenas localmente; em producao elas vivem nos secrets da
   Cloudflare, fora do alcance do build.
2. **Runtime do Worker** — `envMiddleware` valida `c.env` no primeiro request de
   cada isolate e guarda o resultado em cache. Faltando variavel, a API responde
   500 dizendo qual, em vez de um erro obscuro do driver do banco.

O tipo sai do mesmo schema: `interface ImportMetaEnv extends FrontendEnv` em
`src/client/vite-env.d.ts` e `c.var.env: BackendEnv` no Hono. Nao ha uma segunda
lista de chaves para manter em dia.

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
cp .env.example .env
# preencha BACKEND_DATABASE_URL com a connection string do POOLER do Neon
npm run db:push             # cria as tabelas do schema no Neon
npm run dev                 # http://localhost:5173
```

A `BACKEND_DATABASE_URL` deve ser a string de **connection pooling** do Neon
(host com sufixo `-pooler`), disponivel em *Neon Console > Project > Connect*.

Nao existe `.dev.vars` neste projeto: quando ele esta ausente, o Wrangler carrega
o `.env` automaticamente, entao um unico arquivo serve ao Vite, ao Worker e ao
Prisma CLI.

### Scripts

| Script | O que faz |
| ------ | --------- |
| `npm run dev` | Vite + Hono no mesmo servidor, com HMR |
| `npm run build` | typecheck dos tres projetos + build do front em `dist/client` |
| `npm run preview` | build e depois `wrangler dev` (workerd de verdade) |
| `npm run deploy` | build e `wrangler deploy` |
| `npm run typecheck` | `tsc --build` nos projetos client/server/node |
| `npm run cf-typegen` | regenera `worker-configuration.d.ts` a partir do wrangler.jsonc |
| `npm run check` | typecheck + build + bundle do Worker, sem publicar |
| `npm run db:generate` | regenera o Prisma Client |
| `npm run db:push` | aplica o schema no banco sem criar migration |
| `npm run db:migrate` | cria e aplica uma migration |
| `npm run db:studio` | abre o Prisma Studio |

## Deploy

As variaveis de producao ficam no dashboard da Cloudflare, em
*Worker > Settings > Variables and Secrets > Add*. Ao adicionar, escolha o
**tipo**:

| Variavel | Tipo | Por que |
| --- | --- | --- |
| `BACKEND_DATABASE_URL` | **Secret** | a connection string do Neon carrega a senha do banco. Como `Text` ela fica legivel em texto claro no dashboard e via API/Wrangler para qualquer pessoa com acesso a conta |
| `BACKEND_ENVIRONMENT` | Text | e so `"production"`, nao ha o que proteger |

`Secret` e `Text` sao a mesma feature, na mesma tela — muda so o tipo
escolhido, e nao e preciso usar `wrangler secret put`. Nos dois casos o valor
chega igual em `c.env`; o codigo nao muda.

```bash
npm run deploy
```

`keep_vars: true` no `wrangler.jsonc` garante que o deploy nao apague as
variaveis de texto configuradas pelo dashboard (sem ele, o Wrangler trata o
arquivo de config como fonte da verdade e limpa o resto). Secrets nunca sao
apagados por um deploy, com ou sem a flag.

## Notas de implementacao

- **Um Prisma Client por requisicao.** Workers nao mantem estado confiavel entre
  invocacoes; o pooling real fica com o pooler do Neon.
- **`poolQueryViaFetch = true`.** Queries fora de transacao trafegam por HTTP em
  vez de abrir WebSocket — menos latencia no caminho quente. Transacoes
  interativas continuam usando WebSocket.
- **Prisma 7.** O datasource nao tem mais `url`: a connection string do CLI vive
  em `prisma.config.ts` (que le o `.env` via `dotenv`) e a de runtime chega
  exclusivamente pelo Driver Adapter. `driverAdapters` deixou de ser preview
  feature — e o unico modo de operacao, sem flag para ativar. O generator usa
  `runtime = "cloudflare"`, que gera o client para o runtime dos Workers.
- **Plugin `workerd-wasm-modules` no `vite.config.ts`.** O client gerado para a
  Cloudflare carrega o Query Compiler com `import('...wasm?module')`, sintaxe
  que o Wrangler entende mas o dev server do Vite (que roda em Node) nao. O
  plugin traduz esse import para um `WebAssembly.Module` equivalente.
- **Tamanho do Worker: ~1.4 MiB gzip**, contra o limite de 3 MiB do plano
  gratuito. O WASM do Prisma 7 e maior que o da linha 6 (3.4 MB contra 1.9 MB),
  entao vale acompanhar esse numero ao adicionar dependencias.

## Referencias

- [Cloudflare Workers — Hono framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)
- [Hono — Cloudflare Workers + Vite](https://hono.dev/docs/getting-started/cloudflare-workers-vite)
- [Prisma — Deploy to Cloudflare](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Hono — exemplo com Prisma](https://hono.dev/examples/prisma)
- [Neon — Cloudflare Workers](https://neon.com/docs/guides/cloudflare-workers)
- [Hono — validacao com zod](https://hono.dev/docs/guides/validation)
