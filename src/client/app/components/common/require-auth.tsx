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
