const TOKEN_BYTES = 32

function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Token de reset de senha: string aleatoria propria, nao um JWT — precisa ser
 * revogavel e de uso unico, o que um JWT (auto-contido e valido ate expirar)
 * nao permite sem uma blocklist. `crypto.getRandomValues` e a Web Crypto API,
 * disponivel tanto no workerd quanto no Node — nenhuma dependencia de
 * `node:crypto`.
 */
export function gerarToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  return paraHex(bytes)
}

/**
 * O token em si nunca e persistido — so o hash, no mesmo espirito da senha
 * (`Usuario.resetTokenHash`). SHA-256 (e nao bcrypt) porque o token ja nasce
 * com entropia alta o bastante: o custo computacional do bcrypt existe para
 * proteger segredos de baixa entropia (senhas escolhidas por humanos),
 * irrelevante aqui.
 */
export async function hashToken(token: string): Promise<string> {
  const dados = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', dados)
  return paraHex(new Uint8Array(digest))
}
