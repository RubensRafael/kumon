import { BedDouble, Gauge, TrendingUp, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { calcularAgregacoesPainel } from '@shared/dto'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { usePainelSnapshot } from '../../hooks/use-painel-snapshot'
import { MetricCard } from './components/metric-card'
import { ProfessoresTabela } from './components/professores-tabela'

const DIA_LABEL: Record<string, string> = {
  SEG: 'Seg',
  TER: 'Ter',
  QUA: 'Qua',
  QUI: 'Qui',
  SEX: 'Sex',
  SAB: 'Sáb',
}

const CORES_DONUT = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function PainelPage() {
  const { dados: data, loading } = usePainelSnapshot()
  const agregado = useMemo(() => (data ? calcularAgregacoesPainel(data) : null), [data])

  if (loading || !agregado) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel da Unidade</h1>
          <p className="text-sm text-muted-foreground">Visão geral e indicadores em tempo real</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const vagasDisponiveis = agregado.capacidadeSimultanea - agregado.totalAlunosAtivos
  const excedida = vagasDisponiveis < 0
  const ocupacaoAlunosPercentual =
    agregado.capacidadeSimultanea > 0
      ? Math.round((agregado.totalAlunosAtivos / agregado.capacidadeSimultanea) * 100)
      : 0

  const dadosDonut = agregado.matriculasPorMateria.map((item) => ({
    name: item.materiaNome,
    value: item.total,
  }))
  const dadosProfessor = agregado.matriculasPorProfessor.map((item) => ({
    professor: item.professorNome,
    total: item.total,
  }))
  const dadosDia = agregado.aulasPorDiaSemana.map((item) => ({
    dia: DIA_LABEL[item.diaSemana] ?? item.diaSemana,
    total: item.total,
  }))

  const chartConfigMateria: ChartConfig = Object.fromEntries(
    dadosDonut.map((item, i) => [item.name, { label: item.name, color: CORES_DONUT[i % CORES_DONUT.length] }]),
  )
  const chartConfigBarra: ChartConfig = { total: { label: 'Matrículas', color: 'var(--chart-1)' } }
  const chartConfigDia: ChartConfig = { total: { label: 'Aulas', color: 'var(--chart-4)' } }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel da Unidade</h1>
        <p className="text-sm text-muted-foreground">Visão geral e indicadores em tempo real</p>
      </div>

      <div>
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Visão da unidade</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            titulo="Total de alunos"
            valor={agregado.totalAlunosAtivos}
            legenda="ativos"
            icon={Users}
            cor="azul"
          />
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
            valor={`${Math.min(100, ocupacaoAlunosPercentual)}%`}
            legenda="da capacidade da unidade"
            icon={TrendingUp}
            cor={ocupacaoAlunosPercentual >= 90 ? 'vermelho' : 'azul'}
            progresso={ocupacaoAlunosPercentual}
          />
        </div>
      </div>

      {/* `data` já está garantido aqui pelo guard de loading/agregado acima. */}
      <ProfessoresTabela dados={data!} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
              Matrículas por matéria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigMateria} className="mx-auto aspect-square max-h-64">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={dadosDonut} dataKey="value" nameKey="name" innerRadius={50}>
                  {dadosDonut.map((item, i) => (
                    <Cell key={item.name} fill={CORES_DONUT[i % CORES_DONUT.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
              Distribuição por professor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigBarra} className="max-h-64 w-full">
              <BarChart data={dadosProfessor}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="professor" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
              Aulas por dia da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigDia} className="max-h-64 w-full">
              <BarChart data={dadosDia}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
            Alertas inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {agregado.alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : (
            agregado.alertas.map((alerta) => (
              <div
                key={alerta.alunoId}
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {alerta.mensagem}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
