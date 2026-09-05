import { DIAS_SEMANA } from '../dias-semana'
import { Input } from '../../ui/input'
import { Switch } from '../../ui/switch'

type DiaValor = typeof DIAS_SEMANA[number]['valor']

export interface ProgramacaoDia {
  frequenta: boolean
  horario: string
}

export type ProgramacaoSemanal = Record<DiaValor, ProgramacaoDia>

export function programacaoSemanalVazia(): ProgramacaoSemanal {
  return Object.fromEntries(
    DIAS_SEMANA.map((dia) => [dia.valor, { frequenta: false, horario: '08:00' }]),
  ) as ProgramacaoSemanal
}

/**
 * Tabela Dia / Frequenta / Horário — controlada, sem saber se está editando
 * uma matrícula já existente ou uma que ainda nem foi criada; quem chama
 * decide o que `onChange` faz (só atualizar estado local, ou já persistir).
 */
export function ProgramacaoSemanalGrid({
  valores,
  onChange,
  disabled = false,
}: {
  valores: ProgramacaoSemanal
  onChange: (dia: DiaValor, valor: ProgramacaoDia) => void
  disabled?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dia</th>
            <th className="px-3 py-2 text-left font-medium">Frequenta</th>
            <th className="px-3 py-2 text-left font-medium">Horário</th>
          </tr>
        </thead>
        <tbody>
          {DIAS_SEMANA.map((dia) => {
            const valor = valores[dia.valor]
            return (
              <tr key={dia.valor} className="border-t">
                <td className="px-3 py-2">{dia.label}</td>
                <td className="px-3 py-2">
                  <Switch
                    disabled={disabled}
                    checked={valor.frequenta}
                    onCheckedChange={(frequenta) => onChange(dia.valor, { ...valor, frequenta })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="time"
                    step={1800}
                    className="w-32"
                    disabled={disabled || !valor.frequenta}
                    value={valor.horario}
                    onChange={(e) => onChange(dia.valor, { ...valor, horario: e.target.value })}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
