import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'

/** Layout compartilhado das 3 telas de auth (login/esqueci-senha/resetar-senha). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <BookOpen className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">KFlow</h1>
          <p className="text-sm text-muted-foreground">Gestão Inteligente para Unidades Kumon</p>
        </div>
      </div>
      {children}
    </div>
  )
}
