import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

interface CardProps {
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

export function Card({ title, description, footer, className, children }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md',
        className,
      )}
    >
      {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div> : null}
    </section>
  )
}
