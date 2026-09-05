# QA manual da cadeia fe-01 → fe-07 — visão geral

Teste manual em navegador real (Chromium via Playwright) da cadeia de PRs de
front-end, feito a partir de `feat/fe-07-acompanhamento` — o topo da pilha,
que contém as sete features acumuladas.

Cada `docs/qa-fe-0X-*.md` cobre uma branch e dialoga com o
`docs/pr-fe-0X-*.md` correspondente: o que a decisão documentada previa, o
que o app faz de fato, e onde os dois divergem.

## Por que isso existe

Todos os sete `docs/pr-fe-*.md` fecham com a mesma ressalva:

> Não consegui verificar o login visualmente num browser real.

O motivo está em `docs/pr-fe-01-setup.md`: `npm run dev` usa
`@hono/vite-dev-server/cloudflare`, que sobe um workerd de verdade
(Miniflare). Lá `navigator.userAgent === 'Cloudflare-Workers'`, então
`isCloudflareWorkers()` (`src/server/db/client.ts`) escolhe o adapter do
Neon — que não existe localmente — e toda chamada de API morre com
`TypeError: fetch failed`, mesmo com `BACKEND_DATABASE_URL` apontando pro
Postgres local.

Essa ressalva agora está fechada. Estes relatórios são o resultado.

## Como o ambiente foi montado

O diagnóstico da fe-01 está correto e a saída é trocar o adapter só no dev
server. Um config paralelo, sem o `cloudflareAdapter`, faz o Hono rodar em
Node puro — o mesmo caminho dos testes e2e do Vitest, onde o Prisma fala com
o Postgres via `@prisma/adapter-pg`:

```ts
// vite.config.qa.ts — igual ao vite.config.ts, com duas diferenças no devServer
import { loadEnv } from 'vite'

devServer({
  entry: './src/server.tsx',
  // 1. sem `adapter: cloudflareAdapter` -> Node puro -> PrismaPg
  // 2. sem o adapter, `c.env` precisa vir daqui (no lugar dos bindings do workerd)
  env: loadEnv('development', process.cwd(), ''),
  exclude: HONO_EXCLUDE,
  injectClientScript: false,
})
```

`npx vite --config vite.config.qa.ts`, e `GET /api/health` responde
`{"database":{"connected":true,"latencyMs":44}}`. O plugin
`workerdWasmModules` continua necessário e resolve o WASM do Query Compiler
normalmente, exatamente como já faz no Vitest.

Esse arquivo **não foi commitado** — é ferramenta de sessão. Vale a pena
versioná-lo junto com um script `npm run dev:qa`: é o que separa "não deu
pra verificar visualmente" de uma verificação de verdade a cada PR.

## Ambiente

| Item | Valor |
| ---- | ----- |
| Branch testada | `feat/fe-07-acompanhamento` (`cfa89d3`) |
| Banco | PostgreSQL 16 nativo na porta 54329 (o `postgres:17-alpine` do compose não pôde ser baixado pelo proxy) |
| Migrations | `npx prisma migrate deploy` — todas aplicadas |
| Seed | `npm run db:seed` — `admin@kflow.local` / `senha123` |
| Suíte automatizada | `npm test` → **116/116 passando**, batendo com o que a fe-07 documenta |
| Navegador | Chromium headless, viewport 1440×900 |

⚠️ **`npm test` trunca as tabelas** (setup dos e2e) e apaga o usuário do
seed. Rodar `npm run db:seed` *depois* dos testes, nunca antes — perdi um
ciclo de investigação nisso.

## Dados criados durante o teste

Tudo pela UI, salvo onde indicado: 3 matérias + 2 conteúdos, 3 professores
(um deles inválido de propósito), 5 alunos com matrículas e horários (3 via
API só para dar volume), 1 usuário com papel Professor, e 4 registros de
aula. Os achados citam esses dados pelo nome.

## Resumo dos achados

| Branch | Crítico | Alto | Médio | Baixo |
| ------ | :-----: | :--: | :---: | :---: |
| [fe-01 Setup/Auth](./qa-fe-01-setup.md) | — | — | 4 | 2 |
| [fe-02 Configurações](./qa-fe-02-configuracoes.md) | — | 3 | — | 1 |
| [fe-03 Professores](./qa-fe-03-professores.md) | — | 3 | 2 | 2 |
| [fe-04 Alunos](./qa-fe-04-alunos.md) | — | 2 | 3 | 2 |
| [fe-05 Painel](./qa-fe-05-painel.md) | — | 1 | 2 | 2 |
| [fe-06 Agenda](./qa-fe-06-agenda.md) | — | 1 | 3 | 1 |
| [fe-07 Acompanhamento](./qa-fe-07-acompanhamento.md) | 1 | 1 | 3 | 2 |

