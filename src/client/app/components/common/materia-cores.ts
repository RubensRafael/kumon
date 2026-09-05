/**
 * Cor consistente por matéria pra qualquer lista/chip que precise
 * distinguir visualmente (não dá pra fixar cor por nome -- matéria é
 * dado, não enum) -- cicla pelos tokens de gráfico do tema
 * (`--chart-1`..`--chart-5`), pela posição da matéria no array recebido
 * (`listarMaterias`, ordem estável). Primeiro consumidor: os chips de
 * matrícula no card de Aluno (fe-04).
 */
const CORES_MATERIA = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function corDaMateria(materiaId: string, materias: { id: string }[]): string {
  const indice = materias.findIndex((materia) => materia.id === materiaId)
  return CORES_MATERIA[(indice < 0 ? 0 : indice) % CORES_MATERIA.length]!
}
