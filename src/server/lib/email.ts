/**
 * Envio de e-mail via Resend — esqueleto. Nenhuma conta Resend real esta
 * conectada neste projeto ainda: `RESEND_DUMMY_API_KEY` e o valor que
 * `.env.example`/`BACKEND_RESEND_API_KEY` usam em dev, e faz `enviarEmail`
 * nunca chamar a API de verdade (a unica coisa que precisa continuar
 * funcionando sem conta e o `console.log` do token em
 * `auth.service.ts#solicitarReset`). Quando uma conta real existir, basta
 * trocar a env por uma key de verdade — o resto ja funciona.
 */

const RESEND_TEMPLATE_ID_RESET_SENHA = 'reset-senha'

export const RESEND_DUMMY_API_KEY = 'dummy-dev-nao-chama-resend'

export async function enviarEmailResetSenha(
  apiKey: string,
  destinatario: string,
  link: string,
): Promise<void> {
  if (apiKey === RESEND_DUMMY_API_KEY) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KFlow <onboarding@resend.dev>',
      to: destinatario,
      template: RESEND_TEMPLATE_ID_RESET_SENHA,
      data: { link },
    }),
  })
}
