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
- **`professorId` obrigatório quando `papel === 'PROFESSOR'`; opcional (não
  mais proibido) quando `papel === 'ADMIN'`.** A validação original também
  proibia `professorId` para admin — revista num commit seguinte, ver
  "Atualizações pós-revisão".
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
- **`authMiddleware` não consultava o banco — confiava inteiramente no
  JWT** (implementado originalmente ao pé da letra do pseudocódigo de
  `authMiddleware` no `plan.md`). Revisto num commit seguinte: ver
  "Atualizações pós-revisão".
- **`BACKEND_JWT_SECRET` (não `JWT_SECRET`)** — decisão já registrada no
  PR 01, aqui é onde a variável passa a ser efetivamente usada
  (`sign`/`verify` do `hono/jwt`, algoritmo `HS256` explícito).

## Pontos para revisão

- **Nenhum provedor de e-mail real estava integrado.** Passou a existir um
  esqueleto (`src/server/lib/email.ts`), ver "Atualizações pós-revisão" —
  mas continua sem nenhuma conta Resend real conectada, então o e-mail em si
  segue sem sair de fato até isso acontecer.

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
- **`atualizarUsuario` sem spread condicional.** Consequência direta do item
  acima: o `data` do `prisma.usuario.update` só precisava do spread
  condicional pra não chamar `paraBanco(undefined)`. Sem essa conversão no
  meio, Prisma já ignora sozinho chave com valor `undefined` em `data` — o
  campo simplesmente não é tocado — então `papel: input.papel, ativo:
  input.ativo` direto tem o mesmo efeito, sem os dois `...(x !== undefined ?
  {...} : {})`.
- **`verificarSenha` sem o guard `startsWith('$2')`.** Redundante: o
  `bcryptjs` (`compare`/`compareSync`) já checa `hash.length !== 60` antes de
  tentar decodificar qualquer coisa e devolve `false` sem lançar — é
  exatamente o caso do `SENHA_PLACEHOLDER` (44 chars). O `try/catch` sozinho
  já cobre o caso geral (hash de 60 chars com prefixo de salt inválido), que
  é quando `bcryptjs` de fato lança. Confirmado lendo
  `node_modules/bcryptjs/index.js:226-232` antes de remover.
- **`authMiddleware` passa a revalidar `ativo`/`papel` no banco a cada
  request**, fechando a janela de até 7 dias descrita na versão original
  deste doc (usuário desativado ou com papel trocado continuando a
  autenticar com um token emitido antes da mudança). Decisão registrada em
  `discussao-pr-02.md`: o custo é uma query HTTP a mais no Neon por rota
  protegida (o adapter é via `fetch`, não pool TCP — não é risco de esgotar
  conexão, só um round-trip a mais e mais leitura). `professorId` continua
  vindo do token sem revalidação — não existe endpoint que altere esse
  vínculo depois da criação, então não há o que ficar velho. Testes novos em
  `tests/e2e/auth.e2e.test.ts`, describe `authMiddleware revalida o usuario
  no banco`.
- **`GET /usuarios` (listagem, admin-only).** Fecha o gap descrito na versão
  original deste doc — a spec não define esse endpoint, mas sem ele
  administrar usuários via API exigia guardar o `id` retornado na criação.
  `listarUsuarios` resolve `professorId` de todos os usuários numa única
  query extra (`Professor.findMany` + `Map`), evitando N+1 numa listagem.
  Sem paginação, mesma convenção do resto da API (`plan.md`: "Sem paginação
  por agora").
- **Autenticação via cookie `HttpOnly`, em vez de `Authorization: Bearer` no
  corpo.** O `plan.md` pseudocodifica `authMiddleware` lendo
  `c.req.header("authorization")` — essa era a implementação original.
  Revista porque front e back são a mesma origem (`wrangler.jsonc`: um
  Worker só serve os assets da SPA e a API), então um cookie funciona sem
  CORS no caminho, e `HttpOnly` tira o token do alcance de qualquer JS do
  front (fecha a classe de risco "XSS rouba o token do `localStorage`").
  `POST /auth/login` seta o cookie `kflow_token` (`HttpOnly`, `SameSite=Strict`,
  `maxAge` igual à validade do JWT) em vez de devolver `token` no corpo —
  `LoginOutput` agora só tem `usuario`. `secure` é condicional
  (`BACKEND_ENVIRONMENT === 'production'`): sempre `true` quebraria login em
  dev local (`http://localhost`, sem HTTPS — o browser descartaria o cookie
  em silêncio). `authMiddleware` lê o cookie via `getCookie` (`hono/cookie`)
  em vez do header. Novo `POST /auth/logout` (público, sem `authMiddleware`)
  limpa o cookie — não existia nenhum antes, porque um bearer token não tem
  contraparte no servidor pra "encerrar"; vale registrar que isso continua
  sendo só client-side: o JWT em si não é revogado (é stateless), só o
  cookie do browser é limpo — um token capturado antes do logout continua
  validando até expirar. Testes e2e reescritos pra capturar o cookie do
  `Set-Cookie` da resposta de login em vez de ler `body.token`.
- **Admin pode ter `professorId` vinculado.** A validação original proibia
  a combinação (`papel === 'ADMIN'` com `professorId` preenchido → `400`).
  Revista: a pessoa administrar E dar aula é um caso real (comum numa
  unidade pequena), e nada na camada de permissão depende da ausência de
  `professorId` num admin — `requireAdmin` só olha `papel`,
  `scopeToProfessor` e `restrictProfessorSelf` (das próximas PRs) só
  auto-filtram/bloqueiam quando `papel === 'PROFESSOR'`, nenhuma olha para
  `professorId` isoladamente. `criarUsuario` já vinculava pelo
  `input.professorId` sem checar `papel`, então nenhuma mudança de service
  foi necessária — só o `.refine()` de `UsuarioCreateInput`, que passou a
  exigir `professorId` só no sentido `PROFESSOR → obrigatório`, sem mais
  proibir do lado do `ADMIN`. Ainda não dá pra vincular `professorId` a um
  admin já existente — só `POST /usuarios` faz esse link, na criação;
  `PUT /usuarios/:id` continua sem tocar nesse campo.
- **Esqueleto de envio de e-mail via Resend** (`src/server/lib/email.ts`,
  `enviarEmailResetSenha`). Nenhuma conta Resend real está conectada, então
  o template (`RESEND_TEMPLATE_ID_RESET_SENHA`) é uma constante hardcoded
  sem correspondência ainda numa conta de verdade. `BACKEND_RESEND_API_KEY`
  é obrigatória no schema de env, mas com valor dummy hardcoded
  (`RESEND_DUMMY_API_KEY`, replicado em `.env.example`) — enquanto a env
  bater com esse sentinel, `enviarEmailResetSenha` é um no-op e não chama a
  API do Resend; troca pra key de verdade quando existir conta, sem mudar
  mais nada. `solicitarReset` ganhou dois parâmetros (`resendApiKey`,
  `baseUrl` — este último vindo de `new URL(c.req.url).origin` na rota, pra
  montar o link sem precisar de uma env nova só pra isso) e continua
  fazendo o `console.log` do token em dev, como já fazia. Teste novo no
  fluxo de reset confirma que `fetch` não é chamado com a key dummy.
