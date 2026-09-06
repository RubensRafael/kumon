import { AlertTriangle, BedDouble, DoorOpen, Gauge, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { cn } from 'cn'

import { calcularAgregacoesPainel, calcularOcupacaoUnidadeCelula, type OcupacaoCelula } from '@shared/dto'

import { DIAS_SEMANA_GRADE } from '../../components/common/dias-semana'
import { MultiSelectCombobox } from '../../components/common/multi-select-combobox'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useAuth } from '../../hooks/use-auth'
import { useApiQuery } from '../../hooks/use-api'
import { gerarSlotsHorario } from '../../lib/gerar-slots-horario'
import { MetricCard } from '../painel/components/metric-card'

/** Abaixo disso, célula entra na contagem de "baixa ocupação" -- mesmo ponto médio que `estiloOcupacao` (schedule-grid.tsx) já usa no gradiente de cor, pra bater com o que o olho vê na grade. */
const LIMIAR_BAIXA_OCUPACAO = 0.5

type EstadoCelula = 'lotado' | 'baixa' | 'normal' | null

/**
 * `null` = sem professor disponível nesse horário (célula fora de qualquer
 * categoria -- não é "vaga", é ausência de atendimento). Célula totalmente
 * vazia (0 ocupantes) conta como `normal`, não `baixa` -- "baixa ocupação"
 * é sinal de horário com gente mas subutilizado, não sinônimo de vazio
 * (senão a maior parte da grade, que nunca está cheia, viraria "baixa" e o
 * card perderia utilidade).
 */
function classificarCelula(ocupacao: OcupacaoCelula): EstadoCelula {
  if (ocupacao.capacidade <= 0) return null
  const total = ocupacao.ocupantes.length + ocupacao.overflow.length
  const razao = total / ocupacao.capacidade
  if (razao >= 1) return 'lotado'
  if (total > 0 && razao < LIMIAR_BAIXA_OCUPACAO) return 'baixa'
  return 'normal'
}

