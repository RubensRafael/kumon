import type { AtividadeCasa, Autonomia, Boletim, Chegada, Comportamento, Desempenho, Foco } from './enums'

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

interface RegistroComNotas {
  chegada: Chegada | null
  boletim: Boletim | null
  atividadeCasa: AtividadeCasa | null
  foco: Foco | null
  autonomia: Autonomia | null
  comportamento: Comportamento | null
  desempenho: Desempenho | null
}

/** Falta e completo por definicao: nao ha nota nenhuma pra dar quando o aluno nao veio. */
export function isFalta(registro: Pick<RegistroComNotas, 'chegada'>): boolean {
  return registro.chegada === 'FALTOU'
}

/**
 * Sem `fechado`/`status` no backend -- "completo" e sempre calculado aqui, a
 * partir dos campos que a UI decidiu que sao necessarios pra fechar um
 * registro. Se um dia isso precisar de outra regra (ex.: nem toda nota
 * obrigatoria), muda só aqui, sem tocar em nenhuma rota. `anotacao` e
 * `conteudoIds` nunca entram nessa conta -- ficam sempre opcionais.
 */
export function isCompleto(registro: RegistroComNotas): boolean {
  if (registro.chegada === null) return false
  if (isFalta(registro)) return true

  return (
    registro.boletim !== null &&
    registro.atividadeCasa !== null &&
    registro.foco !== null &&
    registro.autonomia !== null &&
    registro.comportamento !== null &&
    registro.desempenho !== null
  )
}
