# QA fe-03 — Professores (+ aba Usuários em Configurações)

PR [#20](https://github.com/RubensRafael/kumon/pull/20) · doc de origem:
[`pr-fe-03-professores.md`](./pr-fe-03-professores.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** o CRUD funciona bem e a edição restaura o estado com fidelidade
(matérias e dias marcados voltam certos). Três achados altos: falta a
validação cruzada de horários, o erro de escrita é invisível, e a UI oferece
ao professor ações que o backend recusa.

## Verificado funcionando

| Fluxo | Resultado |
| ----- | --------- |
| Criar professor | "Ana Souza" (Matemática, Seg–Sex, 08:00–18:00, cap. 6) e "Bruno Lima" (Português, Ter/Qui, 13:00–19:00, cap. 4) ✅ |
| Editar | Dialog abre com **todos** os campos preenchidos e os toggles corretos: `[Matemática, Seg, Ter, Qua, Qui, Sex]` ✅ |
| Salvar edição | Nome atualizado na lista imediatamente ✅ |
| Picker de matérias | Só oferece matérias ativas (Inglês, desativada na fe-02, não aparece) ✅ |
| Dias disponíveis | Seg–Sáb, sem domingo, como o doc descreve ✅ |
| Link "Agenda" | `/agenda?professorId=<uuid>` correto nos 3 cards ✅ |
| Aba Usuários | Tabela com nome/email/papel/ativo ✅ |
| Papel = Professor | Revela o picker de professor vinculado ✅ |
| Criar usuário | "Ana Professora" / `ana@kflow.local` / Professor ✅ |
| `ProfessorFormSelf` | Professor editando o **próprio** card vê só Telefone / Email / Observações ✅ |
| Backend | `POST /professores` como professor → 403 ✅ |

## Achados

### 1. `horarioFinal` menor que `horarioInicial` é aceito — Alto

Criei um professor com **início 18:00 e fim 08:00**. O dialog fechou sem
reclamar e o card mostra, em produção:

> Teste Horario · Matemática · CAP./HORÁRIO 1 · DIAS 1 · **18:00–08:00**

`ProfessorCreateInput` (`shared/dto/professores.dto.ts`) valida cada horário
isoladamente com `HorarioDoDia`, mas não tem nenhum `.refine()` cruzando os
dois.

O que torna isso alto e não médio é a cascata — esse único registro
inválido degrada duas telas a jusante:

- **Agenda** (`/agenda`): `gerarSlotsHorario` produz zero linhas, e a página
  renderiza um cabeçalho de dias sobre o vazio absoluto. Detalhado em
  [`qa-fe-06-agenda.md`](./qa-fe-06-agenda.md#1-agenda-sem-querystring-pode-abrir-numa-grade-vazia-sem-explicação--alto).
- **Painel**: `capacidadeSemanal` calcula slots negativos. Aqui o
  `Math.max(0, ...)` de `painel.dto.ts` segura o golpe — a capacidade vira 0
  em vez de poluir a ocupação. Bom código defensivo, vale registrar.

Correção: `.refine((v) => v.horarioFinal > v.horarioInicial, { message:
'O horário final deve ser depois do inicial', path: ['horarioFinal'] })` no
schema — pega backend e formulário de uma vez.

### 2. Falha de escrita não produz nenhum feedback — Alto

Logado como professora (não-admin), abri "Novo professor", preenchi e cliquei
em Salvar. O backend respondeu **403** corretamente. Na tela:

- o dialog continuou aberto, com o formulário preenchido;
- nenhum toast, nenhuma mensagem inline, nada mudou visualmente;
- no console, uma `ApiError: Apenas administradores podem acessar este
  recurso.` **não capturada** (unhandled rejection).

Do ponto de vista do usuário, o botão Salvar simplesmente não faz nada. Ele
vai clicar de novo.

`professor-form-full.tsx` desestrutura só `{ mutate, loading }` do
`useApiMutation` — nunca lê o `error` — e o `onSubmit` não tem `try/catch`.
`professor-form-self.tsx` tem o mesmo problema. Ver o
[padrão consolidado](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave).

### 3. A UI oferece ao professor ações que o backend recusa — Alto

Duas situações, mesma raiz:

**a) Botão "Novo professor" visível para não-admin.** Leva ao 403 silencioso
do item 2. A rota `/professores` não é `adminOnly`, e faz sentido que não
seja — o professor precisa ver a equipe. Mas o botão de criação devia ser
condicional a `usuario?.papel === 'ADMIN'`, como a sidebar já faz com
"Configurações".

**b) Editar o cadastro de OUTRO professor abre o formulário completo.**
Logada como Ana, abri o card do Bruno Lima e recebi o `ProfessorFormFull`:

```
Nome · Telefone · Email · Matérias · Dias disponíveis ·
Horário inicial · Horário final · Capacidade por horário · Cor da agenda
```

Editando o próprio card, ela vê corretamente só `Telefone · Email ·
Observações`. A condição em `professor-form-dialog.tsx` é:

```ts
const ehAutoEdicao = Boolean(professor)
  && usuario?.papel === 'PROFESSOR'
  && usuario.professorId === professor?.id
```

O `else` dessa expressão cobre dois casos muito diferentes: "admin editando
qualquer um" e "professor editando outra pessoa". O segundo devia ser
bloqueado — o backend recusa, então a UI está oferecendo um formulário
inteiro que nunca vai salvar. É exatamente o "erro que a UI deveria
prevenir" que o `plan.md` descreve, e que a própria fe-04 aplicou bem nos
campos read-only da matrícula.

### 4. Validação inconsistente entre campos — Médio

Três comportamentos diferentes no mesmo formulário:

| Campo | Como o erro aparece |
| ----- | ------------------- |
| Nome, Matérias, Dias | Mensagem inline (em inglês, do Zod) |
| Email | Só o balão nativo do browser: *"Please include an '@' in the email address"* |
| Capacidade (`min={1}`) | Só o balão nativo, e nada mais acontece |

No caso da capacidade o efeito é ruim: coloquei `0`, cliquei em Salvar, e o
dialog ficou aberto **sem nenhuma mensagem visível** — o balão nativo é
fácil de perder, e o formulário parece travado. Padronizar tudo em
`FormMessage` (removendo `type="email"`/`min` como única defesa, ou
adicionando `noValidate` no form e deixando o Zod responder) deixa o
comportamento previsível.

### 5. Botão de editar sem nome acessível — Médio (a11y)

O botão do lápis é `<Button variant="ghost" size="icon-sm">` com só o
`<Pencil />` dentro — sem `aria-label`, sem texto `sr-only`. Varri o grid e
encontrei **3 botões sem nome acessível** (um por card). Um leitor de tela
anuncia apenas "botão".

Mesmo padrão em `aluno-card.tsx` (fe-04). Um `<span className="sr-only">Editar
professor</span>` em cada resolve os dois.

### 6. Card mostra a contagem de dias, não os dias — Baixo

O card exibe "DIAS: 5". Saber *quais* dias (Seg·Ter·Qua·Qui·Sex) é a
informação útil para quem está montando a grade, e o dado já está em
`professor.diasDisponiveis`. Os chips caberiam no lugar do número.

### 7. Usuário novo nasce sem senha utilizável e a UI não avisa — Baixo

Todo usuário criado por `POST /usuarios` recebe `SENHA_PLACEHOLDER` e não
consegue logar até passar pelo reset — comportamento correto e bem
documentado em `src/server/lib/senha.ts`. Mas o dialog fecha sem dizer nada
disso.

O admin acabou de criar um acesso e não tem como saber que precisa avisar a
pessoa a usar "Esqueci minha senha". Um toast — *"Usuário criado. Ele
precisa definir a senha em 'Esqueci minha senha' antes do primeiro
acesso."* — fecha a lacuna.

## Diálogo com o doc da PR

- **"Sem contagem de Alunos no card"** — a justificativa (dado vem de
  matrícula, que só existe na fe-04) fazia sentido na época. Agora que o
  Painel existe e já cruza tudo, o card tem de onde tirar o número; vale
  reconsiderar quando houver folga.
- **"Toggle não oferece Domingo"** — confirmado, 6 botões (Seg–Sáb).
  Consequência colateral: o gráfico "Aulas por dia da semana" do Painel
  reserva uma coluna "Dom" que nunca poderá ter valor. Ver
  [`qa-fe-05-painel.md`](./qa-fe-05-painel.md).
- **"`ProfessorFormFull` usa o schema cheio pra criar e editar"** —
  confirmado em teste: a edição abre com tudo preenchido e o `PUT` com corpo
  completo funciona. A decisão se sustenta; o furo não está nela, e sim em
  *quem* recebe esse formulário (item 3b).
- **"Edição de papel não tem UI"** — confirmado, só o toggle de `ativo` na
  tabela. Sem impacto nos fluxos testados.
