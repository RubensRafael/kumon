import { Outlet, Route, Routes } from 'react-router'

import { AppShell } from './app/components/common/app-shell'
import { RequireAdmin, RequireAuth, RequireGuest } from './app/components/common/require-auth'
import { Toaster } from './app/components/ui/sonner'
import { AuthProvider } from './app/hooks/use-auth'
import { PainelSnapshotProvider } from './app/hooks/use-painel-snapshot'
import { appRoutes, authRoutes } from './config/routes'

/**
 * `PainelSnapshotProvider` uma única vez, por cima de todas as `appRoutes`
 * (não uma instância por rota) -- assim o snapshot sobrevive à navegação
 * entre telas: sair de `/professores` e entrar em `/painel` reaproveita o
 * mesmo `obterPainel` já buscado, em vez de remontar o provider e refazer a
 * chamada do zero. É o que faz um `refetch()` disparado numa tela realmente
 * "invalidar" o que outra tela (ainda montada, no `AppShell`) está vendo.
 */
function AppLayout() {
  return (
    <RequireAuth>
      <PainelSnapshotProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </PainelSnapshotProvider>
    </RequireAuth>
  )
}

/**
 * Shell da SPA: `AuthProvider` por cima de tudo, rotas públicas de auth sem
 * sidebar, e o resto (`appRoutes`) autenticado dentro do `AppLayout`.
 */
export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="bottom-right" />
      <Routes>
        {authRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<RequireGuest>{route.element}</RequireGuest>}
          />
        ))}
        <Route element={<AppLayout />}>
          {appRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.adminOnly ? <RequireAdmin>{route.element}</RequireAdmin> : route.element}
            />
          ))}
        </Route>
      </Routes>
    </AuthProvider>
  )
}
