# PR 03 — Professores

## O que foi implementado

Seção 2 da spec, completa:

- `src/shared/dto/enums.ts`: `DiaSemanaEnum` adicionado.
- `src/server/lib/validator.ts`: `validationErrorBody` extraído do hook do
  `zValidator` — necessário porque `PUT /professores/:id` escolhe o schema
  (completo vs. restrito) em runtime, algo que o `zValidator` padrão (schema
  fixo por rota) não suporta.
- `src/server/middlewares/restrict-professor-self.middleware.ts`: implementa
  o `restrictProfessorSelf` descrito na seção "Middlewares" do `plan.md` —
  só autoriza (`403` se professor editando registro alheio); a escolha de
  schema fica no handler.
- `src/server/features/professores/{professores.dto,professores.service,professores.routes}.ts`:
  os 4 endpoints da seção 2.
- 12 testes e2e em `tests/e2e/professores.e2e.test.ts`.
- `tests/helpers/auth.ts`: `obterCookie`/`authHeader`, extraídos para reuso —
  a partir daqui todo teste de rota protegida usa esses dois helpers em vez
  de repetir a chamada de login.
- `tests/helpers/factories.ts`: `criarMateria`, seed direto via Prisma (a
  feature de matérias só chega no PR 04, mas `POST /professores` já precisa
  de `materiaId`s válidos para testar).

## Decisões tomadas

- **`PUT /professores/:id` não usa `validate()`/`zValidator`.** É a primeira
  rota da API cujo schema de validação depende de quem está fazendo a
  chamada (admin → `ProfessorUpdateInputAdmin`, professor → `ProfessorUpdateInputSelf`),
  e o `zValidator` amarra um schema fixo na definição da rota. O handler faz
  `await c.req.json()` e escolhe o schema manualmente, reaproveitando
  `validationErrorBody` para devolver o mesmo formato de erro que qualquer
  outra rota validada. `restrictProfessorSelf` fica só com a parte de
  autorização (o `403` de editar registro alheio) — nunca decide schema.
- **`POST`/`PUT /professores` validam que cada `materiaId` existe, além de
  checar `ativo`.** A spec só menciona rejeitar matéria inativa; a checagem
  de existência evita um erro cru de constraint de FK do Postgres — mesmo
  raciocínio já registrado no PR 02 para `professorId` em `POST /usuarios`.
- **`GET /professores/:id` devolve `404` para id inexistente.** Não está
  escrito na seção 2 (que só fala da ausência de filtro de escopo), mas é o
  comportamento padrão de qualquer "buscar por id" no restante da spec.
- **`PUT /professores/:id` reconstrói o vínculo com matérias por completo**
  quando `materiaIds` vem no corpo (apaga todas as linhas de
  `ProfessorMateria` daquele professor e recria a partir da lista enviada),
  em vez de calcular um diff (adicionar só o que é novo, remover só o que
  saiu). Mais simples e correto por igual — a tabela de junção não carrega
  nenhum dado além das duas chaves — mas grava `criadoEm`/`atualizadoEm"
  novos para vínculos que, na prática, não mudaram.

## Pontos para revisão

- `ProfessorUpdateInputAdmin` é `ProfessorCreateInput.partial()`, incluindo
  `materiaIds`. `.partial()` só torna a chave opcional — não remove o
  `.min(1)` do array em si —, então `materiaIds: []` continua sendo
  rejeitado com `400` (coberto por teste). Ou seja: hoje não existe jeito de
  remover todos os vínculos de matéria de um professor por esta rota, só
  trocar por outro conjunto não-vazio. Deixando registrado porque não é óbvio
  à primeira vista e vale confirmar que esse é o comportamento desejado.

## Atualizações pós-revisão

Merge de `main` (PR 02 já revisado, ver `docs/pr-02-auth.md`) trazendo duas
mudanças que afetam esta branch diretamente, propagadas aqui:

- **`DiaSemanaEnum` uppercase**, mesma lógica do `PapelEnum` no PR 02:
  `['DOM', 'SEG', ...]` em vez de `['dom', 'seg', ...]`, sem camada de
  conversão. `professores.service.ts` perdeu o import de
  `paraApi`/`paraBanco` (`src/server/lib/db-enum.ts` foi removido no PR 02);
  `ProfessorComMaterias.diasDisponiveis` passou a usar o tipo `DiaSemana[]`
  gerado pelo Prisma direto, em vez de `string[]` com cast manual — mesmo
  padrão do `UsuarioRow.papel: Papel` em `auth.service.ts`. `'admin'`/`'professor'`
  literais em `professores.routes.ts` e `restrict-professor-self.middleware.ts`
  viraram `'ADMIN'`/`'PROFESSOR'`.
- **Autenticação via cookie, não Bearer.** `tests/helpers/auth.ts` (`obterToken`
  + `authHeader`) lia `body.token` do login e montava um header
  `Authorization: Bearer`; ambos pararam de existir (`LoginOutput` só tem
  `usuario`, `authMiddleware` lê o cookie `kflow_token`). Helper reescrito:
  `obterCookie` captura o `Set-Cookie` da resposta de login, `authHeader`
  agora monta `{ cookie }`. `tests/e2e/professores.e2e.test.ts` atualizado
  para o novo helper e para os literais de dia em maiúsculo.
