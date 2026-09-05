# QA fe-07 — Acompanhamento (lista diária + registrar aula)

PR [#24](https://github.com/RubensRafael/kumon/pull/24) · doc de origem:
[`pr-fe-07-acompanhamento.md`](./pr-fe-07-acompanhamento.md) · método:
[`qa-fe-00-visao-geral.md`](./qa-fe-00-visao-geral.md)

**Veredito:** a divulgação progressiva funciona muito bem e o read-only ao
reabrir um registro concluído é a implementação mais rigorosa da cadeia — 26
controles desabilitados, sem uma brecha. Mas o autosave campo a campo, que é
o coração desta tela, **perde dados em silêncio quando uma requisição falha**.
É o único achado crítico do teste inteiro.

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

**Correção sugerida**, em ordem de prioridade:

1. `try/catch` em `aoMudarChegada` e `salvarCampo`, com `toast.error` — não
   pode falhar sem avisar.
2. Reverter o estado local quando a chamada falha, para a tela não mostrar
   um valor que não existe.
3. Idealmente, um indicador de "salvando… / salvo / **erro ao salvar**" fixo
   no dialog, em vez de um toast que some — é a única garantia visual num
   formulário sem botão de salvar.

O item 1 sozinho já tira isso do crítico.

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

### 3. Os chips de contagem ignoram a busca — Médio

Com "Gabriel" na busca, a lista mostra **1 linha** e os chips continuam
dizendo **"3 Não iniciado"**. Mesmo padrão de `/alunos`; a `/agenda-geral`
faz certo. Ver a
[visão geral](./qa-fe-00-visao-geral.md#3-contadores-e-estados-vazios).

### 4. Nenhum estado vazio — Médio

Dois cenários mostram só os chips e mais nada abaixo:

- **Dia sem aulas** (sexta, 04/09): `0 Não iniciado · 0 Pendente · 0 Em
  andamento · 0 Concluído` e o vazio.
- **Busca sem resultado**: chips com os números do dia e nenhuma linha.

Faltam "Nenhuma aula neste dia." e "Nenhum aluno encontrado.". O primeiro é
o mais importante — dias sem aula são rotina, e hoje a tela fica ambígua
entre "não há aulas" e "não carregou".

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

### 7. O contador "0/6 notas" aparece antes de escolher a chegada — Baixo

A barra de progresso é corretamente escondida até PRESENTE/ATRASADO — a
decisão documentada foi implementada. Mas o **texto** "0/6 notas" aparece já
no dialog recém-aberto, quando ainda não há nada para progredir. É o mesmo
raciocínio do doc aplicado pela metade; o texto deveria seguir a mesma
condição da barra.

## Diálogo com o doc da PR

- **"Read-only é decidido uma vez, ao abrir o dialog"** — confirmado, e a
  régua está certa: preencher a 6ª nota não travou o formulário no meio do
  clique, e reabrir depois trouxe tudo bloqueado. Verifiquei os 26 controles
  um a um, além do `textarea` e do botão (que vira "Fechar"). Nenhuma
  brecha.
- **"'Finalizar aula' não chama nenhum endpoint"** — confirmado. Faz sentido
  dado o autosave, **mas é justamente o que agrava o achado 1**: o botão que
  o usuário lê como "confirmar" não verifica nada. Se algum campo falhou em
  salvar, "Finalizar aula" fecha o dialog por cima do erro. Uma checagem de
  consistência nesse clique (ou o indicador de estado do achado 1) seria o
  contrapeso natural dessa decisão.
- **"'Ver acompanhamento' abre o mesmo dialog em modo leitura"** —
  confirmado, com os dados corretos.
- **"Barra de progresso só aparece com chegada PRESENTE/ATRASADO"** —
  confirmado para a barra; ver achado 7 para o texto.
- **"`contarNotasPreenchidas`/`statusRegistro` cobertos por 7 testes novos"**
  — `npm test` passou **116/116**, batendo com o número do doc. Os 4 estados
  derivados apareceram corretamente na lista durante todo o teste.
