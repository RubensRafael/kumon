/**
 * Sentinela usado no lugar de um uuid real em `RegistroResumoOutput.id`/
 * `RegistroDetalheOutput.id` quando a linha e "virtual".
 *
 * `GET /registros?data=X` sempre lista um item por `MatriculaHorario` ativo
 * naquele dia da semana, mesmo que ninguem tenha criado o `RegistroAula`
 * ainda (isso so acontece em `POST /registros`). Quando isso acontece, a
 * linha devolvida nao existe no banco -- e montada so a partir do horario
 * fixo. Este valor no lugar do id deixa essa distincao explicita (em vez de
 * um `null` generico, que nao diz o motivo): o front usa isso pra saber que
 * agir sobre esse item precisa de `POST /registros` (criar), nao
 * `PUT`/`GET /registros/:id` (que assumem uma linha ja existente).
 */
export const VIRTUAL_REGISTRO_ID = 'virtual'
