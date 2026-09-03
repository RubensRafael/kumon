# PR 02 — Autenticação e usuários

## O que foi implementado

Seção 1 da spec (`plan.md`), completa:

- `src/shared/dto/enums.ts`: primeiro enum compartilhado (`PapelEnum`).
  Cresce incrementalmente — cada PR seguinte adiciona só o(s) enum(s) que a
  sua seção usa, em vez de todos de uma vez.
- `src/server/lib/db-enum.ts`: `paraApi`/`paraBanco`, a conversão genérica
  entre o enum nativo do Postgres (sempre MAIÚSCULO) e o `z.enum(...)` da API
  (sempre minúsculo) — usada por toda feature que toque um enum a partir daqui.
- `src/server/lib/senha.ts`: hash/verificação com `bcryptjs`, e o
  `SENHA_PLACEHOLDER` gravado num usuário recém-criado (nunca é um hash bcrypt
  válido, então login com ele falha sempre).
- `src/server/lib/token.ts`: token de reset (Web Crypto `getRandomValues`,
  32 bytes) e seu hash (`SHA-256`, via `crypto.subtle.digest`) — funciona
  igual no workerd e em Node, sem depender de `node:crypto`.
- `src/server/middlewares/auth.middleware.ts`: decodifica o JWT
  (`hono/jwt`) e injeta `AuthContext` em `c.var.usuario`.
- `src/server/middlewares/require-admin.middleware.ts`: `403` para não-admin.
- `src/server/features/auth/{auth.dto,auth.service,auth.routes}.ts`: os 6
  endpoints da seção 1.
- `prisma/schema.prisma`: `@@index([resetTokenHash])` em `Usuario` (nova
  migration `20260903133231_usuario_reset_token_index`) — campo que passou a
  ser consultado por `resetarSenha`.
- 19 testes e2e em `tests/e2e/auth.e2e.test.ts`, cobrindo os 6 endpoints:
  caminho feliz, `403` de professor tentando gerir usuário, todas as
  validações de `professorId`/`papel`, e o fluxo completo de reset
  (solicitar → token capturado do `console.log` → resetar → login com a
  senha nova → reuso do token já consumido → `400`).

## Decisões tomadas

- **`Usuario.professorId` é campo derivado, não coluna.** O schema (herdado
  do PR 01) tem o FK no sentido contrário: `Professor.usuarioId` aponta para
  `Usuario`, não o inverso — não existe coluna `professorId` em `Usuario`.
  `UsuarioOutput.professorId` e o `professorId` do JWT são resolvidos com um
  `findUnique({ where: { usuarioId } })` em `Professor`. `POST /usuarios` com
  `papel: 'professor'` faz, numa transação: cria o `Usuario`, depois
  atualiza `Professor.usuarioId` para apontar pra ele.
- **`professorId` obrigatório quando `papel === 'professor'` E proibido
  quando `papel === 'admin'`.** A spec só falava da obrigatoriedade no
  primeiro sentido ("obrigatório se papel === 'professor'"). Adicionei a
  direção oposta como validação explícita (`400`) porque um `admin` com
  `professorId` preenchido não tem sentido no domínio e o silêncio do Zod
  aqui esconderia um erro real de quem está chamando a API — diferente dos
  casos documentados no apêndice "Erros preveníveis pela UI", que são só
  sobre esconder controle de edição, não sobre dado sem sentido.
- **`POST /usuarios` valida a existência do `professorId`** (`400` se não
  existir) **e que o professor ainda não tem usuário vinculado** (`409` se já
  tiver). Nenhum dos dois está listado nas "regras de negócio" da seção 1,
  mas sem eles a API devolveria um erro cru de constraint do Postgres
  (violação de FK ou de `@unique` em `Professor.usuarioId`) em vez de uma
  mensagem legível — mesmo espírito do erro humanizado de matrícula que a
  spec já define na seção 5.
- **Login sempre com a mesma mensagem genérica** (`E-mail ou senha
  inválidos.`) **para e-mail inexistente, senha errada e usuário
  desativado.** A spec não fala de mensagens de erro de login
  explicitamente, mas o mesmo princípio que ela aplica a
  `solicitar-reset` ("não revela quais e-mails têm conta") se aplica aqui:
  uma mensagem diferente por caso vira um oráculo de enumeração de e-mail.
- **Login rejeita usuário com `ativo: false`.** Não está escrito literalmente
  na seção 1, mas é a única leitura que dá algum efeito real a
  `PUT /usuarios/:id { ativo: false }` — sem essa checagem, "desativar" um
  usuário não desativaria nada.
- **`authMiddleware` não consulta o banco — confia inteiramente no JWT.**
  Implementado exatamente como o pseudocódigo de `authMiddleware` na seção
  "Middlewares" do `plan.md`, que só decodifica o token. `GET /me` é a
  exceção deliberada: busca o usuário fresco no banco, então reflete
  `ativo`/`papel` atualizados mesmo com um token antigo. Consequência
  registrada abaixo, em "Pontos para revisão".
- **`BACKEND_JWT_SECRET` (não `JWT_SECRET`)** — decisão já registrada no
  PR 01, aqui é onde a variável passa a ser efetivamente usada
  (`sign`/`verify` do `hono/jwt`, algoritmo `HS256` explícito).

## Pontos para revisão

- **Janela de até 7 dias entre desativar um usuário e o token dele parar de
  funcionar.** Como `authMiddleware` não bate no banco, um `admin` que faz
  `PUT /usuarios/:id { ativo: false }` não revoga imediatamente tokens já
  emitidos para esse usuário — eles continuam validando em qualquer rota
  protegida (exceto `GET /me`, que rebusca o estado) até expirar
  naturalmente. Isso é uma consequência direta de seguir o pseudocódigo da
  spec ao pé da letra; se isso for inaceitável para o produto (ex.: um caso
  de admin comprometido precisando ser desligado na hora), a correção é
  fazer `authMiddleware` também consultar `ativo` no banco — o que reintroduz
  uma query por request em toda rota protegida.
- **Não existe endpoint de listagem de usuários** (a spec também não define
  um) — hoje só é possível criar e atualizar um usuário pelo `id`, então
  administrar usuários via API exige guardar o `id` retornado na criação.
  Vale confirmar se isso é intencional antes do front-end de gestão de
  usuários ser construído.
- Nenhum provedor de e-mail real está integrado — o "envio" de
  `solicitar-reset` é, hoje, sempre um no-op (silencioso em produção, com
  `console.log` do token em dev). Isso é o que a spec pede explicitamente,
  mas vale registrar que o fluxo de reset em produção, hoje, não tem nenhum
  jeito de chegar ao usuário final até um provedor real ser conectado.

## Atualizações pós-revisão

Discussão completa em `discussao-pr-02.md` (untracked, na raiz). Cada item
abaixo corresponde a um commit isolado.

- **Enums uppercase em tudo, sem `paraApi`/`paraBanco`.** Revisa a decisão
  original: o `plan.md` sugeria minúsculo na API com uma camada de conversão
  genérica; na prática as duas pontas (banco e API) são fixadas de forma
  independente pelo mesmo schema, então um único casing (MAIÚSCULO, igual ao
  enum nativo do Postgres) elimina a conversão e os call sites com generic
  explícito (`paraBanco<Papel>(...)`) que ela exigia. `src/server/lib/db-enum.ts`
  foi removido; `PapelEnum` agora é `z.enum(['ADMIN', 'PROFESSOR'])`.
