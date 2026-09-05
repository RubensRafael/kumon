# PR fe-04 — Alunos

## O que foi implementado

- `alunos.dto.ts`, `matriculas.dto.ts`, `horarios.dto.ts` movidos pra
  `shared/dto/`; `listarAlunos`, `buscarAluno`, `criarAluno`,
  `atualizarAluno`, `listarMatriculasDoAluno`, `criarMatricula`,
  `atualizarMatricula`, `listarHorariosDaMatricula`, `criarHorario`,
  `atualizarHorario` registrados em `contract.ts`.
- **`/alunos`** (nav item novo): busca rápida por nome/responsável +
  grid de cards + "Novo aluno".
- **`AlunoForm`** (`components/common/aluno-form/`) — o formulário inteiro
  (Dados pessoais, Categorias, Matrículas), construído em `common/` desde
  já porque tem dois consumidores por design: `AlunoFormDialog`
  (`routes/alunos/`, o modal desta PR, igual aos prints
  `novo-aluno-dados-pessoais.png`/`editar-aluno.png`) e
  `AlunoInspectorSheet` (`components/common/`, painel lateral que a fe-06
  vai abrir a partir da Agenda, igual ao print — ainda sem nenhuma rota
  chamando ele nesta PR, só a peça pronta).
- Matrículas dentro do form: **em criação**, ficam em rascunho local
  (`MatriculaDraftCard`) até o aluno inteiro ser salvo; **num aluno já
  existente**, cada matrícula (`MatriculaExistenteCard`) e cada horário
  novo (`NovaMatriculaForm`) persistem na hora.
- `ProgramacaoSemanalGrid` (tabela Dia/Frequenta/Horário) reaproveitada
  pelos três: rascunho, matrícula existente e nova matrícula num aluno
  existente.

## Decisões tomadas

- **Fluxo de criação: aluno primeiro, matrículas depois — mas dentro do
  mesmo `onSubmit`.** `POST /alunos` roda, e só então cada matrícula em
  rascunho vira `POST /alunos/:id/matriculas` + `POST .../horarios` por
  dia marcado, em sequência (sem endpoint combinado, de propósito — ver
  `plan.md` seção 5). **Se uma matrícula falhar no meio do caminho**, o
  form não perde o aluno já criado: ele silenciosamente vira "modo edição"
  daquele aluno (mesmo componente, só troca o estado interno), mostra a
  mensagem de erro, e as matrículas que ainda faltam podem ser adicionadas
  pelo fluxo normal de "Nova matrícula" (que já persiste na hora, mais
  robusto que repetir o lote inteiro).
- **Matrícula existente: `professorId`/`materiaId`/`tipoAtendimento`/
  `estagio` são só texto**, nunca input — `MatriculaUpdateInput` não
  aceita nenhum dos quatro (o Zod descarta em silêncio se vierem), e
  oferecer um campo editável que o backend ignora é exatamente o tipo de
  "erro que a UI deveria prevenir" que `plan.md` já documenta. Só
  `situacao` (select, salva na hora) e `observacoes` (textarea, salva ao
  perder o foco) são editáveis.
- **Trocar o horário de um dia já ativo** (não só ligar/desligar) desativa
  a linha antiga e cria uma nova — mesmo padrão de "criar novo + desativar
  antigo" que `plan.md` seção 6 já documenta pro backend; a UI só decidiu
  quando disparar isso (mudou o valor do input de horário de um dia que já
  estava com o switch ligado).
