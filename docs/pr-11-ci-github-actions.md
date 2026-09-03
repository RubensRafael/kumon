# PR 11 — CI (GitHub Actions)

PR fora da numeração original do `plan.md` (que termina no PR 10 — Painel).
Fecha uma pendência registrada explicitamente em `docs/pr-01-prisma-setup.md`
("Pontos para revisão"): os testes e2e dependiam de alguém subir o
`docker-compose.yml` manualmente antes de rodar `npm test`, sem nenhuma
verificação automática em push/PR.

## O que foi implementado

- `.github/workflows/ci.yml`: um único job (`test`), rodando em todo push
  para `main` e em toda pull request (cobre as 10 PRs já abertas da cadeia).
- Sobe um Postgres 17 como *service container* do próprio job (mesmas
  credenciais do `docker-compose.yml`, porta `5432` padrão do container —
  sem o problema de colisão de porta do host que forçou `54329` em dev
  local).
- Sequência: `npm ci` (que já dispara `prisma generate` + `wrangler types`
  via `postinstall`) → `prisma migrate deploy` (não-interativo, só aplica
  migrations já commitadas) → `npm run typecheck` → `npm test` →
  `npm run build`.
- `readme.md` atualizado com uma nota linkando o workflow.

## Decisões tomadas

- **Sem `wrangler deploy --dry-run`** (que `npm run check` roda
  localmente): exigiria credenciais da Cloudflare (`CLOUDFLARE_API_TOKEN`)
  que este workflow não tem configuradas. `npm run build` já cobre
  typecheck dos três projetos (client/server/node) + build real do
  front-end, que é a parte que roda sem autenticação nenhuma.
- **Node 24 no CI**, para bater exatamente com a versão usada durante todo
  o desenvolvimento desta cadeia de PRs (`engines` no `package.json` só
  exige `>=20`; usei a mesma versão já validada em vez da mínima).
- **Um único job, sem matriz de versões.** A spec não pede suporte a
  múltiplas versões de Node/Postgres, e a stack já é bem específica
  (Prisma 7, Node ≥20) — uma matriz aumentaria o tempo de CI sem
  necessidade real neste momento.

## Pontos para revisão

- Este workflow não faz deploy nenhum — só valida. Se/quando o projeto
  quiser CD (deploy automático pro Cloudflare Workers no merge em `main`),
  isso é um workflow separado, com secrets configurados no repositório.

## Atualizações pós-revisão

Merge em cascata de `feat/10-painel` (última da chain, já trouxe o merge do
PR 02/03, ver `docs/pr-03-professores.md`) — sem nenhum ajuste de código
necessário aqui: `ci.yml` não referencia `paraApi`/`paraBanco`, nenhum enum
nem o helper de auth de teste, então nada nesta branch quebrou com as
mudanças do PR 02. `BACKEND_RESEND_API_KEY` (nova env obrigatória) não
precisou ser adicionada ao bloco `env:` do workflow — só é lida por
`envMiddleware` em tempo de request, e nenhum dos passos do CI
(`typecheck`, `test`, `build`) executa esse caminho: `npm test` usa o
`testEnv` hardcoded em `tests/helpers/setup.ts` (já inclui a env, adicionada
no PR 02), e `npm run build` é só `tsc` + `vite build`, nenhum dos dois lê
`process.env`. Confirmado rodando os 3 passos do workflow localmente
(`typecheck`, `test` — 101 passando, `build`) antes de dar push.
