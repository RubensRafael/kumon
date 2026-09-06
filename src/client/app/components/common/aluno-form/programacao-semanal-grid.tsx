import { cn } from 'cn'

import { DIAS_SEMANA } from '../dias-semana'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'

type DiaValor = typeof DIAS_SEMANA[number]['valor']

interface DisponibilidadeProfessor {
  diasDisponiveis: string[]
  horarioInicial: string
  horarioFinal: string
}

const SLOT_MINUTOS = 30

// Sem professor informado (ex.: matrícula existente sem disponibilidade
// carregada), cai numa janela ampla o bastante pra cobrir qualquer horário
// comercial -- só existe pra nunca deixar `valor.horario` fora das opções.
const JANELA_PADRAO = { horarioInicial: '07:00', horarioFinal: '21:00' }

function minutosDoHorario(hhmm: string): number {
  const [horas, minutos] = hhmm.split(':').map(Number)
  return (horas ?? 0) * 60 + (minutos ?? 0)
}

function formatarHorario(minutos: number): string {
  const horas = Math.floor(minutos / 60)
    .toString()
    .padStart(2, '0')
  const min = (minutos % 60).toString().padStart(2, '0')
  return `${horas}:${min}`
}

/**
 * Opções de horário em grade de 30min, no mesmo intervalo `[inicio, fim)`
 * que `horarioDentroDaJanela` valida no servidor
 * (`src/server/lib/horario.ts`) -- escolher aqui já garante que o backend
 * nunca vai rejeitar por estar fora de grade. Sempre inclui `valorAtual`
 * mesmo que caia fora da janela do professor (ex.: professor mudou de
 * horário depois que a aula foi marcada), pra não sumir com o valor salvo.
 */
function opcoesDeHorario(horarioInicial: string, horarioFinal: string, valorAtual: string): string[] {
  const inicio = minutosDoHorario(horarioInicial)
  const fim = minutosDoHorario(horarioFinal)
  const opcoes = new Set<string>()
  for (let minutos = inicio; minutos < fim; minutos += SLOT_MINUTOS) {
    opcoes.add(formatarHorario(minutos))
  }
  opcoes.add(valorAtual)
  return [...opcoes].sort()
}

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
 *
 * `professor`, quando informado, restringe a grade à disponibilidade real
 * dele: linhas de dias que ele não atende ficam desabilitadas, e o input de
 * horário ganha `min`/`max` da janela de atendimento — o mesmo par que o
 * backend (`horarios.service.ts`) valida no servidor.
 */
export function ProgramacaoSemanalGrid({
  valores,
  onChange,
  disabled = false,
  professor,
}: {
  valores: ProgramacaoSemanal
  onChange: (dia: DiaValor, valor: ProgramacaoDia) => void
  disabled?: boolean
  professor?: DisponibilidadeProfessor
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
            const diaDisponivel = !professor || professor.diasDisponiveis.includes(dia.valor)
            return (
              <tr key={dia.valor} className={cn('border-t', !diaDisponivel && 'bg-muted/30')}>
                <td className="px-3 py-2">
                  {dia.label}
                  {!diaDisponivel ? (
                    <span className="ml-2 text-xs text-muted-foreground">professor não atende</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Switch
                    disabled={disabled || !diaDisponivel}
                    checked={valor.frequenta}
                    onCheckedChange={(frequenta) => onChange(dia.valor, { ...valor, frequenta })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={valor.horario}
                    onValueChange={(horario) => onChange(dia.valor, { ...valor, horario })}
                    disabled={disabled || !diaDisponivel || !valor.frequenta}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesDeHorario(
                        professor?.horarioInicial ?? JANELA_PADRAO.horarioInicial,
                        professor?.horarioFinal ?? JANELA_PADRAO.horarioFinal,
                        valor.horario,
                      ).map((horario) => (
                        <SelectItem key={horario} value={horario}>
                          {horario}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
