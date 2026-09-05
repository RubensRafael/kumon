# PR fe-02 — Configurações (aba Matérias e Conteúdos)

## O que foi implementado

- `materias.dto.ts` movido de `server/features/materias/` pra
  `shared/dto/`; `listarMaterias`, `criarMateria`, `atualizarMateria`,
  `listarConteudosDaMateria`, `criarConteudo`, `atualizarConteudo`
  registrados em `shared/api/contract.ts`.
- **`ApiParams<TName>`**: extensão do contrato pra suportar `:param` no
  path (primeira PR que precisa disso — até aqui só existiam rotas sem
  parâmetro). Extrai os nomes de `:param` do path literal
  (`/materias/:id` → `{ id: string }`) via template literal type, e
  `callApi` substitui os tokens antes de montar a URL.
- Página **Configurações** (`app/routes/configuracoes/`), nova, sem print
  de referência: `Tabs` do shadcn com uma aba por enquanto
  ("Matérias e conteúdos") — estrutura pensada pra a fe-03 acrescentar
  "Usuários" como segunda aba sem mexer no resto.
- `MateriasTab`: lista todas as matérias (`incluirInativas=true`, já que é
  tela de admin) num `Accordion`, cada item com um `Switch` de
  ativo/inativo ao lado do nome e, expandido, a lista de conteúdos daquela
  matéria (também com `Switch` por conteúdo) + um form inline pra
  adicionar conteúdo novo. Dialog "Nova matéria" no topo.
- Rota `/configuracoes` marcada `adminOnly: true` (`config/routes.tsx`):
  some do menu da sidebar pra quem não é admin (`AppShell` filtra
  `navItems`), e a própria rota mostra "acesso restrito" se alguém
  navegar direto pra lá sem ser admin (`RequireAdmin`, novo em
  `common/require-auth.tsx`) — o `requireAdmin` do backend já bloqueava a
  escrita; isso só evita a tela quebrada/erro genérico na UI.

## Decisões tomadas

- **Conteúdos de cada matéria são buscados sempre, não só quando o
  accordion abre.** Dado o volume esperado (poucas matérias por unidade),
  não valia a complexidade de sincronizar o estado de "aberto" do
  Radix Accordion com um `enabled` condicional na query — cada item já
  busca os próprios conteúdos ao montar.
- **Sem confirmação antes de desativar** matéria/conteúdo (só o toggle) —
  mesma filosofia do backend (soft-delete reversível, sem `DELETE` físico
  em nenhum dos dois); desativar por engano é só ligar de novo.

## Pontos para revisão

- Mesma limitação da fe-01 pra testar visualmente num browser real (ver
  `docs/pr-fe-01-setup.md`) — `npm run typecheck`, `npm test` (109/109) e
  `npx vite build` passam limpos.
