/**
 * Sem "Dom" de propósito — nenhuma unidade Kumon funciona aos domingos (ver
 * docs/pr-fe-03-professores.md). `DiaSemana` continua aceitando `DOM` no
 * schema; só não é oferecido em nenhuma tela.
 *
 * Segunda página a precisar do mesmo mapeamento (a primeira foi o toggle de
 * disponibilidade do Professor, fe-03) — por isso migrou pra `common/`.
 */
export const DIAS_SEMANA = [
  { valor: 'SEG', label: 'Seg' },
  { valor: 'TER', label: 'Ter' },
  { valor: 'QUA', label: 'Qua' },
  { valor: 'QUI', label: 'Qui' },
  { valor: 'SEX', label: 'Sex' },
  { valor: 'SAB', label: 'Sáb' },
] as const

/**
 * Colunas das grades da Agenda (individual e Geral) -- sem Sábado, raro
 * o bastante pra não valer a largura extra numa grade semanal inteira. Só
 * afeta o que a grade renderiza; cadastro de professor/matrícula continua
 * oferecendo Sábado normalmente via `DIAS_SEMANA`, então um atendimento de
 * sábado cadastrado existe, só não aparece nessas duas telas.
 */
export const DIAS_SEMANA_GRADE = DIAS_SEMANA.filter((dia) => dia.valor !== 'SAB')

const ORDEM_DIA: Record<string, number> = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 }
const LABEL_DIA: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((dia) => [dia.valor, dia.label]))

/** "Seg 14:00 · Qua 14:30" -- lista de horários pra exibição read-only (card de aluno, inspetor da agenda). */
export function horariosTexto(horarios: { diaSemana: string; horario: string }[]): string {
  return [...horarios]
    .sort((a, b) => (ORDEM_DIA[a.diaSemana] ?? 0) - (ORDEM_DIA[b.diaSemana] ?? 0) || a.horario.localeCompare(b.horario))
    .map((h) => `${LABEL_DIA[h.diaSemana] ?? h.diaSemana} ${h.horario}`)
    .join('  ·  ')
}
