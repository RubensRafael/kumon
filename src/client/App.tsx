import { Route, Routes } from 'react-router'

import { AppShell } from './app/components/common/app-shell'
import { RequireAuth, RequireGuest } from './app/components/common/require-auth'
import { Toaster } from './app/components/ui/sonner'
import { AuthProvider } from './app/hooks/use-auth'
import { appRoutes, authRoutes } from './config/routes'

/**
 * Shell da SPA: `AuthProvider` por cima de tudo, rotas públicas de auth sem
 * sidebar, e o resto (`appRoutes`) autenticado dentro do `AppShell`.
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
        {appRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RequireAuth>
                <AppShell>{route.element}</AppShell>
              </RequireAuth>
            }
          />
        ))}
      </Routes>
    </AuthProvider>
  )
}
