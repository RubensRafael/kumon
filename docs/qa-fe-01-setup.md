# QA fe-01 — Setup: shadcn, shell, autenticação, seed

PR [#18](https://github.com/RubensRafael/kumon/pull/18) · doc de origem:
[`pr-fe-01-setup.md`](./pr-fe-01-setup.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** a base está sólida. Autenticação, sessão e controle de acesso
por papel funcionam corretamente de ponta a ponta, incluindo o fluxo de
reset de senha. Os achados são de acabamento — nenhum bloqueia o uso.

## Verificado funcionando

| Fluxo | Resultado |
| ----- | --------- |
| Rota protegida sem sessão | `/painel` → `/login` ✅ |
| Senha errada | Fica em `/login`, mostra "E-mail ou senha invalidos." ✅ |
| Login correto | → `/painel`, sidebar completa ✅ |
| Cookie de sessão | `kflow_token`, `httpOnly=true`, `SameSite=Strict`, `Max-Age=604800` ✅ |
| Token em JS | `localStorage` e `sessionStorage` vazios ✅ |
| Reload | Sessão persiste, continua em `/painel` ✅ |
| `RequireGuest` | `/esqueci-senha` autenticado → `/painel` ✅ |
| Reset de senha | `solicitar-reset` (204) → token no console → `/resetar-senha?token=` → "Senha redefinida com sucesso" → login com a nova senha ✅ |
| `RequireAdmin` | Professor em `/configuracoes` vê "Esta página é restrita a administradores." ✅ |
| Sidebar por papel | Item "Configurações" some para o professor ✅ |
| Backend | `POST /professores` e `GET /usuarios` como professor → 403 ✅ |

O `secure: BACKEND_ENVIRONMENT === 'production'` do cookie está certo — em
`http://localhost` um `Secure` fixo faria o browser descartar o cookie em
silêncio, e o comentário no código já antecipa isso.

## Achados

### 1. Dois `<main>` aninhados — Médio (a11y)

O `SidebarInset` do shadcn renderiza `<main data-slot="sidebar-inset">`, e a
página de conteúdo renderiza outro `<main class="flex-1 p-6">` dentro dele.
O HTML permite só um landmark `main` por documento — leitores de tela e
navegação por landmark ficam ambíguos. Detectado ao mirar `main` no
navegador: o seletor resolve para dois elementos.

O de dentro deve virar `<div>`, ou o `SidebarInset` deve receber
`asChild`/`as="div"`.

**Decisão:** corrigir usando a prop do componente shadcn (`asChild` ou
equivalente `as`), não substituir na marra por `<div>` no consumidor.

### 2. Copy do 404 vaza implementação — Médio

A tela `/rota-inexistente` mostra, para o usuário final:

> **404**
> Pagina nao encontrada
> O Worker devolveu o index.html e o React Router nao achou uma rota para este endereco.

Dois problemas: explica arquitetura interna (Worker, index.html, React
Router) a quem só errou uma URL, e está sem acentos ("Pagina nao
encontrada", "endereco"). Serve como comentário de código, não como
mensagem de tela.

**Decisão:** criar uma tela de 404 simples, sem o texto técnico.

### 3. Busca do topo é decorativa, mas parece funcional — Médio (UX)

O `<input placeholder="Buscar aluno...">` da barra superior não tem
`onChange` — decisão explícita e documentada no `plan-frontend.md`. O
problema não é a decisão, é que nada na tela a comunica: o campo aceita
digitação normalmente e simplesmente não faz nada.

Como agora existem duas buscas reais (`/alunos` e `/agenda-geral`), o
usuário tem todo motivo para esperar que essa também funcione.

**Decisão:** remover o componente por enquanto; abrir uma issue para
implementar a busca de verdade depois.

### 4. Data do cabeçalho capitaliza a preposição — Baixo

"Sábado, 05 De Setembro" — o `De` maiúsculo vem de um `capitalize` do CSS
aplicado à string inteira. Em português só o dia e o mês levam maiúscula
(quando levam).

**Decisão:** parar de depender do CSS para isso; renderizar já formatado
com um helper nativo do JS (`Intl.DateTimeFormat`, que tem a opção certa
para capitalizar só a palavra desejada), não capitalizar a string inteira
via CSS.

### 5. Acentuação nas mensagens de erro — Baixo

"E-mail ou senha invalidos." (falta o `á`). Mesma família do item 2 —
mensagens de tela herdando a convenção sem-acento dos comentários de código.

**Decisão:** a string vem do backend — corrigir a acentuação direto lá
(não é um problema de formatação no front).

## Diálogo com o doc da PR

- **"Não consegui verificar o login visualmente num browser real"** —
  fechado. O diagnóstico estava certo e a solução era exatamente trocar o
  adapter do dev server; ver `qa-fe-00-visao-geral.md`. Confirmo também que
  a suíte cobria mesmo a lógica: nenhum bug de backend de auth apareceu no
  teste manual.
- **"Sidebar sem nenhum item de navegação ainda"** — resolvido pelas PRs
  seguintes; no topo da cadeia a sidebar tem os 7 itens.
- **Seed idempotente** — confirmado, mas com uma pegadinha que vale
  documentar no README: `npm test` trunca as tabelas e apaga o admin. A
  ordem certa é testar e *depois* semear.
