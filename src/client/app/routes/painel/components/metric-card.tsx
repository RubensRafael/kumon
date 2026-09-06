import type { ComponentType } from 'react'

import { cn } from 'cn'

import { Card, CardContent } from '../../../components/ui/card'

const CORES = {
  azul: { badge: 'bg-blue-500/10 text-blue-600', barra: 'bg-blue-500' },
  ambar: { badge: 'bg-amber-500/10 text-amber-600', barra: 'bg-amber-500' },
  vermelho: { badge: 'bg-red-500/10 text-red-600', barra: 'bg-red-500' },
  verde: { badge: 'bg-emerald-500/10 text-emerald-600', barra: 'bg-emerald-500' },
} as const

export function MetricCard({
  titulo,
  valor,
  legenda,
  icon: Icon,
  cor = 'azul',
  progresso,
}: {
  titulo: string
  valor: string | number
  legenda: string
  icon: ComponentType<{ className?: string }>
  cor?: keyof typeof CORES
  /** 0-100 -- quando presente, desenha a barrinha de progresso embaixo. */
  progresso?: number
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titulo}</p>
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', CORES[cor].badge)}>
            <Icon className="size-4" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-semibold">{valor}</p>
          <p className="truncate text-sm text-muted-foreground">{legenda}</p>
        </div>
        {progresso !== undefined ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', CORES[cor].barra)}
              style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
