import type { LoginOutputType } from '../../src/server/features/auth/auth.dto'
import { app, testEnv } from './setup'

/** Faz login e devolve so o token — usado por todos os testes a partir daqui. */
export async function obterToken(email: string, senha: string): Promise<string> {
  const response = await app.request(
    '/api/auth/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) },
    testEnv,
  )
  const body = (await response.json()) as LoginOutputType
  return body.token
}

export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` }
}
