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

/** "AAAA-MM-DD" -> "DD/MM/AAAA" pra exibição -- mesma tolerância a `Date`/string de `paraInputDate`. */
export function paraExibicao(valor: Date | string | null | undefined): string {
  const iso = paraInputDate(valor)
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
