import { DIAS_SEMANA } from './dias-semana'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'

type DiaSemana6 = (typeof DIAS_SEMANA)[number]['valor']

export function WeekdayTabs({ value, onChange }: { value: DiaSemana6; onChange: (dia: DiaSemana6) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DiaSemana6)}>
      <TabsList>
        {DIAS_SEMANA.map((dia) => (
          <TabsTrigger key={dia.valor} value={dia.valor}>
            {dia.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
