import { Calendar, LayoutDashboard, GraduationCap, LayoutGrid, Settings, Users } from 'lucide-react'
import type { ComponentType, ReactElement } from 'react'
import { Navigate } from 'react-router'

import { AgendaGeralPage } from '../app/routes/agenda-geral/agenda-geral.page'
import { AgendaPage } from '../app/routes/agenda/agenda.page'
import { AlunosPage } from '../app/routes/alunos/alunos.page'
import { EsqueciSenhaPage } from '../app/routes/auth/esqueci-senha.page'
import { LoginPage } from '../app/routes/auth/login.page'
import { ResetarSenhaPage } from '../app/routes/auth/resetar-senha.page'
import { ConfiguracoesPage } from '../app/routes/configuracoes/configuracoes.page'
import { NotFoundPage } from '../app/routes/not-found.page'
import { PainelPage } from '../app/routes/painel/painel.page'
import { ProfessoresPage } from '../app/routes/professores/professores.page'

export interface AppRoute {
  path: string
  element: ReactElement
  /** Quando presente, a rota aparece no menu da sidebar. */
  label?: string
  icon?: ComponentType<{ className?: string }>
  /** Some do menu pra quem não é admin, e mostra "acesso restrito" na própria rota. */
  adminOnly?: boolean
}

/**
 * Rotas autenticadas (dentro do `AppShell` + `RequireAuth`). Cada PR de
 * feature acrescenta a sua aqui. `/` só redireciona pro Painel — a landing
 * temporária que ficava aqui saiu nesta PR.
 */
export const appRoutes: AppRoute[] = [
  { path: '/', element: <Navigate to="/painel" replace /> },
  { path: '/painel', element: <PainelPage />, label: 'Painel', icon: LayoutDashboard },
  { path: '/agenda-geral', element: <AgendaGeralPage />, label: 'Agenda Geral', icon: LayoutGrid },
  { path: '/agenda', element: <AgendaPage />, label: 'Agenda', icon: Calendar },
  { path: '/professores', element: <ProfessoresPage />, label: 'Professores', icon: GraduationCap },
  { path: '/alunos', element: <AlunosPage />, label: 'Alunos', icon: Users },
  { path: '/configuracoes', element: <ConfiguracoesPage />, label: 'Configurações', icon: Settings, adminOnly: true },
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
