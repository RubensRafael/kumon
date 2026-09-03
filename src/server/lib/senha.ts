import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Gravado como `senhaHash` de um usuario recem-criado por `POST /usuarios`.
 * Nao comeca com `$2` (prefixo de todo hash bcrypt valido), entao
 * `verificarSenha` sempre falha contra ele — login com um usuario novo e
 * impossivel ate o primeiro reset de senha.
 */
export const SENHA_PLACEHOLDER = 'sem-senha-definida:aguardando-primeiro-reset'

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS)
}

/**
 * `false` tanto para senha errada quanto para um hash que nao e bcrypt (o
 * caso do `SENHA_PLACEHOLDER`) — `bcrypt.compare` lanca nesse segundo caso, e
 * aqui isso vira apenas "nao autenticado", nunca um erro 500.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('$2')) return false

  try {
    return await bcrypt.compare(senha, hash)
  } catch {
    return false
  }
}