- **Lista de Alunos sem o resumo de matrícula do print** ("Inglês ·
  Qui 14:30 · Ter 17:30" em cada card) **e sem o filtro por matéria.**
  `AlunoOutput` não carrega matrícula nenhuma — mostrar isso por aluno
  exigiria uma chamada extra por card (N+1: ~150 alunos = ~150 requests
  só pra abrir a lista). Esse cruzamento (aluno + matrícula + professor +
  matéria, tudo junto) é exatamente o que a fe-05 (Painel) vai trazer
  pronto no snapshot bruto — a lista ganha isso de graça quando existir,
  em vez de duplicar a busca aqui. Busca por nome/responsável continua
  100% funcional (só usa campo que `AlunoOutput` já tem).
- **`AlunoCreateInput.dataNascimento`/`dataMatricula` são
  `z.coerce.date()`** — ótimo pro backend, mas gera um tipo de "input"
  (`unknown`) diferente do "output" (`Date`), o que travava
  `useForm`/`zodResolver` (que só aceita um tipo por formulário). O form
  usa um schema local que troca essas duas por `z.string()` (o que
  `<input type="date">` já produz), convertendo pra o formato esperado só
  na hora de montar o corpo da chamada — mesmo raciocínio, junto com os
  campos que têm `.default(...)` (`situacao`/`zonaVermelha`/`connect`, que
  ficam opcionais no tipo de "input" do form e obrigatórios no de "output"
  do `onSubmit`), resolvido com os 3 genéricos que `useForm`/
  `react-hook-form` 7.87 já suportam pra esse caso exato (schema com
  transformação/coerção/default), em vez de duplicar o schema à mão.

## Correções de QA (PR #26)

`docs/qa-fe-04-alunos.md` encontrou 6 achados. Os dois "Alto" eram o mesmo
problema de integridade de dados, na origem — a matrícula é o único lugar
onde aluno × matéria × professor × horário se cruzam, e nada impedia uma
combinação inválida:

- **Picker de professor não filtra pela disciplina — corrigido.**
  `MatriculaDraftCard` agora filtra `professores` por
  `professor.materiaIds.includes(draft.materiaId)` — sem chamada extra, o
  dado já vinha na prop (`ProfessorOutputType.materiaIds`, que já existia
  desde a fe-03). Trocar a disciplina limpa o professor selecionado se ele
  não lecionar a nova.
- **Programação semanal ignorava a disponibilidade do professor —
  corrigido.** `ProgramacaoSemanalGrid` ganhou uma prop `professor`
  opcional: linhas de dias fora de `diasDisponiveis` ficam desabilitadas
  (com "professor não atende" ao lado), e o input de horário ganha
  `min`/`max` da janela dele.
- **Backend: as duas validações cruzadas que faltavam, confirmadas e
  corrigidas.** `matriculas.service.ts` agora rejeita (400) um
  `professorId` que não lecione o `materiaId` da matrícula;
  `horarios.service.ts` agora rejeita (400) um horário fora do dia ou da
  janela de atendimento do professor da matrícula (`server/lib/horario.ts`,
  reaproveitando `janelaDeAtendimentoValida` e o novo
  `horarioDentroDaJanela` da fe-03). 5 novos testes e2e; 3 testes
  existentes precisaram vincular o professor de teste a uma matéria
  (`criarProfessor({ materiaIds: [...] })`, opção nova na factory) ou trocar
  um dia/horário fora da janela padrão do professor de teste.
- **`estagio` gravava `''` em vez de `null` — corrigido.** Trocado
  `input.estagio ?? null` por `input.estagio || null` em
  `matriculas.service.ts` — o form manda string vazia (não omite a chave),
  e só o segundo pega esse caso.
- **Contador ignorava a busca / sem estado vazio — corrigido.** Cabeçalho
  de `/alunos` mostra "N de M aluno(s)" quando a busca está ativa, e a
  lista ganhou "Nenhum aluno encontrado para «busca»."/"Nenhum aluno
  cadastrado ainda.".
- **`matricula-existing-card.tsx` não tratava erro de mutação** — já
  resolvido globalmente na fe-01 (`useApiMutation`); nada a mudar aqui.

**Divergência da decisão original do QA, documentada:** o achado sugeria
resolver isso via o "contexto global do snapshot" (o mesmo
`usePainelSnapshot` desta cadeia). Não segui esse caminho aqui: `/alunos`
já busca `listarProfessores`/`listarMaterias` diretamente, e
`ProfessorOutputType` já inclui `materiaIds` — os dados para a checagem já
estavam disponíveis, sem chamada extra, então trocar por um contexto
global só trocaria uma fonte de dados perfeitamente adequada por outra,
sem ganho. Pior: o snapshot do Painel busca **todas** as matérias (sem
filtrar `ativo`), enquanto `listarMaterias` (usado aqui) já exclui
inativas por padrão — migrar exigiria filtrar isso de novo no client. O
contexto criado na fe-01 continua de pé para quem realmente tem o
problema de fetch duplicado (Painel e Agenda, a partir da fe-05/fe-06).

## Pontos para revisão

- Visualmente verificado em browser real (Playwright/Chromium,
  `LOCAL_DEV_SERVER=true`): com "Bruno Lima" (só leciona Português,
  Ter/Qui 13h–19h) e "Ana Souza" (só Matemática, Seg/Qua/Sex 08h–18h) —
  escolher "Matemática" no picker de disciplina mostra só "Ana Souza"; ao
  escolher "Português" + "Bruno Lima", a grade desabilita Seg/Qua/Sex/Sáb
  com "professor não atende", e o input de horário de Ter/Qui vem com
  `min="13:00" max="19:00"`. `npm run typecheck`, `npm test` (114/114) e
  `npx vite build` passam limpos.
- `AlunoInspectorSheet` não é usado por nenhuma rota ainda — só existe
  pronto pra fe-06. Vale conferir se a interface que ele expõe
  (`alunoId`/`open`/`onOpenChange`/`professores`/`materias`/`onAtualizado`)
  já é o suficiente pro que a Agenda vai precisar, ou se algo precisa
  mudar quando chegar lá.
