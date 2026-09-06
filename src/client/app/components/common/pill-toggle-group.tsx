import type { ReactNode } from 'react'

import { cn } from 'cn'

import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'

export const PILL_ITEM_CLASSNAME =
  'h-auto rounded-full px-3 py-1.5 font-normal data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

export interface PillToggleGroupOption {
  value: string
  label: ReactNode
}

type PillToggleGroupProps = {
  items: PillToggleGroupOption[]
  className?: string
} & (
  | { type: 'single'; value: string; onValueChange: (value: string) => void }
  | { type: 'multiple'; value: string[]; onValueChange: (value: string[]) => void }
)

/**
 * `ToggleGroup` com o estilo de pill do form de Professor (Dias disponíveis,
 * Matérias) -- extraído pra reusar também nos toggles da Agenda.
 */
export function PillToggleGroup({ items, className, ...groupProps }: PillToggleGroupProps) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={2}
      className={cn('flex-wrap justify-start', className)}
      {...groupProps}
    >
      {items.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value} className={PILL_ITEM_CLASSNAME}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
