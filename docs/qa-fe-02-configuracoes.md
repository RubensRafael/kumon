# QA fe-02 — Configurações (aba Matérias e Conteúdos)

PR [#19](https://github.com/RubensRafael/kumon/pull/19) · doc de origem:
[`pr-fe-02-configuracoes.md`](./pr-fe-02-configuracoes.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** o CRUD funciona e o soft-delete se integra corretamente com o
resto do app — desativar uma matéria realmente a remove dos pickers das
outras telas, que era a parte não óbvia. O achado que pesa é a ausência de
unicidade em `Materia.nome`.

## Verificado funcionando

| Fluxo | Resultado |
| ----- | --------- |
| Abas | "Matérias e conteúdos" / "Usuários" ✅ |
| Criar matéria | Dialog fecha, lista atualiza, contador sobe ✅ |
| Accordion | Expande e carrega os conteúdos da matéria ✅ |
| Criar conteúdo inline | "Adição A", "Subtração B" criados e listados ✅ |
| Toggle ativo/inativo | `checked` → `unchecked`, persiste após reload ✅ |
| **Integração do soft-delete** | Desativei "Inglês"; o picker de matérias do cadastro de professor passou a oferecer só "Matemática" e "Português" ✅ |
| `incluirInativas=true` | A tela de admin continua listando a matéria desativada ✅ |
| Rota admin-only | Professor vê "Esta página é restrita a administradores." ✅ |

O ponto forte aqui é o terceiro item da segunda metade: a decisão de soft
delete não vazou para as telas de consumo. Isso costuma ser onde esse padrão
falha, e não falhou.

## Achados

### 1. Matéria duplicada é aceita em silêncio — Alto

Criei "Matemática", depois criei "Matemática" de novo. O segundo dialog
fechou normalmente, sem erro, e a lista passou a mostrar **duas** matérias
com o mesmo nome (contador: "4 matéria(s)").

Confirmado no banco:

```
                  id                  |    nome    | ativo
--------------------------------------+------------+-------
 66c7de6f-089d-4fde-a968-61a14ab4c233 | Matemática | t
 1694805d-aaae-4dfa-b4bf-ce186673e342 | Matemática | t
```

A causa está em `prisma/schema.prisma`: `Materia.nome` é `String` sem
`@unique`. Não é um bug de front — a UI não tem como impedir o que o banco
permite — mas é aqui que aparece.

O dano é a jusante e não é cosmético: os pickers de matrícula, o filtro
"Disciplina" da Agenda e o donut do Painel passam a mostrar duas entradas
idênticas e indistinguíveis. Um usuário que escolhe "a errada" cria uma
matrícula órfã de qualquer relatório agrupado pela outra.

Sugestão: `@unique` em `nome` (ou `@@unique([nome])` case-insensitive via
índice funcional) + tratamento do erro de constraint na UI. Mesma questão
provavelmente vale para `Conteudo.nome` dentro de uma matéria.

**Decisão:** não vale a pena arrumar agora. Criar issue para adicionar a
constraint/check no backend futuramente, quando o app virar multi-tenant.

### 2. Mensagem de validação crua do Zod, em inglês — Alto

Salvar com o nome vazio mostra, dentro do dialog:

> Too small: expected string to have >=1 characters

É o padrão que atravessa toda a cadeia — detalhado em
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md#2-mensagem-de-validação-crua-do-zod-em-inglês).
Registro aqui porque esta é a primeira tela onde ele aparece.

**Decisão:** o schema Zod é compartilhado entre front e back (`shared/dto/`),
então a correção deve ser um `z.config`/`errorMap` global em pt-BR, num
entry point comum que rode antes de qualquer uso do Zod no app — não um
ajuste por schema. Isso traduz os erros em todo lugar de uma vez, front e
back. Testar manualmente depois, em mais de uma tela, para garantir que o
entry point realmente é carregado antes de qualquer validação.

### 3. Erro de escrita não chega ao usuário — Alto

`materias-tab.tsx` e `conteudos-da-materia.tsx` chamam `useApiMutation` mas
nunca leem o `error` que ele expõe, e não têm `try/catch`. Se o `POST` ou o
`PUT` falhar (rede caindo, 500, constraint), o usuário não vê nada: o
dialog simplesmente não fecha, ou o switch volta sozinho, sem explicação.

Ver o [padrão consolidado](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave) —
a correção que vale a pena é dentro do próprio `useApiMutation`, não em cada
uma destas duas telas.

**Decisão:** corrigir. Não precisa necessariamente de `try/catch` em cada
componente, mas o erro tem que chegar ao usuário — com um fallback genérico
quando não houver mensagem específica do backend. Antes de mexer, verificar
se já existe algum padrão de desempacotamento de erro (na própria
`callApi`/`ApiError`, por exemplo); se existir, reaproveitar; se não
existir, criar um dentro do `useApiMutation` — o objetivo é que nenhum
componente precise extrair/tratar o erro por conta própria, e que os PRs que
hoje ignoram o `error` sejam todos atualizados para usar esse ponto único.
Esta decisão é geral o bastante para valer para toda a cadeia — anotada
também em
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave).

### 4. Item inativo não se distingue visualmente — Baixo

Uma matéria ou conteúdo desativado fica idêntico a um ativo na lista; a
única pista é a posição do switch. Numa lista com várias matérias, dá
trabalho localizar as inativas.

Um `text-muted-foreground` no nome, ou um badge "Inativa", já resolve — e
seria coerente com o `SITUACAO_ALUNO_LABEL`/badges que a fe-04 usa nos cards
de aluno.

**Decisão:** adicionar estilo (`text-muted-foreground` e/ou badge "Inativa")
para resolver.

## Diálogo com o doc da PR

- **"Conteúdos de cada matéria são buscados sempre, não só quando o
  accordion abre"** — confirmado, e sem impacto perceptível com o volume
  testado (3 matérias). O raciocínio de "poucas matérias por unidade" se
  sustenta; se um dia passar de ~20, vale revisitar.
- **"Sem confirmação antes de desativar"** — coerente na prática: o toggle
  é imediato e reversível, e reativar funcionou de primeira. A ressalva do
  item 4 acima é o complemento que falta: reverter é fácil, mas achar o que
  foi desativado por engano não é.
- **"Mesma limitação da fe-01 pra testar visualmente"** — fechado, ver o
  doc de visão geral.