export function AgendaGeralPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: painel, loading } = useApiQuery('obterPainel', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })

  const [destaque, setDestaque] = useState<'lotado' | 'vagas' | 'baixa' | null>(null)

  // Único filtro desta tela: matéria decide o *pool* de professores somado em
  // cada célula (quem entra na conta de capacidade/ocupação da unidade), não
  // quais ocupantes aparecem -- ver discussão em revisao-manual.md sobre por
  // que filtrar só o numerador mentiria sobre vaga disponível.
  const materiaIds = searchParams.get('materiaIds')?.split(',').filter(Boolean) ?? []
  function atualizarMaterias(valores: string[]) {
    const proximo = new URLSearchParams(searchParams)
    if (valores.length === 0) proximo.delete('materiaIds')
    else proximo.set('materiaIds', valores.join(','))
    setSearchParams(proximo, { replace: true })
  }

  const professoresOrdenados = [...(painel?.professores ?? [])].sort((a, b) => a.nome.localeCompare(b.nome))
  const poolProfessorIds =
    materiaIds.length > 0
      ? professoresOrdenados.filter((p) => p.materiaIds.some((m) => materiaIds.includes(m))).map((p) => p.id)
      : null
  const professoresDoPool = poolProfessorIds
    ? professoresOrdenados.filter((p) => poolProfessorIds.includes(p.id))
    : professoresOrdenados

  const agregado = useMemo(
    () => (painel ? calcularAgregacoesPainel(painel, poolProfessorIds) : null),
    [painel, poolProfessorIds],
  )

  if (loading || !painel || !agregado) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda Geral</h1>
          <p className="text-sm text-muted-foreground">Vagas e ocupação da unidade, por dia e horário</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  const horarioInicial = professoresDoPool.reduce(
    (min, p) => (p.horarioInicial < min ? p.horarioInicial : min),
    professoresDoPool[0]?.horarioInicial ?? '08:00',
  )
  const horarioFinal = professoresDoPool.reduce(
    (max, p) => (p.horarioFinal > max ? p.horarioFinal : max),
    professoresDoPool[0]?.horarioFinal ?? '18:00',
  )
  const horarios = professoresDoPool.length > 0 ? gerarSlotsHorario(horarioInicial, horarioFinal) : []

  const vagasDisponiveis = agregado.capacidadeSimultanea - agregado.totalAlunosAtivos
  const excedida = vagasDisponiveis < 0
  const ocupacaoPercentual =
    agregado.capacidadeSimultanea > 0
      ? Math.round((agregado.totalAlunosAtivos / agregado.capacidadeSimultanea) * 100)
      : 0

  // Contagem de células por estado na semana inteira -- alimenta os 3 cards
  // clicáveis abaixo. Recalculado por completo a cada mudança de matéria ou
  // janela de horário (dataset pequeno, sem necessidade de otimizar).
  const estatisticas = (() => {
    let lotados = 0
    let comVagas = 0
    let baixas = 0
    for (const dia of DIAS_SEMANA_GRADE) {
      for (const horario of horarios) {
        const ocupacao = calcularOcupacaoUnidadeCelula(painel, {
          diaSemana: dia.valor,
          horario,
          professorIds: poolProfessorIds ?? undefined,
        })
        const estado = classificarCelula(ocupacao)
        if (estado === 'lotado') lotados++
        if (estado === 'baixa' || estado === 'normal') comVagas++
        if (estado === 'baixa') baixas++
      }
    }
    return { lotados, comVagas, baixas }
  })()

  function alternarDestaque(valor: 'lotado' | 'vagas' | 'baixa') {
    setDestaque((atual) => (atual === valor ? null : valor))
  }

  const CHIPS_ESTADO = [
    {
      valor: 'lotado' as const,
      label: 'Lotados',
      contagem: estatisticas.lotados,
      icon: AlertTriangle,
      ativo: 'border-red-500 bg-red-50 text-red-700',
    },
    {
      valor: 'vagas' as const,
      label: 'Com vagas',
      contagem: estatisticas.comVagas,
      icon: DoorOpen,
      ativo: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    },
    {
      valor: 'baixa' as const,
      label: 'Baixa ocupação',
      contagem: estatisticas.baixas,
      icon: TrendingDown,
      ativo: 'border-amber-500 bg-amber-50 text-amber-700',
    },
  ]

  const colunas: ScheduleGridColumn[] = DIAS_SEMANA_GRADE.map((dia) => ({
    key: dia.valor,
    header: <p className="font-semibold">{dia.label}</p>,
  }))

  function ocupacaoDaCelula(diaSemana: string, horario: string): OcupacaoCelula {
    return calcularOcupacaoUnidadeCelula(painel, { diaSemana, horario, professorIds: poolProfessorIds ?? undefined })
  }

  const emDestaque = destaque
    ? (diaSemana: string, horario: string) => {
        const estado = classificarCelula(ocupacaoDaCelula(diaSemana, horario))
        if (destaque === 'lotado') return estado === 'lotado'
        if (destaque === 'baixa') return estado === 'baixa'
        return estado === 'baixa' || estado === 'normal'
      }
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda Geral</h1>
          <p className="text-sm text-muted-foreground">Vagas e ocupação da unidade, por dia e horário</p>
        </div>
        {/* POST /alunos e admin-only -- nao oferecer o botao pra quem so receberia 403. */}
        {isAdmin ? <Button onClick={() => navigate('/alunos')}>Novo aluno</Button> : null}
      </div>

      <div>
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {materiaIds.length > 0 ? 'Visão da unidade (matéria filtrada)' : 'Visão da unidade'}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard titulo="Alunos" valor={agregado.totalAlunosAtivos} legenda="ativos" icon={Users} cor="azul" />
          <MetricCard
            titulo="Capacidade"
            valor={`${agregado.totalAlunosAtivos} / ${agregado.capacidadeSimultanea}`}
            legenda={`máx. ${agregado.capacidadeSimultanea}`}
            icon={Gauge}
            cor="ambar"
          />
          <MetricCard
            titulo="Vagas disponíveis"
            valor={excedida ? 'Excedida' : vagasDisponiveis}
            legenda={excedida ? `${Math.abs(vagasDisponiveis)} acima do limite` : 'disponíveis'}
            icon={BedDouble}
            cor={excedida ? 'vermelho' : 'verde'}
          />
          <MetricCard
            titulo="Ocupação"
            valor={`${Math.min(100, ocupacaoPercentual)}%`}
            legenda="da capacidade da unidade"
            icon={TrendingUp}
            cor={ocupacaoPercentual >= 90 ? 'vermelho' : 'azul'}
            progresso={ocupacaoPercentual}
          />
        </div>
      </div>

      {/* Chip pequeno, não `MetricCard` -- isso é um input que muda estado (destaque na
          grade), não um dado pra só olhar; um card do tamanho dos de cima pesaria demais
          pra essa função. */}
      <div className="flex flex-wrap gap-2">
        {CHIPS_ESTADO.map((chip) => (
          <button
            key={chip.valor}
            type="button"
            onClick={() => alternarDestaque(chip.valor)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              destaque === chip.valor ? chip.ativo : 'border-input text-muted-foreground hover:bg-accent',
            )}
          >
            <chip.icon className="size-3.5" />
            {chip.label}
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
              {chip.contagem}
            </span>
          </button>
        ))}
      </div>

      <MultiSelectCombobox
        className="w-48"
        placeholder="Matéria"
        options={(materias ?? []).map((m) => ({ value: m.id, label: m.nome }))}
        value={materiaIds}
        onValueChange={atualizarMaterias}
      />

      {horarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum professor disponível para essa matéria.</p>
      ) : (
        <ScheduleGrid
          colunas={colunas}
          horarios={horarios}
          ocupacaoDaCelula={ocupacaoDaCelula}
          emDestaque={emDestaque}
          modoCelula="ocupacao"
          materias={materias ?? []}
        />
      )}
    </div>
  )
}
