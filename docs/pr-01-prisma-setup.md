# PR 01 — Prisma + infraestrutura local

## O que foi implementado

- `prisma/schema.prisma` substituído pelo schema completo do KFlow (seção
  "Schema Prisma completo" do `plan.md`): 9 models, 10 enums nativos do
  Postgres, todos os índices e `@@unique` documentados na spec. O bloco
  `generator`/`datasource` (Prisma 7, driver adapters, `runtime = "cloudflare"`)
  foi mantido como já estava configurado no repo.
- `docker-compose.yml`: Postgres 17 local, porta `54329` do host (ver
  "Decisões tomadas" — a spec original pedia `54321`).
- `.env.example` e `src/shared/env.ts`: `BACKEND_DATABASE_URL` agora aponta
  por padrão para o Postgres local; adicionada `BACKEND_JWT_SECRET`
  (necessária a partir do PR 02, mas validada desde já pelo `envMiddleware`).
- `src/server/db/client.ts`: `createPrismaClient` agora escolhe o Driver
  Adapter em runtime — `@prisma/adapter-neon` sob Cloudflare Workers,
  `@prisma/adapter-pg` (TCP normal) em qualquer outro caso (`npm run dev` via
  Vite, testes do Vitest). Ver "Decisões tomadas".
- `vite-plugins/workerd-wasm-modules.ts`: o plugin de WASM que já existia
  inline em `vite.config.ts` foi extraído para ser reaproveitado também pelo
  `vitest.config.ts` — o Prisma Client gerado usa a mesma sintaxe
  `import(...wasm?module)` não importa quem o importa.
- `vitest.config.ts` + `tsconfig.test.json`: infraestrutura de testes e2e.
- `tests/helpers/setup.ts`: `app` (a mesma instância do Hono usada em
  produção, via `createApp()`), `testEnv` (bindings passados como terceiro
  argumento de `app.request()`) e `resetDb()` (`TRUNCATE ... CASCADE` em
  todas as tabelas do domínio).
- `GET /api/health` (já existia) passou a validar de ponta a ponta: Hono →
  Prisma → Postgres local, via `tests/e2e/health.e2e.test.ts`.
- Removida a feature de demonstração "users" (model `User`/`Post`, rota
  `/api/users`, página `/usuarios`) — ver "Decisões tomadas".
- `package.json`: novas dependências (`pg`, `@prisma/adapter-pg`,
  `bcryptjs`), `vitest` como dev dependency, scripts `test`, `test:watch`,
  `db:local:up`, `db:local:down`.

## Decisões tomadas

- **Stack de deploy mantida: Cloudflare Workers + Neon, não Node.js +
  `@hono/node-server`.** O `plan.md` (linha 938) especifica um servidor
  Node.js puro com `@hono/node-server` e Postgres local via
  `docker-compose.yml`. Este repositório já estava inicializado com outra
  arquitetura (Workers + Neon + SPA integrada) antes do `plan.md` existir.
  Combinado com o usuário durante o planejamento desta PR: manter o alvo de
  deploy Workers (é o que o usuário quer em produção), mas resolver o pedido
  de Postgres local do `plan.md` através de um segundo Driver Adapter do
  Prisma (`@prisma/adapter-pg`), selecionado em runtime por
  `globalThis.navigator.userAgent === 'Cloudflare-Workers'` — o idioma
  documentado pela própria Cloudflare para detectar o workerd. Não existe
  `src/server.ts`/`@hono/node-server` neste repo: o entrypoint de produção
  continua sendo `src/server.tsx` (Worker), e os testes e2e usam
  `app.request()`, que não depende de nenhum servidor HTTP real.
