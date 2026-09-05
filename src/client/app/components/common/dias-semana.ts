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
