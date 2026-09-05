# Prompt de implementação — achados do QA manual (fe-01 → fe-07)

> Este arquivo foi escrito por uma sessão que fez QA manual em navegador
> real (Chromium) na cadeia inteira `fe-01`→`fe-07` deste repo, PR por PR.
> Os achados, reproduções e decisões completas estão em
> `docs/qa-fe-00-visao-geral.md` até `docs/qa-fe-07-acompanhamento.md`,
> nesta mesma branch/PR (#26). Leia este arquivo inteiro e execute **todas**
> as correções nele descritas. Cada item abaixo já foi decidido e aprovado
> — não é preciso confirmar nada de volta, a menos que surja um bloqueio
> genuíno (ambiguidade real de implementação, não preferência de estilo).
> Consulte o `.md` da branch correspondente quando precisar do raciocínio
> completo ou dos passos de reprodução — este arquivo é o resumo acionável.

## Entrega

Só considerem o trabalho pronto quando **toda a pilha** (fe-01 até fe-07)
estiver corrigida, com `npm run typecheck`, `npm test` (baseline: 116/116)
e `npx vite build` passando em cada branch, **e** testada manualmente de
verdade (via `LOCAL_DEV_SERVER=true`, item 7 abaixo — não só pelos testes
automatizados, principalmente o fluxo novo da fe-07, que muda comportamento
observável). Usem a ferramenta de git stack de vocês (`gstack`/`git-stack`)
pra propagar as mudanças da base (fe-01) pra frente pela pilha, em vez de
merges manuais um a um — mantendo a pilha sincronizada conforme a base é
corrigida. Não parem no meio pra reportar progresso parcial; entreguem
tudo já resolvido e testado, do início ao fim.

## Como as branches estão empilhadas

`feat/fe-01-setup` → `fe-02-configuracoes` → `fe-03-professores` →
`fe-04-alunos` → `fe-05-painel` → `fe-06-agenda` → `fe-07-acompanhamento`,
cada uma com PR aberto (#18 a #24) baseado na anterior.

**Atenção**: os "padrões gerais" abaixo (itens 1, 2, 4, 5, 6) são código
compartilhado (`useApiMutation`, `useAuth`, um contexto novo) que fe-03 e
fe-04 já precisam consumir. A fundação deles tem que entrar **em fe-01**
(ou o mais cedo possível na pilha, antes de fe-03/fe-04), não pode esperar
até a branch onde o sintoma apareceu primeiro. Planejem a ordem de
implementação pensando nisso — é o ponto que exige mais cuidado neste
trabalho.

## Padrões gerais (implementar uma vez, cedo na pilha — ver `qa-fe-00-visao-geral.md`)

1. **Erro de mutação engolido.** Só 4 dos 12 componentes que usam
   `useApiMutation` tratam o `error`. Corrigir dentro do próprio hook (não
   em cada chamador): fallback genérico visível ao usuário quando a escrita
   falha. Antes de implementar, verifiquem se já existe algum padrão de
   desempacotamento de erro (na `callApi`/`ApiError`); se existir,
   reaproveitem — só criem um novo se não houver nada.
2. **Mensagens do Zod cruas, em inglês.** `errorMap` global em pt-BR, num
   entry point comum que rode antes de qualquer uso do Zod no app (o schema
   é compartilhado entre front e back). Testem manualmente em mais de uma
   tela depois, pra garantir que o entry point carrega antes de qualquer
   validação e que a tradução realmente se propaga.
3. Contadores que ignoram filtro ativo + sem estado vazio — sem decisão
   nova aqui, é referência pros itens específicos abaixo (`/agenda-geral`
   já acerta os dois, usem como modelo).
4. **Ações que o backend recusa aparecem oferecidas na UI.** Hook/contexto
   global tipo "current user" (ao lado do que `useAuth` já expõe), que os
   componentes consultem pra esconder/desabilitar ação — em vez de cada
   tela checar `usuario?.papel` na unha.
5. **Dados brutos do snapshot como contexto global compartilhado.**
   `GET /painel` (professores/alunos/matérias/matrículas) vira um
   contexto com `loading`/`data`/`refetch`; cada tela deriva e filtra seu
   próprio estado a partir dele, sem chamada extra. A validação cruzada que
   falta no **backend** entra junto, na mesma leva (confirmado: nem
   `matriculas.service.ts` valida professor×matéria, nem
   `horarios.service.ts` valida horário×disponibilidade do professor).
6. **Estado de filtro na URL como padrão único, tipado.** Onde uma tela
   sincroniza filtro com querystring, tratar a URL como fonte de verdade em
   **todos** os filtros da tela (não só um), com fallback explícito por
   filtro quando ausente, e as chaves esperadas centralizadas/tipadas num
   só lugar — não literais soltos pelo componente.
7. **Dev server local sem depender do Neon** (não é bug, é ferramenta):
   env `LOCAL_DEV_SERVER` (string `"true"`/`"false"`) lida via `loadEnv` no
   topo do `vite.config.ts` (mesmo `.env` de `BACKEND_DATABASE_URL`), que
   decide se o `cloudflareAdapter` entra no `devServer()`. Com `"true"`, o
   dev server roda em Node puro (sem workerd), o Prisma usa `PrismaPg`
   contra o Postgres local — sem precisar de Neon, sem arquivo de config
   duplicado, sem comando novo. Isso resolve a ressalva que está em todos
   os `pr-fe-*.md` ("não consegui verificar visualmente num browser real").
   Cabe em `fe-01` (é onde `vite.config.ts` primeiro existe nessa forma).

## fe-01 — Setup (branch `feat/fe-01-setup`, PR #18)

- Dois `<main>` aninhados (`SidebarInset` do shadcn + o `<main>` da página):
  corrigir com a prop do próprio componente shadcn (`asChild`/equivalente),
  não substituir na marra por `<div>` no consumidor.
- 404 mostra texto técnico pro usuário final ("O Worker devolveu o
  index.html..."): criar uma tela de 404 simples, sem esse texto.
- Busca do topo ("Buscar aluno...") é decorativa, sem `onChange`, mas
  parece funcional: remover o componente por enquanto; abrir uma issue pra
  implementar a busca de verdade depois.
- Data do cabeçalho capitaliza "De" via CSS (`capitalize` na string
  inteira): parar de depender do CSS, renderizar já formatado com
  `Intl.DateTimeFormat` (ou equivalente nativo), capitalizando só a palavra
  certa.
- "E-mail ou senha invalidos." sem acento: a string vem do **backend** —
  corrigir a acentuação lá.

## fe-02 — Configurações (branch `feat/fe-02-configuracoes`, PR #19)

- Matéria duplicada aceita em silêncio (`Materia.nome` sem `@unique`): não
  vale a pena arrumar agora — abrir issue pra constraint/check no backend
  quando o app virar multi-tenant.
- Validação Zod crua → padrão geral 2.
- Erro de escrita sem tratamento em `materias-tab.tsx`/
  `conteudos-da-materia.tsx` → padrão geral 1.
- Item inativo (matéria/conteúdo) idêntico a um ativo: adicionar estilo
  (`text-muted-foreground` e/ou badge "Inativa").

## fe-03 — Professores (branch `feat/fe-03-professores`, PR #20)

- `horarioFinal` menor que `horarioInicial` é aceito: validar **só no
  backend**, sem lógica especial no front — erro aparece na UI como
  qualquer outro erro da API. Criar um helper que pegue as duas strings de
  horário (o Zod já garante o formato), transforme em número e compare;
  o endpoint rejeita `horarioFinal <= horarioInicial`.
- Falha de escrita sem feedback (`professor-form-full.tsx`,
  `professor-form-self.tsx`) → padrão geral 1.
- Botão "Novo professor" visível pra não-admin; editar cadastro de *outro*
  professor abre o formulário completo (`professor-form-dialog.tsx`) →
  padrão geral 4 (hook de current user).
- Card mostra "DIAS: 5" (contagem): trocar pelos chips dos dias
  (`professor.diasDisponiveis`).

(Removidos por decisão: iniciais do avatar, validação inconsistente
email/capacidade, botão de editar sem `aria-label`, usuário novo sem senha
utilizável — nenhum desses entra nesta rodada.)

## fe-04 — Alunos (branch `feat/fe-04-alunos`, PR #21)

- Picker de professor não filtra pela disciplina escolhida (aceitou Bruno
  Lima, que só leciona Português, numa matrícula de Matemática) → padrão
  geral 5 (contexto global + validação cruzada no backend).
- Programação semanal ignora `diasDisponiveis`/`horarioInicial`/
  `horarioFinal` do professor (aceitou SEG 08:00 pro Bruno, que só atende
  Ter/Qui 13h-19h) → padrão geral 5, mesma correção.
- Contador ignora busca / sem estado vazio → padrão geral 3.
- `estagio` grava `''` em vez de `null`: corrigir no **backend** — um
  ternário (`estagio || null`, ou equivalente) antes de gravar.
- `matricula-existing-card.tsx` não trata erro de mutação → padrão geral 1.

(Removido: a11y do botão de editar.)

## fe-05 — Painel (branch `feat/fe-05-painel`, PR #22)

- Donut "Matrículas por matéria" sem legenda/rótulo: adicionar
  `<ChartLegend />` (ou `<ChartTooltip />`), mesmo padrão que os outros
  gráficos já usam.
- Alerta "Fernanda Dias esta marcado como zona vermelha" (sem acento, sem
  concordância): trocar por formulação neutra — "Fernanda Dias está na
  zona vermelha." (generalizar pro nome de qualquer aluno).
- Card "MATRÍCULAS ATIVAS" com subtítulo "disciplinas ativas" (métrica
  errada): trocar por "matrículas em curso" (ou "vínculos ativos").
- Gráfico "Aulas por dia da semana" reserva coluna pro domingo, que nunca
  tem valor: remover a coluna, mostrar só Seg–Sáb.
- Eixo Y com ticks fracionários numa contagem de aulas: `allowDecimals=
  {false}` no `<YAxis>` dos dois gráficos de barra.

## fe-06 — Agenda (branch `feat/fe-06-agenda`, PR #23)

- `/agenda` sem `?professorId=` abre numa grade vazia sem explicação
  (caiu no professor com horário inválido, sem nenhum critério de
  ordenação no fallback) → padrão geral 5 (não devia depender de URL pra
  funcionar) + padrão geral 6 (todos os filtros da tela — hoje só
  `professorId` lê da URL, e só no mount; os outros seis são state local
  puro, nunca sincronizados).
- Cabeçalho mistura abreviação e extenso ("Seg · Ter · ... · Sábado"):
  trocar "Sábado" por "Sáb", igual às abas da agenda geral.
- Agenda mostra aluno fora da disponibilidade do professor sem marcação:
  só o link pro fix de origem (fe-04) — sem ação extra aqui.
- "Novo aluno" aparece pra quem recebe 403 → padrão geral 4.

(Removido: escopo por papel inconsistente entre `/alunos` e
`/agenda-geral` — decisão de produto em aberto, ignorar por enquanto.)

## fe-07 — Acompanhamento (branch `feat/fe-07-acompanhamento`, PR #24)

**Este é o item maior — redesenho de fluxo, não um patch pontual.**
`registrar-aula-dialog.tsx` hoje faz autosave por campo (cada clique já
dispara um `POST`/`PUT`, sem tratamento de erro — se a chamada falha, a UI
já tinha avançado o progresso local, e o dado nunca foi gravado; reproduzido
interceptando um `PUT` com 500). **Decisão: remover o autosave por
completo**, não só corrigir o erro dele. Fluxo novo, em duas fases:

- **Fase 1 — Chegada.** Continua sendo o único campo visível até o
  professor escolher (nenhum outro aparece antes). O clique cria o
  registro na hora (`POST`), com os botões em loading/desabilitados
  enquanto a chamada está em voo. Se **FALTOU**, o dialog fecha assim que o
  `POST` resolver. Se **PRESENTE/ATRASADO**, o dialog fica aberto e revela
  o resto (mesma divulgação progressiva de hoje).
- **Fase 2 — os demais campos.** Cada campo parte do valor que já existe no
  registro (reabertura) ou vazio (novo) — **sem chamada de rede por
  campo**. Tudo em estado local até o clique em **"Enviar"** (renomeia
  "Finalizar aula" — o nome atual mente sobre o que o botão faz). Esse
  clique dispara **um único `PUT`** com os campos preenchidos até ali, e só
  fecha o dialog se a chamada tiver sucesso.
- O `POST` da Fase 1 e o `PUT` da Fase 2 precisam de tratamento de erro de
  verdade (nenhum dos dois tem hoje) — padrão geral 1: se falhar, o dialog
  não fecha e o erro aparece.
- Depois de fechar, a lista (chips + estado da linha) atualiza via
  **refetch** — não precisa aproveitar o estado local do dialog pra isso.
- O cálculo de "quanto falta" reaproveita os helpers que já existem
  (`contarNotasPreenchidas`, `statusRegistro`, `isFalta`, `isCompleto` em
  `shared/dto/registro.dto.ts`) — sem lógica nova.
- **Importante:** isso não é autosave. A lógica de "poder parar" é só não
  precisar ter as 6 notas completas de uma vez antes de registrar algo
  (Pendente/Em andamento continuam estados válidos) — não é sobre salvar
  sozinho a cada campo.

Outros achados da fe-07:

- Aceita registrar aula em data futura: bloquear **só no front**. Navegar
  pra data futura continua liberado (leitura); a escrita (botão "Registrar
  aula", e o próprio clique em Chegada) fica desabilitada quando a data
  selecionada é depois de hoje. Sem mudança no backend.
- Chips ignoram busca / sem estado vazio → padrão geral 3.
- Warning do `ToggleGroup` (uncontrolled→controlled) toda abertura do
  dialog: corrigir se for simples (valor inicial `''` em vez de
  `undefined`); se precisar de mais que isso, deixar pra lá.
- Seção "Comportamento" contém um campo também chamado "Comportamento":
  renomear a seção pra algo como "Postura em aula", mantendo o nome do
  campo.
- Texto "0/6 notas" aparece antes de escolher a chegada, mas a barra de
  progresso (corretamente) só aparece depois: texto deve seguir a mesma
  condição de visibilidade da barra.
