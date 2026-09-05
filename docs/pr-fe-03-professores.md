# PR fe-03 — Professores (+ aba Usuários em Configurações)

## O que foi implementado

- `professores.dto.ts` movido pra `shared/dto/`; `listarProfessores`,
  `buscarProfessor`, `criarProfessor`, `atualizarProfessor` registrados em
  `contract.ts`. `usuarios.dto` já morava em `shared/dto/auth.dto.ts`
  desde a fe-01 — só faltava registrar `listarUsuarios`/`criarUsuario`/
  `atualizarUsuario` no contrato, feito aqui.
- **`/professores`** (nav item novo): grid de cards (nome, matérias,
  capacidade/horário, dias, horário) + dialog de criar/editar.
- **`ProfessorFormDialog`** escolhe entre dois formulários conforme quem
  está editando: `ProfessorFormFull` (nome + tudo mais — admin criando ou
  editando qualquer professor) ou `ProfessorFormSelf` (só
  telefone/email/foto/observações — um professor editando o próprio
  registro, via `ProfessorUpdateInputSelf`).
- Botão "Agenda" de cada card fica desabilitado (sem link até a fe-06
  existir).
- **Configurações ganha a 2ª aba, "Usuários"**: tabela (nome, email, papel,
  toggle de ativo) + dialog "Novo usuário" (nome, email, papel, e
  professor vinculado só quando papel = Professor — picker já filtra pra
  fora professores que já têm login).

## Decisões tomadas

- **Sem contagem de "Alunos" no card do professor.** O print mostra
  "ALUNOS: N", mas isso vem de matrícula — dado que só existe a partir da
  fe-04 (Alunos). Card mostra só o que `ProfessorOutput` já tem hoje
  (matérias, capacidade/horário, dias, horário); a contagem aparece
  naturalmente quando o Painel (fe-05) cruzar os dados, não retroativamente
  aqui.
- **Toggle "Dias disponíveis" não oferece Domingo.** O enum `DiaSemana` do
  backend aceita `DOM` normalmente, mas o print (`novo-professor-vazio.png`,
  `editar-professor.png`) só mostra 6 botões (Seg–Sáb) — nenhuma unidade
  Kumon funciona aos domingos. Reproduzido fielmente; `DOM` continua um
  valor válido no schema, só não é oferecido nesta tela.
- **`ProfessorFormFull` usa `ProfessorCreateInput` (schema cheio) tanto pra
  criar quanto pra editar como admin**, não `ProfessorUpdateInputAdmin`
  (a versão `.partial()`). O dialog de edição sempre mostra o formulário
  inteiro já preenchido (igual ao print) — nunca um PATCH parcial pela UI
  — então exigir todos os campos ao validar é o comportamento certo, e
  evita ter dois tipos de formulário (genérico teria que aceitar o schema
  parcial E o cheio pro mesmo componente). `PUT /professores/:id` aceita
  o corpo cheio numa boa, mesmo o schema do backend permitindo parcial.
- **"Cor da agenda"** usa `<input type="color">` nativo — não existe
  primitive de color-picker no shadcn, e um nativo já resolve
  funcionalmente (formulário do print é só uma amostra de cor clicável).
- **Edição de "papel" de um usuário existente não tem UI** — só o toggle
  de `ativo` é exposto na tabela. Trocar papel depois de criado não é um
  fluxo comum o bastante pra justificar a UI agora; `PUT /usuarios/:id`
  já aceita `papel`, então é só questão de acrescentar um controle depois
  se for preciso.

## Correções de QA (PR #26)

`docs/qa-fe-03-professores.md` encontrou 4 achados, todos corrigidos:

- **`horarioFinal <= horarioInicial` aceito — corrigido no backend.** Novo
  helper `janelaDeAtendimentoValida` (`server/lib/horario.ts`) usado em
  `criarProfessor` e `atualizarProfessor` (este último comparando contra o
  valor existente quando o `PUT` só manda um dos dois campos) — rejeita
  com 400 "O horario final deve ser depois do horario inicial.". Sem
  `.refine()` no schema Zod (decisão: só backend, sem lógica especial no
  front) — 2 novos testes e2e.
- **Falha de escrita sem feedback** (`professor-form-full.tsx`,
  `professor-form-self.tsx`) — já resolvido globalmente na fe-01
  (`useApiMutation`); confirmado em browser (screenshot do toast + dialog
  permanecendo aberto ao tentar criar com horário invertido).
- **UI oferece ações que o backend recusa — corrigido.** "Novo professor"
  agora só aparece pra `isAdmin`; o lápis de editar no card só aparece
  quando `podeEditarProfessor(professor.id)` é `true` (admin, ou o próprio
  professor) — `ProfessorFormDialog` nem é montado quando não pode editar,
  em vez de abrir um formulário que o backend sempre rejeitaria.
- **Card mostrava contagem de dias, não os dias — corrigido.** "DIAS: 5"
  virou os chips abreviados (`Seg`/`Ter`/.../`Sáb`) a partir de
  `professor.diasDisponiveis`.

## Pontos para revisão

- Visualmente verificado em browser real (Playwright/Chromium,
  `LOCAL_DEV_SERVER=true`): criação de professor com horário invertido
  (toast de erro + dialog permanece aberto), chips de dias no card. Não
  cheguei a validar via login real o caso "professor vendo o próprio
  card" (exigiria reset de senha do usuário vinculado) — a lógica
  (`podeEditarProfessor`) é a mesma já usada por `ProfessorFormDialog`
  desde a versão original desta PR, só que agora também controla se o
  botão aparece. `npm run typecheck`, `npm test` (111/111) e
  `npx vite build` passam limpos.
