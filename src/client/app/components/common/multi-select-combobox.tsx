import { ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from 'cn'

import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export interface MultiSelectOption {
  value: string
  label: string
}

/**
 * Combobox de múltipla seleção com busca (baseado no padrão Combobox do
 * shadcn/ui: https://ui.shadcn.com/docs/components/radix/combobox).
 * Composto aqui com os primitivos Radix já usados no projeto -- Popover +
 * Checkbox -- em vez do pacote `@base-ui/react` que o registry oficial usa
 * por baixo, pra não introduzir uma segunda lib de primitivos só pra isso;
 * a filtragem por busca é um `.filter()` simples, sem precisar de `cmdk`.
 */
export function MultiSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  className,
}: {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const opcoesFiltradas = options.filter((opcao) => opcao.label.toLowerCase().includes(busca.toLowerCase()))

  function alternar(optionValue: string) {
    onValueChange(
      value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue],
    )
  }

  const rotulo =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
        : `${value.length} selecionados`

  return (
    <Popover
      open={open}
      onOpenChange={(proximoAberto) => {
        setOpen(proximoAberto)
        if (!proximoAberto) setBusca('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 justify-between font-normal',
            value.length === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{rotulo}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="border-b p-2">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {opcoesFiltradas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            opcoesFiltradas.map((opcao) => (
              <button
                key={opcao.value}
                type="button"
                onClick={() => alternar(opcao.value)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox checked={value.includes(opcao.value)} className="pointer-events-none" />
                <span className="truncate">{opcao.label}</span>
              </button>
            ))
          )}
        </div>
        {value.length > 0 ? (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => onValueChange([])}
              className="flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              <X className="size-3" />
              Limpar seleção
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
