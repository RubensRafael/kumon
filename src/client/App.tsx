import { Route, Routes } from 'react-router'

import { AppLayout } from './app/components/layout/app-layout'
import { appRoutes } from './config/routes'

/**
 * Shell da SPA: layout fixo + tabela de rotas declarada em
 * `src/client/config/routes.tsx`.
 */
export default function App() {
  return (
    <AppLayout>
      <Routes>
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </AppLayout>
  )
}
