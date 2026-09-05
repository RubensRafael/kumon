# PR fe-07 — Acompanhamento

## O que foi implementado

- `registros.dto.ts` (plural — o arquivo de rota/schema da feature, distinto
  do `registro.dto.ts` singular que já morava em `shared/dto/` desde a PR 08
  do backend, com `isFalta`/`isCompleto`) movido pra `shared/dto/`;
  `listarRegistrosDoDia`, `buscarRegistro`, `criarRegistro`,
  `atualizarRegistro` registrados em `contract.ts`.
- **`contarNotasPreenchidas`/`statusRegistro`** novos em
  `shared/dto/registro.dto.ts`, ao lado de `isFalta`/`isCompleto` —
  derivam os 4 estados (Não iniciado/Pendente/Em andamento/Concluído) e o
  contador que alimenta a barra de progresso, 100% a partir do
  preenchimento dos campos, sem nenhuma mudança de backend. Cobertos por
  7 testes unitários novos em `tests/unit/registro.dto.test.ts`.
- **`/acompanhamento`**: paginação de data, chips de contagem por estado,
  busca por aluno, lista de horários do dia (`RegistroRow`) com botão
  "Registrar aula" ou "Ver acompanhamento" (quando concluído).
- **`RegistrarAulaDialog`**: um único dialog, divulgação progressiva
  controlada por `chegada` — só "Chegada" aparece até escolher; "Faltou"
  encerra ali; "Presente"/"Atrasado" revela Boletim → Atividade de casa →
  Foco/Autonomia/Comportamento → Desempenho → Conteúdos trabalhados →
  "+ Adicionar observação" → barra de progresso. Cada mudança salva
  sozinha (`POST` na primeira, `PUT` depois) e mostra o toast do `sonner`.

## Decisões tomadas

- **Read-only é decidido uma vez, ao abrir o dialog** (`eraCompletoAoAbrir`,
  capturado no `useState` inicial a partir do `resumo` recebido), não
  recalculado a cada mudança de campo durante a sessão. Preencher a 6ª nota
  agora, na sessão atual, não trava o formulário no meio do clique — o
  read-only só vale quando você **reabre** um registro que já chegou
  completo de fora (a régua exata que `plan.md` seção 7 documenta: "form
  fica read-only quando `isCompleto`" é sobre reabrir depois, não sobre
  travar no instante em que a última nota é preenchida).
- **"Finalizar aula" não chama nenhum endpoint** — só fecha o dialog (tudo
  já foi salvo campo a campo antes disso). Reabrir esse mesmo registro
  depois é que vem read-only, por causa da decisão acima.
- **"Ver acompanhamento" (linha concluída) abre o mesmo
  `RegistrarAulaDialog`, em modo leitura** — mostra o que foi registrado.
  A tela de estatísticas agregadas (`historico-acompanhamento-aluno.png`)
  é a fe-08, ainda não construída; isso aqui é só o que dava pra fazer sem
  o endpoint novo que aquela PR traz.
- **Barra de progresso só aparece com `chegada` PRESENTE/ATRASADO** — antes
  de escolher chegada não há o que progredir, e com FALTOU já é 100% por
  definição (`isFalta`), sem sentido mostrar uma barra parcial.

## Pontos para revisão

- Mesma ressalva de verificação visual das PRs anteriores. `npm run
  typecheck`, `npm test` (116/116, 7 novos) e `npx vite build` passam
  limpos.
