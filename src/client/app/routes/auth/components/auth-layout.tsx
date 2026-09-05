import type { ReactNode } from 'react'

/** Layout compartilhado das 3 telas de auth (login/esqueci-senha/resetar-senha). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full items-center justify-center p-6">{children}</div>
}
