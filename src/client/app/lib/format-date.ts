/**
 * `AlunoOutput.dataNascimento`/`dataMatricula` são tipadas como `Date` no
 * schema, mas o `fetch().json()` do client nunca revive `Date` — chega como
 * string ISO em runtime. Aceita os dois formatos e devolve sempre
 * "AAAA-MM-DD", o que `<input type="date">` espera.
 */
export function paraInputDate(valor: Date | string | null | undefined): string {
  if (!valor) return ''
  const data = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  return data.toISOString().slice(0, 10)
}
