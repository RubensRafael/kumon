import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from '../../hooks/use-auth'

/** Envolve rotas autenticadas — sem usuário, redireciona pra `/login`. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  if (carregando) return null
  if (!usuario) return <Navigate to="/login" replace state={{ from: location }} />

  return <>{children}</>
}

/** Envolve rotas públicas de auth (`/login` etc.) — usuário já logado, manda pra home. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth()

  if (carregando) return null
  if (usuario) return <Navigate to="/" replace />

  return <>{children}</>
}

/**
 * Envolve rotas admin-only (Configurações etc.) — assume que já está dentro
 * de `RequireAuth` (não checa `carregando`/usuário nulo de novo). Só esconde
 * a tela; o backend (`requireAdmin`) é quem de fato impede a escrita.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()

  if (usuario?.papel !== 'ADMIN') {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p>Esta página é restrita a administradores.</p>
      </div>
    )
  }

  return <>{children}</>
}
