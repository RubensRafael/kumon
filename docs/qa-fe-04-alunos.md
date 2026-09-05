# QA fe-04 — Alunos (cadastro completo)

PR [#21](https://github.com/RubensRafael/kumon/pull/21) · doc de origem:
[`pr-fe-04-alunos.md`](./pr-fe-04-alunos.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** o formulário mais complexo da cadeia, e o mais bem resolvido em
termos de fluxo — a criação em cascata (aluno → matrícula → horários) funciona
numa tacada só, e a edição de matrícula existente acerta exatamente quais
campos travar. É também, junto com a fe-03, o único lugar que trata erro de
mutação direito. Os dois achados altos são de **integridade de dados**: o
formulário deixa criar combinações que não deveriam existir.

## Verificado funcionando

| Fluxo | Resultado |
| ----- | --------- |
| Criar aluno + matrícula + horários | Uma submissão, tudo persistido ✅ |
| Cascata | `POST /alunos` → `POST .../matriculas` → `POST .../horarios` na ordem ✅ |
| Programação semanal | Ligar o switch de um dia habilita o input de horário daquele dia; os outros ficam `disabled` ✅ |
| Múltiplos dias | Diana com Seg 09:00 **e** Sáb 10:00 — ambos gravados ✅ |
| Edição | Dialog "Editar aluno" com dados pessoais, categorias e matrículas carregados ✅ |
| Matrícula existente read-only | `Matemática · Ana Souza Editada` como texto; só Situação (select) e Observações editáveis ✅ |
| Estágio vazio | Renderiza `—` em vez de vazio ✅ |
| Busca | Filtra por nome e por responsável ✅ |
| Badges | "Ativo", "Zona Vermelha", "Connect" nos cards ✅ |
| Escopo por papel | Professora vê 4 dos 5 alunos — o aluno do Bruno some ✅ |
| Tratamento de erro | `aluno-form.tsx` e `nova-matricula-form.tsx` **exibem** o erro da mutação ✅ |

O último item merece destaque: são 2 dos apenas 4 componentes da cadeia que
tratam falha de escrita. O padrão usado aqui é o que deveria valer para os
outros oito.

## Achados

### 1. O picker de professor não filtra pela disciplina escolhida — Alto

Numa matrícula com **Disciplina = Matemática**, o campo Professor ofereceu:

```
[ 'Ana Souza Editada', 'Bruno Lima', 'Teste Horario' ]
```

Bruno Lima leciona **só Português**. Escolhi ele mesmo assim, salvei, e
persistiu:

```
    aluno     |  materia   | professor  | diasDisponiveis
--------------+------------+------------+-----------------
 Carlos Aluno | Matemática | Bruno Lima | {TER,QUI}
```

O dado para filtrar já está carregado na tela — `professor.materiaIds`, que
o próprio card de professor usa para montar a linha de matérias. Filtrar a
lista por `professores.filter(p => p.materiaIds.includes(materiaId))` é
barato e elimina a combinação inválida na origem.

### 2. A programação semanal ignora a disponibilidade do professor — Alto

Na mesma matrícula, Bruno Lima trabalha **TER e QUI, das 13:00 às 19:00**.
O formulário deixou marcar **SEG às 08:00** — dia em que ele não atende, num
horário fora da janela dele. Gravado:

```
 diaSemana | horario | ativo
-----------+---------+-------
 SEG       | 08:00   | t
```

O efeito aparece na Agenda Geral, que passa a mostrar o aluno numa célula
que o professor nunca vai cumprir — sem nenhuma marcação de conflito. Ver
[`qa-fe-06-agenda.md`](./qa-fe-06-agenda.md#3-agenda-mostra-aluno-fora-da-disponibilidade-do-professor-sem-marcação--médio).

Os dois dados necessários também já estão na tela (`diasDisponiveis`,
`horarioInicial`, `horarioFinal`). O mínimo seria desabilitar as linhas dos
dias que o professor não atende e usar `min`/`max` nos inputs de horário.

Os itens 1 e 2 juntos são a mesma lacuna: a matrícula é o cruzamento de
aluno × matéria × professor × horário, e é a única tela onde essas quatro
dimensões se encontram. Se a validação cruzada não acontece aqui, não
acontece em lugar nenhum — e é justamente o tipo de "erro que a UI deveria
prevenir" que o `plan.md` cita e que esta PR aplicou tão bem nos campos
read-only da matrícula existente.

### 3. O contador ignora o filtro de busca — Médio

Com "zzzzz" na busca, o cabeçalho continua dizendo **"5 aluno(s)"** e o grid
fica vazio. `alunos.length` é usado no cabeçalho enquanto o grid renderiza
`alunosFiltrados`. Deveria usar `alunosFiltrados.length` (ou mostrar
"3 de 5") quando houver busca ativa.

### 4. Nenhuma mensagem quando a busca não retorna nada — Médio

O grid simplesmente some — nada distingue "não achei ninguém" de "ainda
carregando" ou "a tela quebrou". `alunosFiltrados.map(...)` não tem
fallback. Um "Nenhum aluno encontrado para «zzzzz»." resolve.

É o mesmo par contador-sem-filtro + sem-empty-state que o
`/acompanhamento` repete; a `/agenda-geral` acerta os dois e serve de
modelo. Ver a [visão geral](./qa-fe-00-visao-geral.md#3-contadores-e-estados-vazios).

### 5. Botão de editar sem nome acessível — Médio (a11y)

`aluno-card.tsx` repete o padrão de `professor-card.tsx`: botão só com o
ícone `<Pencil />`, sem `aria-label` nem `sr-only`. Ver
[`qa-fe-03-professores.md`](./qa-fe-03-professores.md#5-botão-de-editar-sem-nome-acessível--médio-a11y).

### 6. `estagio` grava string vazia em vez de `null` — Baixo

Criando a matrícula pela UI sem preencher Estágio, o banco recebe `''`; pela
API sem o campo, recebe `NULL`. `MatriculaOutput` declara
`estagio: z.string().nullable()`, então os dois passam — mas o filtro
"Estágio" da Agenda monta as opções a partir dos valores distintos, e uma
string vazia vira uma opção fantasma quando houver volume. Normalizar `''`
para `undefined` antes do envio.

### 7. `matricula-existing-card.tsx` não trata erro de mutação — Baixo

Diferente dos outros dois componentes do `aluno-form/`, este não lê o
`error` do `useApiMutation`. Como ele salva na hora (a situação e as
observações da matrícula existente), uma falha aí passa despercebida. Ver o
[padrão consolidado](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave).

## Diálogo com o doc da PR

- **"Se uma matrícula falhar no meio do caminho, o form vira modo edição"** —
  não consegui provocar a falha parcial num cenário realista (as matrículas
  válidas passaram todas). O caminho feliz da cascata está confirmado; esse
  ramo de recuperação segue não exercitado.
- **"Matrícula existente: `professorId`/`materiaId`/`tipoAtendimento`/
  `estagio` são só texto"** — confirmado em tela, e é a decisão mais
  acertada do formulário. Registro a ironia útil: o raciocínio ("oferecer um
  campo editável que o backend ignora é o tipo de erro que a UI deveria
  prevenir") é exatamente o argumento que falta ser aplicado aos itens 1 e
  2, onde a UI oferece combinações que o *domínio* deveria rejeitar.
- **"Trocar o horário de um dia já ativo desativa a linha antiga e cria uma
  nova"** — não exercitado nesta rodada; fica como cenário aberto.
- **"Lista de Alunos sem o resumo de matrícula do print"** — confirmado, e a
  justificativa do N+1 continua válida. O snapshot do Painel (fe-05) já
  entrega esse cruzamento pronto; quando quiserem o resumo no card, o dado
  está a uma chamada de distância.
- **"`AlunoInspectorSheet` não é usado por nenhuma rota ainda — vale
  conferir se a interface já é o suficiente pra fe-06"** — **sim, era.** A
  fe-06 pluga o componente sem alterações e ele abre corretamente a partir
  de um slot da agenda, com os dados do aluno certo.
