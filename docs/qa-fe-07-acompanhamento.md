# QA fe-07 — Acompanhamento (lista diária + registrar aula)

PR [#24](https://github.com/RubensRafael/kumon/pull/24) · doc de origem:
[`pr-fe-07-acompanhamento.md`](./pr-fe-07-acompanhamento.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** a divulgação progressiva funciona muito bem e o read-only ao
reabrir um registro concluído é a implementação mais rigorosa da cadeia — 26
controles desabilitados, sem uma brecha. Mas o autosave campo a campo, que é
o coração desta tela, **perde dados em silêncio quando uma requisição falha**.
É o único achado crítico do teste inteiro. Decisão tomada no achado 1: o
autosave sai por completo, substituído por um fluxo de duas escritas
explícitas (Chegada + Enviar) — ver detalhes lá.

## Verificado funcionando

| Fluxo | Resultado |
| ----- | --------- |
| Lista do dia | 3 aulas de sábado, ordenadas por horário ✅ |
| Chips por estado | "Não iniciado / Pendente / Em andamento / Concluído" ✅ |
| Divulgação progressiva | Só "Chegada" até escolher; PRESENTE revela Boletim → Atividade → Foco/Autonomia/Comportamento → Desempenho → Conteúdos → observação ✅ |
| FALTOU | Encerra ali, sem revelar mais nada; linha vira "Concluído" ✅ |
| Autosave (caminho feliz) | `POST` na primeira mudança, `PUT` nas seguintes, com toast do `sonner` ✅ |
| Progresso | `0/6` → `1/6` → ... → `5/6` → **"100% concluído"** ✅ |
| Barra de progresso | Só aparece com PRESENTE/ATRASADO, como o doc descreve ✅ |
| Conteúdos trabalhados | Toggle `off` → `on`, gravado em `registro_aula_conteudo` ✅ |
| Observação | Salva no blur, persiste ✅ |
| **Read-only ao reabrir** | 26/26 radios `disabled`, textarea `disabled`, botão vira "Fechar" ✅ |
| Read-only à prova de força | Clique forçado num radio não alterou nada ✅ |
| "Ver acompanhamento" | Linha concluída abre o mesmo dialog em leitura, com tudo preenchido ✅ |
| Paginação de data | Navega dia a dia e aceita data digitada ✅ |
| Busca | Filtra as linhas por aluno ✅ |
| Integridade | `UNIQUE (horarioId, data)` impede registro duplicado ✅ |

Persistência conferida direto no banco após o preenchimento completo:

```
    data    |     nome      | chegada  |  boletim  |  atividadeCasa   |  foco   | autonomia | comportamento |       desempenho
------------+---------------+----------+-----------+------------------+---------+-----------+---------------+------------------------
 2026-09-05 | Eduardo Ramos | PRESENTE | NAO_PEGOU | FEZ_PARCIALMENTE | REGULAR | REGULAR   | OSCILOU       | APRESENTOU_DIFICULDADE
 2026-09-05 | Fernanda Dias | FALTOU   |           |                  |         |           |               |
```

## Achados

### 1. 🔴 Falha no autosave é invisível e o dado se perde — CRÍTICO

**Reprodução.** Abri um registro pendente e interceptei o `PUT
/api/registros/:id` para responder **500** (simulando queda de rede ou erro
do servidor). Marquei "Boletim = Pegou". O que aconteceu:

| Onde | O que mostrou |
| ---- | ------------- |
| Opção "Pegou" | Marcada, visualmente selecionada |
| Barra de progresso | Avançou de `0/6` para **`1/6 notas`** |
| Toast | **Nenhum** |
| Mensagem de erro | **Nenhuma** |
| Console | `ApiError: Falha simulada` — **não capturada** |

E no banco, depois de tudo isso:

```
    nome     | chegada  | boletim
-------------+----------+---------
 Diana Alves | PRESENTE |
```

`boletim` está **NULL**. A tela informou progresso de um dado que nunca foi
gravado.

**Causa.** Em `registrar-aula-dialog.tsx`, o estado local é atualizado antes
do `await`, e a chamada não tem `try/catch` nem lê o `error` do
`useApiMutation`:

```ts
async function aoMudarChegada(novo: Chegada) {
  if (readOnly || !resumo) return
  setChegada(novo)                 // UI atualiza primeiro...
  // ...
  await atualizar({ ... })         // ...e se isto falhar, ninguém fica sabendo
  avisarSalvo()
  onSalvo()
}

async function salvarCampo(patch: Record<string, unknown>) {
  if (readOnly || !registroId) return
  await atualizar({ params: { id: registroId }, body: patch })   // idem
  avisarSalvo()
  onSalvo()
}
```

**Por que é crítico aqui e não nas outras telas.** Nos outros sete
componentes com o mesmo padrão (ver
[visão geral](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave)),
o usuário percebe que algo deu errado — o dialog não fecha, a lista não
atualiza. Aqui não: o *design* da tela é "salva sozinho, pode ir embora". O
professor preenche as 6 notas, vê "100% concluído", clica em "Finalizar
aula" (que por decisão documentada não chama endpoint nenhum) e vai para a
próxima aula. Só descobre a perda dias depois, se descobrir. É perda
silenciosa de trabalho já feito, no fluxo mais usado do produto.

**Correção sugerida** (patch pontual, ficou obsoleta com a decisão abaixo):

1. `try/catch` em `aoMudarChegada` e `salvarCampo`, com `toast.error` — não
   pode falhar sem avisar.
2. Reverter o estado local quando a chamada falha, para a tela não mostrar
   um valor que não existe.
3. Idealmente, um indicador de "salvando… / salvo / **erro ao salvar**" fixo
   no dialog, em vez de um toast que some — é a única garantia visual num
   formulário sem botão de salvar.

**Decisão: remover o autosave, não só corrigir o erro dele.** Fluxo novo,
em duas fases:

- **Fase 1 — Chegada.** Continua sendo o único campo visível até o
  professor escolher — nenhum outro aparece antes disso. O clique cria o
  registro na hora (`POST`), com os botões em estado de loading/desabilitado
  enquanto a chamada está em voo. Se **FALTOU**, o dialog fecha assim que o
  `POST` resolver. Se **PRESENTE/ATRASADO**, o dialog permanece aberto e
  revela o resto do formulário — mesma divulgação progressiva de hoje.
- **Fase 2 — os demais campos.** Cada campo parte do valor que já existe no
  registro (reabertura) ou vazio (registro novo) — **sem chamada de rede por
  campo**. Tudo fica em estado local até o clique em **"Enviar"** (renomeia
  "Finalizar aula" — o nome atual mentia sobre o que o botão faz). Esse
  clique dispara **um único `PUT`**, com todos os campos preenchidos até
  ali, e só fecha o dialog se a chamada tiver sucesso.

Isso não é autosave — é só permitir que o professor não precise ter as 6
notas completas de uma vez antes de poder registrar algo: o registro nasce
cedo (na Chegada) e o resto pode ficar parcial (Pendente/Em andamento) até o
clique em "Enviar", que é sempre uma ação explícita — nunca um efeito
colateral de preencher um campo. A causa raiz do achado desaparece porque
não existe mais um estado local "avançando progresso" independente de uma
escrita confirmada: só há duas escritas (a da Chegada e a do Enviar), e as
duas são síncronas com o fechamento do dialog.

O que continua valendo do padrão geral: o `POST` da Fase 1 e o `PUT` da Fase
2 precisam de tratamento de erro de verdade — nenhum dos dois tem hoje. Se
qualquer um falhar, o dialog não fecha e o erro aparece (fallback genérico),
seguindo a decisão já registrada em
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md#1-erro-de-mutação-engolido-o-mais-grave).

Depois de fechar, a lista (chips + estado da linha) atualiza via
**refetch** — não precisa aproveitar o estado local do dialog pra isso; o
servidor já é a fonte da verdade assim que a escrita confirma. O cálculo de
"quanto falta" (barra/texto de progresso) continua usando os helpers que já
existem (`contarNotasPreenchidas`, `statusRegistro`, `isFalta`, `isCompleto`
em `shared/dto/registro.dto.ts`) — sem lógica nova, só reaproveitar.

### 2. Aceita registrar aula em data futura — Alto

Naveguei para **14/12/2026** (mais de três meses à frente), a lista trouxe as
aulas recorrentes daquela segunda, e consegui marcar "Presente" normalmente
— sem aviso, sem confirmação, sem diferença visual em relação a hoje.

Registrar presença numa aula que ainda não aconteceu não faz sentido no
domínio, e a tela não oferece nenhuma barreira. As opções, da mais leve para
a mais forte: um aviso visual quando a data selecionada é futura; um
`max={hoje}` no input de data; ou bloquear a criação de registro no backend
para `data > hoje`. Navegar para o futuro *em leitura* é útil (ver quem tem
aula na semana que vem) — o que não deveria ser possível é escrever.

**Decisão:** bloquear só no front. Navegar pra uma data futura continua
liberado (é útil pra ver a programação da semana que vem); o que trava é a
escrita — desabilitar "Registrar aula" (e, na Fase 1 do achado 1, o próprio
clique em Chegada) quando a data selecionada é depois de hoje. Sem mudança
no backend.

### 3. Os chips de contagem ignoram a busca — Médio

Com "Gabriel" na busca, a lista mostra **1 linha** e os chips continuam
dizendo **"3 Não iniciado"**. Mesmo padrão de `/alunos`; a `/agenda-geral`
faz certo. Ver a
[visão geral](./qa-fe-00-visao-geral.md#3-contadores-e-estados-vazios).

**Decisão:** já coberto pelo padrão geral. Nada específico a fazer aqui
além disso.

### 4. Nenhum estado vazio — Médio

Dois cenários mostram só os chips e mais nada abaixo:

- **Dia sem aulas** (sexta, 04/09): `0 Não iniciado · 0 Pendente · 0 Em
  andamento · 0 Concluído` e o vazio.
- **Busca sem resultado**: chips com os números do dia e nenhuma linha.

Faltam "Nenhuma aula neste dia." e "Nenhum aluno encontrado.". O primeiro é
o mais importante — dias sem aula são rotina, e hoje a tela fica ambígua
entre "não há aulas" e "não carregou".

**Decisão:** já coberto pelo padrão geral. Nada específico a fazer aqui
além disso.

### 5. Warning do React em toda abertura do dialog — Médio

```
ToggleGroup is changing from uncontrolled to controlled.
Components should not switch from controlled to uncontrolled (or vice versa).
```

Dispara sempre que o dialog abre. A causa típica é o `value` do
`ToggleGroup` começar `undefined` (registro ainda não carregado) e virar
string depois. Além do ruído no console, esse padrão é conhecido por fazer o
Radix perder o estado interno em re-render — e num formulário que salva
sozinho, um reset silencioso de campo seria difícil de rastrear. Usar `''`
como valor inicial em vez de `undefined` resolve.

(O dialog de novo usuário da fe-03 tem o equivalente com `Select`.)

**Decisão:** corrigir — é simples (trocar o valor inicial por `''`). Se
depois de tentar precisar de mais que isso, deixar pra lá.

### 6. "Comportamento" nomeia a seção e um campo dentro dela — Baixo

A estrutura do formulário sai assim:

```
Comportamento          ← seção
  Foco
  Autonomia
  Comportamento        ← campo
Desempenho na aula
```

Ler "Comportamento > Comportamento" confunde, e na hora de conferir um
registro preenchido fica difícil saber a qual dos dois alguém se refere.
Renomear a seção (algo como "Postura em aula") separa os dois.

**Decisão:** corrigir — renomear a seção para "Postura em aula" (ou
equivalente), mantendo o campo "Comportamento" como está.

### 7. O contador "0/6 notas" aparece antes de escolher a chegada — Baixo

A barra de progresso é corretamente escondida até PRESENTE/ATRASADO — a
decisão documentada foi implementada. Mas o **texto** "0/6 notas" aparece já
no dialog recém-aberto, quando ainda não há nada para progredir. É o mesmo
raciocínio do doc aplicado pela metade; o texto deveria seguir a mesma
condição da barra.

**Decisão:** corrigir — o texto passa a seguir a mesma condição de
visibilidade da barra (só aparece com PRESENTE/ATRASADO). Continua valendo
igual com o redesenho do achado 1.

## Diálogo com o doc da PR

- **"Read-only é decidido uma vez, ao abrir o dialog"** — confirmado, e a
  régua está certa: preencher a 6ª nota não travou o formulário no meio do
  clique, e reabrir depois trouxe tudo bloqueado. Verifiquei os 26 controles
  um a um, além do `textarea` e do botão (que vira "Fechar"). Nenhuma
  brecha.
- **"'Finalizar aula' não chama nenhum endpoint"** — confirmado. Faz sentido
  dado o autosave, **mas é justamente o que agrava o achado 1**: o botão que
  o usuário lê como "confirmar" não verifica nada. Se algum campo falhou em
  salvar, "Finalizar aula" fecha o dialog por cima do erro. Superado pela
  decisão do achado 1: sem autosave, o botão (renomeado "Enviar") passa a
  ser exatamente isso — o único ponto que escreve os campos da Fase 2, e só
  fecha o dialog se a escrita confirmar.
- **"'Ver acompanhamento' abre o mesmo dialog em modo leitura"** —
  confirmado, com os dados corretos.
- **"Barra de progresso só aparece com chegada PRESENTE/ATRASADO"** —
  confirmado para a barra; ver achado 7 para o texto.
- **"`contarNotasPreenchidas`/`statusRegistro` cobertos por 7 testes novos"**
  — `npm test` passou **116/116**, batendo com o número do doc. Os 4 estados
  derivados apareceram corretamente na lista durante todo o teste.
