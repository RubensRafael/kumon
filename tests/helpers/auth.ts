import { app, testEnv } from './setup'

function extrairCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error('Resposta de login sem Set-Cookie.')
  }
  return setCookie.split(';')[0]
}

/** Faz login e devolve o cookie de sessao — usado por todos os testes a partir daqui. */
export async function obterCookie(email: string, senha: string): Promise<string> {
  const response = await app.request(
    '/api/auth/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) },
    testEnv,
  )
  return extrairCookie(response)
}

export function authHeader(cookie: string): { cookie: string } {
  return { cookie }
}
