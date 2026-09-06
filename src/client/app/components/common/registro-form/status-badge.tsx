import { cn } from 'cn'

import type { StatusRegistro } from '@shared/dto'

import { STATUS_REGISTRO_LABEL } from './enum-labels'

const CLASSES: Record<StatusRegistro, string> = {
  NAO_INICIADO: 'bg-slate-100 text-slate-600',
  PENDENTE: 'bg-orange-50 text-orange-700',
  EM_ANDAMENTO: 'bg-amber-50 text-amber-700',
  CONCLUIDO: 'bg-emerald-50 text-emerald-700',
}

export function StatusRegistroBadge({ status }: { status: StatusRegistro }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', CLASSES[status])}>
      {STATUS_REGISTRO_LABEL[status]}
    </span>
  )
}
