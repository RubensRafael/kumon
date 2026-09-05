/** Iniciais de um nome completo (primeiro + último sobrenome), maiúsculas -- usadas no fallback do avatar. */
export function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase()
}
