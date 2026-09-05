# QA fe-06 — Agenda (geral + individual)

PR [#23](https://github.com/RubensRafael/kumon/pull/23) · doc de origem:
[`pr-fe-06-agenda.md`](./pr-fe-06-agenda.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** a melhor tela da cadeia em termos de funcionamento. Testei os
seis filtros da agenda individual e todos respondem corretamente, a busca da
agenda geral recalcula as contagens por coluna (a única tela que acerta isso),
e o `AlunoInspectorSheet` da fe-04 plugou sem ajuste. O achado alto é um caso
de borda herdado da fe-03 que deixa a tela parecendo quebrada.

## Verificado funcionando

### `/agenda-geral`

| Item | Resultado |
| ---- | --------- |
| Colunas por professor | Nome + matérias + "N aluno(s)" no dia ✅ |
| Abas de dia | Seg–Sáb, trocam o conteúdo da grade ✅ |
| Grade | Slots de 30 min, `—` nas células vazias ✅ |
| Sábado | Eduardo 09:00, Diana e Fernanda 10:00 — bate com o banco ✅ |
| Busca | "Eduardo" filtra a grade **e** recalcula o cabeçalho para "1 aluno(s)" ✅ |
| Clique em slot ocupado | Abre o `AlunoInspectorSheet` com os dados do aluno certo ✅ |

A busca aqui é o comportamento correto que `/alunos` e `/acompanhamento`
não têm — o contador acompanha o filtro. Vale usar como referência ao
corrigir as outras duas.

### `/agenda`

| Item | Resultado |
| ---- | --------- |
| `?professorId=` | Respeitado; o seletor abre já no professor certo (vindo do card da fe-03) ✅ |
| Paginação de semana | `31/08 – 05/09` → `07/09 – 12/09`, pulando o domingo ✅ |
| Filtro Zona Vermelha | Só Fernanda Dias ✅ |
| Filtro Connect | Só Eduardo Ramos ✅ |
| Filtro Disciplina | Opções derivadas dos dados ("Matemática") ✅ |
| Filtro Estágio | Opções derivadas dos dados ("5A") ✅ |
| Regular + Pré-escolar juntos | Equivale a nenhum filtro, como documentado ✅ |
| Aluno com 2 horários | Diana aparece em Seg 09:00 **e** Sáb 10:00 ✅ |
| Cor por professor | `corAgenda` real do cadastro ✅ |

## Achados

### 1. `/agenda` sem querystring pode abrir numa grade vazia sem explicação — Alto

Entrando em `/agenda` direto pelo menu (sem `?professorId=`), a tela
selecionou "Teste Horario" — o professor com horário invertido 18:00–08:00
criado na fe-03. Resultado: o cabeçalho de dias renderiza normalmente e
**abaixo dele não há uma única linha**. Nenhuma mensagem, nenhum estado
vazio — a página parece quebrada.

`gerarSlotsHorario` recebe início 18:00 e fim 08:00 e devolve zero slots,
corretamente. O que falta é a tela dizer isso.

São dois problemas somados, e vale corrigir os dois:

- **A causa** é a validação ausente na fe-03 (ver
  [`qa-fe-03-professores.md`](./qa-fe-03-professores.md#1-horariofinal-menor-que-horarioinicial-é-aceito--alto)).
  Com o `.refine()` no schema, esse professor nunca existiria.
- **A defesa** é local: uma grade sem slots deveria mostrar "Este professor
  não tem janela de atendimento configurada" em vez de nada. Vale mesmo com
  a validação corrigida — a mesma tela vazia aparece para um professor sem
  dias marcados, por exemplo.

Vale também revisar qual professor é o padrão quando não vem querystring:
o primeiro da lista ordenada seria mais previsível do que o que saiu aqui.

**Decisão:** a Agenda já tem todos os dados brutos disponíveis (via o
contexto global do
[padrão 5 do md geral](./qa-fe-00-visao-geral.md#5-dados-brutos-do-snapshot-deveriam-ser-um-contexto-global-compartilhado)),
então ela não *precisa* depender de filtro na URL pra funcionar — mas como
ela usa querystring, o certo é suportar o estado sem filtro com um valor
padrão bem definido (não "o que calhar de vir primeiro na lista bruta",
que hoje é a causa raiz de ter caído no professor inválido:
`professorAtualId = professorId || painel?.professores[0]?.id || ''`, sem
nenhum critério de ordenação).

Isso é um caso específico de um problema mais geral do state management da
tela: hoje só `professorId` lê da URL, e só uma vez, no mount
(`useState(searchParams.get('professorId') ?? '')`) — os outros seis
filtros (Disciplina, Estágio, Connect, Zona Vermelha, Regular, Pré-escolar)
são `useState` local puro, nunca sincronizados com a URL. Um reload perde
todos eles. A decisão é tratar a URL como fonte de verdade de forma
consistente em **todos** os filtros — ao dar reload, cada filtro recupera o
que estiver na URL, ou cai num padrão definido para aquele filtro — e
parsear a URL de forma tipada: mesmo sendo tudo string em querystring, as
chaves esperadas devem estar centralizadas num único lugar (um schema ou um
objeto de chaves), não espalhadas em literais soltos pelo componente. Essa
decisão é geral o bastante pra valer além desta tela — anotada também em
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md#6-estado-de-filtro-na-url-deveria-ser-um-padrão-único-tipado).

### 2. Cabeçalho mistura abreviação e nome por extenso — Médio

As colunas da agenda individual saem assim:

```
Seg 31/08 · Ter 01/09 · Qua 02/09 · Qui 03/09 · Sex 04/09 · Sábado 05/09
```

Cinco abreviados e o sábado por extenso. Além de inconsistente, a coluna do
sábado fica mais larga que as outras. A agenda geral usa "Sáb" corretamente
nas abas — é só alinhar o formatador.

**Decisão:** só o rewording — trocar "Sábado" por "Sáb", igual às abas da
agenda geral.

### 3. Agenda mostra aluno fora da disponibilidade do professor, sem marcação — Médio

Na aba **Seg**, a coluna do **Bruno Lima** mostra "Carlos Aluno" às
**08:00**. Bruno atende **Ter e Qui, das 13:00 às 19:00** — ou seja, o slot
está fora do dia *e* fora da janela dele.

A origem é a fe-04, que deixou criar esse horário (ver
[`qa-fe-04-alunos.md`](./qa-fe-04-alunos.md#2-a-programação-semanal-ignora-a-disponibilidade-do-professor--alto)).
A Agenda é onde o problema fica visível para a coordenação, e hoje ela o
apresenta como um agendamento normal — mesma cor, mesmo tratamento.

Corrigido na origem, isso deixa de acontecer para dados novos. Para os
dados que já existem, um destaque na célula ("fora da disponibilidade") faria
a Agenda virar a rede de segurança em vez de esconder o problema.

**Decisão:** só o link pro fix de origem (mesma raiz do achado 2 da fe-04 —
contexto global + validação cruzada no backend). Uma vez corrigido lá, dado
inválido novo não entra mais; sem ação extra na Agenda por enquanto.

### 4. "Novo aluno" aparece para quem recebe 403 — Baixo

O botão está no cabeçalho da Agenda Geral e é exibido para o professor, que
recebe **403** ao tentar (`POST /alunos` é admin-only). Mesmo padrão do
"Novo professor" da fe-03 — e, como lá, o erro não gera nenhum feedback.
Condicionar a `papel === 'ADMIN'`.

**Decisão:** já coberto pelo padrão geral (ver
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md#4-ações-que-o-backend-recusa-aparecem-oferecidas-na-ui)).
Nada específico a fazer aqui além disso.

## Diálogo com o doc da PR

- **"A paginação de semana é só rótulo de data, não muda quais células
  aparecem ocupadas"** — confirmado em teste: avançar para `07/09 – 12/09`
  mantém exatamente os mesmos alunos nas mesmas células. A explicação
  (`MatriculaHorario` é um template recorrente, sem data) está correta e o
  comportamento é coerente com o schema.
  Fica o registro de UX: um usuário que navega três semanas à frente e vê a
  grade idêntica não tem como saber que é assim de propósito. Uma nota
  discreta — "programação semanal recorrente" — perto do seletor de semana
  economizaria a dúvida. Não é bug.
- **"Toggles Regular/Pré-escolar são dois estados do mesmo campo"** —
  confirmado: com os dois ligados a lista volta a mostrar todos os alunos,
  como o doc previa.
- **"Botão Novo aluno da Agenda Geral só navega pra /alunos"** — confirmado.
  Ver item 4 quanto à visibilidade por papel.
- **"`AlunoInspectorSheet` passa a ser usado de verdade"** — funciona. A
  pergunta que a fe-04 deixou em aberto ("a interface que ele expõe já é o
  suficiente pro que a Agenda vai precisar?") pode ser fechada com **sim**:
  nenhuma mudança foi necessária.
