import { Info } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from 'cn'

import type { AgendaSlotOutputType, MateriaOutputType, OcupacaoCelula } from '@shared/dto'

import { TIPO_ATENDIMENTO_LABEL } from './aluno-form/enum-labels'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'

export interface ScheduleGridColumn {
  key: string
  header: ReactNode
}

/**
 * Verde → amarelo → vermelho conforme a célula se aproxima (ou passa) da
 * capacidade do professor -- 3 faixas fixas, não gradiente contínuo (a
 * interpolação de matiz antiga passava por tons de laranja entre ~75% e
 * ~95%, o que lia como "nem amarelo nem vermelho"). `undefined` quando não
 * há o que colorir (célula vazia ou professor sem capacidade cadastrada) --
 * mantém o fundo padrão da tabela.
 */
function estiloOcupacao(ocupacao: OcupacaoCelula): CSSProperties | undefined {
  const total = ocupacao.ocupantes.length + ocupacao.overflow.length
  if (total === 0 || ocupacao.capacidade <= 0) return undefined

  const razao = total / ocupacao.capacidade
  const hue = razao >= 0.8 ? 0 : razao >= 0.5 ? 55 : 142
  return { backgroundColor: `hsl(${hue} 70% 92%)` }
}

/**
 * Pill com o nome do professor, mesma cor de fundo da pill dele no grid
 * (`slot.professorCorAgenda`) -- decodifica de quem é o aluno sem precisar
 * de texto corrido, útil principalmente com vários professores juntos numa
 * célula da Agenda individual.
 */
function ProfessorPill({ slot }: { slot: AgendaSlotOutputType }) {
  return (
    <Badge className="shrink-0 border-transparent text-white" style={{ backgroundColor: slot.professorCorAgenda }}>
      {slot.professorNome}
    </Badge>
  )
}