- **Estrutura de pastas adaptada, não recriada.** O `plan.md` pede
  `src/app.ts`, `src/db/`, `src/middlewares/`, `src/features/*` na raiz de
  `src/`. Este repo já separa `src/client` / `src/server` / `src/shared`
  (fronteira deliberada: o cliente nunca importa `src/server` e vice-versa).
  Os PRs seguintes vão criar `src/server/features/<nome>/` em vez de
  `src/features/<nome>/`, e os middlewares/lib novos entram em
  `src/server/middlewares/` e `src/server/lib/`, ao lado do que já existe.
  `tests/`, `docs/` e `docker-compose.yml` ficam na raiz, exatamente como a
  spec pede.
- **Porta do Postgres local: `54329`, não `54321`.** A porta `54321` pedida
  pela spec já está em uso nesta máquina por um container Supabase de outro
  projeto. Mantido o espírito da instrução original ("fora do padrão
  5432/5433") com uma porta livre.
- **Contrato tipado do front-end (`src/shared/api/contract.ts`) não será
  estendido para as novas rotas do KFlow.** Esse contrato é uma convenção
  deste repo (não existe no `plan.md`, que não pressupõe front-end nenhum).
  Estender manualmente um contrato de ~40 rotas para uma SPA que ainda não
  consome essa API seria trabalho especulativo. Os PRs seguintes vão expor a
  API via `src/server/features/*` sem tocar em `src/shared/api/contract.ts`;
  quando o front-end do KFlow for construído, o contrato pode ser preenchido
  a partir dos DTOs já existentes em cada feature.
- **Feature de demonstração "users" removida.** O `schema.prisma` original
  trazia os models `User`/`Post` comentados como "modelos de exemplo — troque
  pelos seus". Como a spec define uma entidade `Usuario` real com forma
  totalmente diferente (login, papel, hash de senha), mantive a limpeza
  completa em vez de fazer os dois modelos de usuário conviverem: removidos
  `src/server/routes/users.route.ts`, `src/shared/dto/user.dto.ts`,
  `src/client/app/hooks/use-users.ts`, `src/client/app/routes/users.page.tsx`,
  a entrada `/usuarios` da navegação e as duas rotas (`listUsers`,
  `createUser`) do contrato do front-end. `src/client/app/routes/home.page.tsx`
  não dependia dessa feature (só de `useHealth`) e ficou intacta.
- **`BACKEND_JWT_SECRET` em vez de `JWT_SECRET`.** A spec (linha 942) usa
  `process.env.JWT_SECRET` sem prefixo. Este repo tem uma convenção de
  segurança estabelecida (prefixo `BACKEND_`/`FRONTEND_` como fronteira que o
  Vite usa para nunca vazar segredo pro bundle do browser — ver `readme.md`).
  Segui essa convenção em vez da nomenclatura literal da spec; é puramente o
  nome da variável, nenhuma regra de negócio muda.

## Pontos para revisão

- A troca de Driver Adapter por `globalThis.navigator.userAgent` é o ponto
  mais sensível desta PR: se algum dia o Wrangler/Miniflare mudar esse
  user-agent, ou se o projeto migrar de `@hono/vite-dev-server` para outra
  forma de dev server que rode dentro de um workerd real, a detecção
  silenciosamente escolheria o adapter errado. Vale um teste de smoke manual
  (`npm run preview`, que usa `wrangler dev` de verdade) depois que a
  primeira feature estiver pronta, para confirmar que o adapter do Neon
  também funciona nesse caminho — os testes automatizados de e2e só cobrem o
  caminho Node/`adapter-pg`.
- Não configurei nenhum pipeline de CI que suba o `docker-compose.yml`
  automaticamente antes de `npm test` — os testes e2e assumem que
  `npm run db:local:up` já rodou. Se este repo ganhar CI, isso precisa entrar
  no workflow.
- `prisma/migrations/` foi gerado localmente (`prisma migrate dev --name
  init`) contra o Postgres do `docker-compose.yml` — o SQL gerado é
  determinístico a partir do schema, mas vale conferir se o nome/timestamp da
  migration incomoda antes do merge.
