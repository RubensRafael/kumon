import type { ReactElement } from 'react'

import { AboutPage } from '../app/routes/about.page'
import { HomePage } from '../app/routes/home.page'
import { UsersPage } from '../app/routes/users.page'
import { NotFoundPage } from '../app/routes/not-found.page'

export interface AppRoute {
  path: string
  element: ReactElement
  /** Quando presente, a rota aparece na navegacao principal. */
  label?: string
}

/**
 * Tabela de rotas da SPA. Toda navegacao e client-side: o servidor devolve
 * sempre o mesmo index.html e o React Router resolve o resto no navegador.
 */
export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePage />, label: 'Inicio' },
  { path: '/usuarios', element: <UsersPage />, label: 'Usuarios' },
  { path: '/sobre', element: <AboutPage />, label: 'Sobre' },
  { path: '*', element: <NotFoundPage /> },
]