**Veredito por branch:** todas as sete entregam o que os respectivos
`pr-fe-*.md` prometem. Os fluxos principais funcionam de ponta a ponta —
login, cadastro, agenda, registro de aula, permissões por papel. O que os
relatórios apontam é a borda: validação cruzada ausente, erro de escrita
sem tratamento e estados vazios sem mensagem.

## Os três padrões que atravessam a cadeia

Vale tratá-los uma vez, centralizadamente, em vez de sete vezes.

### 1. Erro de mutação engolido (o mais grave)

`useApiMutation` expõe `error` e relança a exceção. Só 4 dos 12 componentes
que o usam consomem esse `error` ou envolvem a chamada num `try/catch`:

| Trata erro | Não trata |
| ---------- | --------- |
| `login.page.tsx` | `professor-form-full.tsx` |
| `resetar-senha.page.tsx` | `professor-form-self.tsx` |
| `aluno-form.tsx` | `materias-tab.tsx` |
| `nova-matricula-form.tsx` | `conteudos-da-materia.tsx` |
| | `matricula-existing-card.tsx` |
| | `novo-usuario-dialog.tsx` |
| | `usuarios-tab.tsx` |
| | **`registrar-aula-dialog.tsx`** |

Nos 8 da direita, uma falha de escrita produz: nenhuma mensagem, nenhum
toast, uma `ApiError` não capturada no console — e, quando o estado local já
foi atualizado antes do `await`, **a UI mostra um dado que não existe no
banco**. Reproduzi isso de ponta a ponta na fe-07; é o achado crítico.

Uma correção só resolve os oito: tratar o erro dentro do `useApiMutation`
(um `toast.error` por padrão, com opção de desligar) em vez de exigir que
cada chamador se lembre.

**Decisão:** corrigir. Não precisa necessariamente de `try/catch` por
componente, mas o erro tem que chegar ao usuário — com um fallback genérico
quando não houver mensagem específica do backend. Antes de implementar,
verificar se já existe algum padrão de desempacotamento de erro (na
`callApi`/`ApiError`, por exemplo); se existir, reaproveitar; se não
existir, criar um dentro do `useApiMutation`. A régua é: nenhum componente
deve precisar extrair/tratar o erro por conta própria — os 8 PRs que hoje
ignoram o `error` devem ser atualizados para consumir esse ponto único.

### 2. Mensagem de validação crua do Zod, em inglês

Aparece em todo formulário: `Too small: expected string to have >=1
characters`, `Too small: expected array to have >=1 items`. Num app
inteiramente em português, é a mensagem que o usuário final lê.

Some com `.min(1, 'Informe o nome')` nos schemas de `shared/dto/`, ou com um
`errorMap` global do Zod em pt-BR — este último resolve tudo de uma vez e
não exige tocar em schema nenhum.

Relacionado: a validação é inconsistente. Nome/matérias/dias mostram erro
inline; e-mail e capacidade dependem só do balão nativo do browser (que sai
no idioma do browser, não no do app).

**Decisão:** o schema Zod é compartilhado entre front e back (`shared/dto/`),
então a correção deve ser um `errorMap` global em pt-BR, configurado num
entry point comum que rode antes de qualquer uso do Zod no app — não um
ajuste por schema. Testar manualmente depois, em mais de uma tela, para
garantir que o entry point é carregado antes de qualquer validação e que a
tradução realmente se propaga para todo o Zod importado.

### 3. Contadores e estados vazios

Três telas repetem o mesmo par: o contador do cabeçalho ignora o filtro
ativo, e uma lista filtrada até zero não mostra mensagem nenhuma — só some.

| Tela | Contador |
| ---- | -------- |
| `/alunos` | "5 aluno(s)" com 0 resultados na busca |
| `/acompanhamento` | chips "3 Não iniciado" com 1 linha na busca |
| `/agenda-geral` | ✅ recalcula certo ("1 aluno(s)") — é o modelo a seguir |

## O que não é bug

Registrado porque aparece no console e chama atenção:

- **`net::ERR_ABORTED` em toda listagem.** É o `StrictMode` do React 19
  montando duas vezes em dev; o cleanup do `useEffect` aborta a primeira
  chamada. `useApiQuery` trata isso corretamente
  (`if (signal?.aborted) return`) e não há efeito em produção.
- **`401 GET /api/me` no boot.** É o `AuthProvider` checando a sessão antes
  do login. Comportamento esperado.
