import { NavLink } from 'react-router'

import { appRoutes } from '../../../config/routes'
import { cn } from '../../lib/cn'

export function Navbar() {
  const links = appRoutes.filter((route) => route.label)

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          kumon<span className="text-brand-600">.</span>
        </span>

        <ul className="flex items-center gap-1">
          {links.map((route) => (
            <li key={route.path}>
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                {route.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
