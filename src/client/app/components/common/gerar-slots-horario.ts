/** Lista de horários "HH:mm" de 30 em 30 min, do início (inclusive) ao fim (exclusive). */
export function gerarSlotsHorario(inicio: string, fim: string): string[] {
  const [horaInicio, minInicio] = inicio.split(':').map(Number)
  const [horaFim, minFim] = fim.split(':').map(Number)
  const minutosInicio = (horaInicio ?? 0) * 60 + (minInicio ?? 0)
  const minutosFim = (horaFim ?? 0) * 60 + (minFim ?? 0)

  const slots: string[] = []
  for (let minutos = minutosInicio; minutos < minutosFim; minutos += 30) {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}
