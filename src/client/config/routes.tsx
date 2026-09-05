import type { ComponentType, ReactElement } from 'react'

import { EsqueciSenhaPage } from '../app/routes/auth/esqueci-senha.page'
import { LoginPage } from '../app/routes/auth/login.page'
import { ResetarSenhaPage } from '../app/routes/auth/resetar-senha.page'
import { InicioPage } from '../app/routes/inicio.page'
import { NotFoundPage } from '../app/routes/not-found.page'

export interface AppRoute {
  path: string
  element: ReactElement
  /** Quando presente, a rota aparece no menu da sidebar. */
  label?: string
  icon?: ComponentType<{ className?: string }>
}

/**
 * Rotas autenticadas (dentro do `AppShell` + `RequireAuth`). Cada PR de
 * feature acrescenta a sua aqui — nesta PR (setup) só existe a landing
 * temporária, substituída de vez pelo Painel na fe-05.
 */
export const appRoutes: AppRoute[] = [
  { path: '/', element: <InicioPage /> },
  { path: '*', element: <NotFoundPage /> },
]

/** Rotas públicas de autenticação — fora do `AppShell`, sem sidebar. */
export const authRoutes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/resetar-senha', element: <ResetarSenhaPage /> },
]

/** Itens de navegação da sidebar — subconjunto de `appRoutes` que declara `label`. */
export const navItems = appRoutes.filter(
  (route): route is AppRoute & { label: string } => Boolean(route.label),
)
