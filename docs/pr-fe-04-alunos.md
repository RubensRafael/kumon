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

## Pontos para revisão

- Mesma ressalva de verificação visual das PRs anteriores. `npm run
  typecheck`, `npm test` (109/109) e `npx vite build` passam limpos.
- `AlunoInspectorSheet` não é usado por nenhuma rota ainda — só existe
  pronto pra fe-06. Vale conferir se a interface que ele expõe
  (`alunoId`/`open`/`onOpenChange`/`professores`/`materias`/`onAtualizado`)
  já é o suficiente pro que a Agenda vai precisar, ou se algo precisa
  mudar quando chegar lá.
