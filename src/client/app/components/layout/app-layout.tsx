import type { ReactNode } from 'react'

import { Navbar } from './navbar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-slate-400">
          React + Vite &middot; Hono &middot; Prisma + Neon &middot; Cloudflare Workers
        </div>
      </footer>
    </div>
  )
}