/** Card de um ocupante real da célula (aluno que começa naquele horário). */
function OcupanteCard({ slot, materias }: { slot: AgendaSlotOutputType; materias: MateriaOutputType[] }) {
  const materiaNome = materias.find((m) => m.id === slot.materiaId)?.nome ?? '—'
  return (
    <li className="flex items-center gap-3 rounded-xl border p-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: slot.professorCorAgenda }}
      >
        {slot.professorNome.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{slot.alunoNome}</p>
        <p className="truncate text-xs text-muted-foreground">
          {materiaNome}
          {slot.estagio ? ` · ${slot.estagio}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="secondary">{TIPO_ATENDIMENTO_LABEL[slot.tipoAtendimento]}</Badge>
        <ProfessorPill slot={slot} />
      </div>
    </li>
  )
}

/** Card de um aluno presente só por spillover (aula anterior ainda não terminou). */
function OverflowCard({ slot }: { slot: AgendaSlotOutputType }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: slot.professorCorAgenda }}
      >
        {slot.professorNome.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{slot.alunoNome}</p>
        <p className="text-xs text-muted-foreground">Ainda em sala desde {slot.horario}</p>
      </div>
      <ProfessorPill slot={slot} />
    </li>
  )
}

/** Lista read-only exibida no modal de detalhe da célula (ícone ⓘ no hover). */
function ListaOcupacaoCelula({ ocupacao, materias }: { ocupacao: OcupacaoCelula; materias: MateriaOutputType[] }) {
  if (ocupacao.ocupantes.length === 0 && ocupacao.overflow.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum aluno nesse horário.</p>
  }

  return (
    <div className="space-y-3 text-sm">
      {ocupacao.ocupantes.length > 0 ? (
        <ul className="space-y-2">
          {ocupacao.ocupantes.map((slot) => (
            <OcupanteCard key={slot.horarioId} slot={slot} materias={materias} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nenhum aluno começando nesse horário.</p>
      )}

      {ocupacao.overflow.length > 0 ? (
        <div className="space-y-2 border-t border-dashed pt-3">
          <p className="text-xs text-muted-foreground">
            Ainda em sala (aula anterior de 50min, ainda não terminou):
          </p>
          <ul className="space-y-2">
            {ocupacao.overflow.map((slot) => (
              <OverflowCard key={slot.horarioId} slot={slot} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** Resumo da matrícula exibido no popup de hover da pill -- não abre em clique, só ao passar o mouse. */
function ResumoMatriculaPill({ slot, materias }: { slot: AgendaSlotOutputType; materias: MateriaOutputType[] }) {
  const materiaNome = materias.find((m) => m.id === slot.materiaId)?.nome ?? '—'
  return (
    <dl className="space-y-1.5 text-xs">
      <p className="text-sm font-semibold text-foreground">{slot.alunoNome}</p>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Matéria</dt>
        <dd className="text-right font-medium">{materiaNome}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Estágio</dt>
        <dd className="text-right font-medium">{slot.estagio ?? '—'}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Atendimento</dt>
        <dd className="text-right font-medium">{TIPO_ATENDIMENTO_LABEL[slot.tipoAtendimento]}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Professor</dt>
        <dd className="text-right font-medium">{slot.professorNome}</dd>
      </div>
    </dl>
  )
}

/**
 * Pill de um slot ocupado -- badges no fim (mesmo padrão visual do círculo
 * "C" de Connect em `aluno-card.tsx:46-49`): "30 min" pra `PRE_ESCOLAR`,
 * círculo Connect, bolinha de zona vermelha. Nome do aluno é o único
 * elemento que trunca -- os badges nunca encolhem. Hover (via `HoverCard`
 * do Radix, delay de entrada/saída e fechamento consistentes de graça) traz
 * um resumo da matrícula, sem precisar clicar.
 */
function AgendaPill({
  slot,
  materias,
  onClick,
}: {
  slot: AgendaSlotOutputType
  materias: MateriaOutputType[]
  onClick: (slot: AgendaSlotOutputType) => void
}) {
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(slot)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-medium text-white"
          style={{ backgroundColor: slot.professorCorAgenda }}
        >
          <span className="truncate">{slot.alunoNome}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {slot.tipoAtendimento === 'PRE_ESCOLAR' ? (
              <span className="rounded-sm bg-white/25 px-1 py-px text-[9px] leading-tight font-semibold whitespace-nowrap">
                30 min
              </span>
            ) : null}
            {slot.alunoConnect ? (
              <span
                className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white"
                title="Connect"
              >
                C
              </span>
            ) : null}
            {slot.alunoZonaVermelha ? (
              <span className="size-2 shrink-0 rounded-full bg-red-500 ring-1 ring-white" title="Zona Vermelha" />
            ) : null}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-56">
        <ResumoMatriculaPill slot={slot} materias={materias} />
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * Resumo "X / capacidade" de uma célula, usado no lugar das pills quando
 * `modoCelula="ocupacao"` -- o que a Agenda Geral quer responder é "quantas
 * vagas sobram aqui", não "quem está aqui" (isso já é o modal, aberto pelo
 * clique na própria célula). Sem professor disponível nesse horário
 * (`capacidade <= 0`) não é uma vaga, é ausência de atendimento -- só um
 * traço, sem clique.
 */
function CelulaOcupacao({
  ocupacao,
  onClick,
  destacada,
}: {
  ocupacao: OcupacaoCelula
  onClick: () => void
  /**
   * `false` quando um dos chips de estado (lotado/com vagas/baixa) está
   * ativo e essa célula não bate com ele -- vira um cinza neutro fixo em
   * vez da cor real de ocupação, pra não competir visualmente com as que
   * batem. Cinza sólido, não opacidade -- opacidade deixava a cor de fundo
   * ainda "vazando" por trás, parecendo que a célula ainda contava.
   */
  destacada: boolean
}) {
  const total = ocupacao.ocupantes.length + ocupacao.overflow.length

  if (ocupacao.capacidade <= 0) {
    return <p className="py-2 text-center text-muted-foreground">—</p>
  }

  const lotado = total >= ocupacao.capacidade
  const vagas = ocupacao.capacidade - total
  const razao = total / ocupacao.capacidade

  const cores = !destacada
    ? 'border-slate-300 bg-slate-200 text-slate-400'
    : lotado
      ? 'border-rose-300 bg-rose-50 text-rose-700'
      : total === 0
        ? 'border-slate-200 bg-slate-50 text-slate-500'
        : razao >= 0.5
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full rounded-lg border px-2 py-2 text-center transition-all hover:shadow-sm hover:-translate-y-px', cores)}
      title="Ver detalhes da ocupação"
    >
      <div className="text-sm leading-tight font-semibold">
        {total} / {ocupacao.capacidade}
      </div>
      <div className="mt-0.5 text-[10px] opacity-80">{lotado ? 'LOTADO' : `${vagas} vaga${vagas === 1 ? '' : 's'}`}</div>
    </button>
  )
}

/**
 * Grade horário×coluna reaproveitada pela Agenda Geral (colunas =
 * professores) e pela Agenda individual (colunas = dias da semana
 * selecionada) — quem chama decide o que cada coluna representa e como
 * localizar os slots de uma célula.
 */
export function ScheduleGrid({
  colunas,
  horarios,
  slotsDaCelula,
  ocupacaoDaCelula,
  materias,
  onSlotClick,
  emDestaque,
  modoCelula = 'pills',
}: {
  colunas: ScheduleGridColumn[]
  horarios: string[]
  /** Só usado em `modoCelula="pills"` -- a Agenda Geral (`modoCelula="ocupacao"`) não lista ocupante por célula, pode omitir. */
  slotsDaCelula?: (colunaKey: string, horario: string) => AgendaSlotOutputType[]
  /**
   * Ocupação "real" da célula (não filtrada pelos toggles da Agenda, ao
   * contrário de `slotsDaCelula`) -- inclui o spillover de `REGULAR` do
   * horário anterior. Base da cor de fundo; sempre a mesma independente de
   * filtro ativo, pra não sugerir que a capacidade do professor mudou só
   * porque a view está filtrada.
   */
  ocupacaoDaCelula: (colunaKey: string, horario: string) => OcupacaoCelula
  /** Só pro nome da matéria no popup de hover da pill -- `AgendaSlotOutputType` só tem o id. */
  materias: MateriaOutputType[]
  /** Só usado em `modoCelula="pills"`, mesmo motivo de `slotsDaCelula`. */
  onSlotClick?: (slot: AgendaSlotOutputType) => void
  /**
   * Quando informado, células em que retorna `false` perdem sua cor real de
   * ocupação (em `modoCelula="ocupacao"`, viram um cinza neutro -- ver
   * `CelulaOcupacao`) -- usado pelos chips de estado (lotado/com vagas/baixa
   * ocupação) da Agenda Geral pra realçar só as que batem com o escolhido.
   * `undefined` (padrão, caso da Agenda individual) não afeta nada.
   */
  emDestaque?: (colunaKey: string, horario: string) => boolean
  /**
   * `'pills'` (padrão, usado pela Agenda individual) lista cada ocupante.
   * `'ocupacao'` (Agenda Geral) troca isso por um resumo "X / capacidade" +
   * vagas restantes -- o que importa ali é quantas vagas sobram, não quem
   * está em cada uma; célula inteira vira o clique pra abrir o modal de
   * detalhe (mesmo modal, só muda o gatilho).
   */
  modoCelula?: 'pills' | 'ocupacao'
}) {
  const [celulaInfo, setCelulaInfo] = useState<{ coluna: ScheduleGridColumn; horario: string } | null>(null)

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-10 min-w-20 bg-muted/50 px-3 py-2 text-left font-medium">
              Horário
            </th>
            {colunas.map((coluna) => (
              <th key={coluna.key} className="min-w-40 border-l px-3 py-2 text-left font-medium">
                {coluna.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horarios.map((horario) => (
            <tr key={horario} className="border-t">
              <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium text-muted-foreground">
                {horario}
              </td>
              {colunas.map((coluna) => {
                const ocupacao = ocupacaoDaCelula(coluna.key, horario)
                const temOcupacao = ocupacao.ocupantes.length + ocupacao.overflow.length > 0
                const destacada = emDestaque ? emDestaque(coluna.key, horario) : true
                return (
                  <td
                    key={coluna.key}
                    className="group border-l px-2 py-1 align-top"
                    style={modoCelula === 'ocupacao' ? undefined : estiloOcupacao(ocupacao)}
                  >
                    {modoCelula === 'ocupacao' ? (
                      <CelulaOcupacao
                        ocupacao={ocupacao}
                        destacada={destacada}
                        onClick={() => setCelulaInfo({ coluna, horario })}
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const slots = slotsDaCelula ? slotsDaCelula(coluna.key, horario) : []
                          return slots.length === 0 ? (
                            <span className="block px-1 text-muted-foreground">—</span>
                          ) : (
                            slots.map((slot) => (
                              <AgendaPill
                                key={slot.horarioId}
                                slot={slot}
                                materias={materias}
                                onClick={onSlotClick ?? (() => {})}
                              />
                            ))
                          )
                        })()}
                        {/* Espaço reservado no fim da célula pro ícone de info -- sempre presente (mesmo
                            sem ocupação) pra o hover nunca causar layout shift; não é `absolute` de
                            propósito, pra nunca flutuar por cima de uma pill. */}
                        <div className="flex h-4 items-center justify-end">
                          {temOcupacao ? (
                            <button
                              type="button"
                              onClick={() => setCelulaInfo({ coluna, horario })}
                              className="flex items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                              title="Ver detalhes da ocupação"
                            >
                              <Info className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={celulaInfo !== null} onOpenChange={(open) => !open && setCelulaInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocupação às {celulaInfo?.horario}</DialogTitle>
          </DialogHeader>
          {celulaInfo ? (
            <ListaOcupacaoCelula
              ocupacao={ocupacaoDaCelula(celulaInfo.coluna.key, celulaInfo.horario)}
              materias={materias}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
