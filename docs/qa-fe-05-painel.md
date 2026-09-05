# QA fe-05 — Painel (dashboard da unidade)

PR [#22](https://github.com/RubensRafael/kumon/pull/22) · doc de origem:
[`pr-fe-05-painel.md`](./pr-fe-05-painel.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** os números estão certos — conferi a ocupação na mão contra o
banco e bate. É a tela com a melhor relação entre esforço e resultado da
cadeia, porque tudo é derivado de um único snapshot. Os achados são de
leitura: um gráfico ilegível e alguns textos errados.

## Verificado funcionando

| Item | Resultado |
| ---- | --------- |
| Redirect | `/` → `/painel` ✅ |
| 4 cards de métrica | Alunos 5 · Matrículas Ativas 5 · Professores 3 · Ocupação 1.7% ✅ |
| 3 gráficos | Renderizam (3 `<svg class="recharts-surface">`) ✅ |
| Snapshot único | `GET /painel` devolve `{professores, alunos, materias, matriculas}`; todas as agregações saem daí, sem chamada extra ✅ |
| Extensões da fe-06 | `corAgenda`, `connect`, `estagio` presentes no payload ✅ |
| Alertas | Detecta corretamente a aluna marcada como zona vermelha ✅ |
| Distribuição por professor | Ana 4, Bruno 1; professor sem matrícula omitido ✅ |
| Aulas por dia | Seg 3, Sáb 3 — bate com os horários cadastrados ✅ |

### A conta da ocupação confere

Refiz o cálculo à mão contra os dados reais:

| Professor | Dias | Janela | Slots/dia (60 min) | Cap. | Total |
| --------- | :--: | ------ | :----------------: | :--: | ----: |
| Ana Souza | 5 | 08:00–18:00 | 10 | 6 | 300 |
| Bruno Lima | 2 | 13:00–19:00 | 6 | 4 | 48 |
| Teste Horario | 1 | 18:00–08:00 | **0** | 1 | 0 |
| | | | | | **348** |

6 horários ocupados / 348 = **1,724%** → exibido "1.7%". ✅

O zero da última linha é o `Math.max(0, ...)` de `capacidadeSemanal` fazendo
o trabalho dele: o professor com horário invertido (ver
[`qa-fe-03-professores.md`](./qa-fe-03-professores.md#1-horariofinal-menor-que-horarioinicial-é-aceito--alto))
produziria slots negativos e contaminaria o indicador da unidade inteira.
Vale registrar como acerto — é o tipo de guarda que costuma faltar.

## Achados

### 1. O donut "Matrículas por matéria" não tem legenda nem rótulo — Alto

O gráfico renderiza um **anel azul sólido, sem uma única palavra**. Não há
legenda, rótulo de fatia, nem tooltip visível — é impossível saber o que ele
representa. O card ao lado ("Distribuição por professor") tem o eixo X com
os nomes e é perfeitamente legível; o donut é o único dos três que não
comunica nada.

No cenário testado todas as 5 matrículas são de Matemática, então o anel é
de uma cor só — mas mesmo com várias matérias, sem legenda o usuário teria
fatias coloridas anônimas. Um `<ChartLegend />` do wrapper do shadcn, ou
`<ChartTooltip />`, fecha isso com poucas linhas.

**Decisão:** adicionar `<ChartLegend />` (ou `<ChartTooltip />`) ao donut,
mesmo padrão que o wrapper do shadcn já resolve nos outros gráficos.

### 2. Alerta com português quebrado — Médio

A mensagem exibida:

> Fernanda Dias **esta marcado** como zona vermelha.

Dois problemas: falta o acento em "está", e "marcado" não concorda com o
nome (e o sistema não tem como saber o gênero de ninguém). Uma formulação
neutra resolve os dois:

> Fernanda Dias está na zona vermelha.

É a única string do app que o usuário lê com o nome de uma pessoa dentro —
vale caprichar.

**Decisão:** trocar pela formulação neutra sugerida — "Fernanda Dias está
na zona vermelha." — sem depender de concordância de gênero.

### 3. Subtítulo do card não descreve a métrica — Médio

```
MATRÍCULAS ATIVAS
5
disciplinas ativas
```

O número é de matrículas; o subtítulo diz "disciplinas ativas" (que são 3, e
seriam 2 se contássemos só as com matrícula). Quem bate o olho lê o
subtítulo e conclui a coisa errada. "matrículas em curso" ou "vínculos
ativos".

**Decisão:** trocar o subtítulo para "matrículas em curso" (ou "vínculos
ativos"), coerente com o número exibido.

### 4. "Aulas por dia da semana" reserva uma coluna para domingo — Baixo

O eixo mostra `Dom · Seg · Ter · Qua · Qui · Sex · Sáb`, mas "Dom" nunca
poderá ter valor: o toggle de dias disponíveis do cadastro de professor
oferece só Seg–Sáb (decisão documentada na fe-03 — nenhuma unidade Kumon
abre aos domingos). É 1/7 da largura do gráfico permanentemente vazia.

**Decisão:** remover a coluna de domingo do eixo — o gráfico passa a
mostrar só Seg–Sáb, coerente com o que o cadastro de professor permite.

### 5. Eixo Y com ticks fracionários numa contagem — Baixo

Os dois gráficos de barra mostram `0 · 0.75 · 1.5 · 2.25 · 3`. O dado é
"número de aulas" — um inteiro; meia aula não existe. `allowDecimals={false}`
no `<YAxis>` do recharts resolve.

**Decisão:** aplicar `allowDecimals={false}` no `<YAxis>` dos dois
gráficos de barra.

## Diálogo com o doc da PR

- **"Cards de Reposições e Faltas na semana continuam de fora"** —
  confirmado. Decisão anterior à PR, sem impacto no que foi testado.
- **"`matriculasPorProfessor` segue o mesmo padrão de
  `matriculasPorMateria`"** — confirmado, e a ironia é que o gráfico
  *novo* (barras por professor) ficou legível e o *antigo* (donut por
  matéria) não. O item 1 é o que falta para os dois ficarem no mesmo nível.
- **"O bundle cresce de ~720KB pra ~1.09MB com a entrada do `recharts`"** —
  confirmado como ponto em aberto. Em rede local não incomodou, mas com o
  `recharts` sendo usado só nesta rota, um `React.lazy` no `PainelPage`
  tiraria ~370KB do carregamento inicial de todas as outras telas. Fica como
  sugestão, não como achado.
