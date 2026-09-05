import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { derivarAgendaSlots, type AgendaSlotOutputType } from '@shared/dto'

import { AlunoInspectorSheet } from '../../components/common/aluno-inspector-sheet'
import { DIAS_SEMANA } from '../../components/common/dias-semana'
import { gerarSlotsHorario } from '../../components/common/gerar-slots-horario'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { WeekdayTabs } from '../../components/common/weekday-tabs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useApiQuery } from '../../hooks/use-api-query'

type DiaSemana6 = (typeof DIAS_SEMANA)[number]['valor']

export function AgendaGeralPage() {
  const navigate = useNavigate()
  const { data: painel, loading } = useApiQuery('obterPainel', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })
  const [dia, setDia] = useState<DiaSemana6>('SEG')
  const [busca, setBusca] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const slotsDoDia = useMemo(() => {
    if (!painel) return []
    const todos = derivarAgendaSlots(painel).filter((slot) => slot.diaSemana === dia)
    const termo = busca.trim().toLowerCase()
    if (!termo) return todos
    return todos.filter(
      (slot) =>
        slot.alunoNome.toLowerCase().includes(termo) || slot.professorNome.toLowerCase().includes(termo),
    )
  }, [painel, dia, busca])

  if (loading || !painel) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  const professoresOrdenados = [...painel.professores].sort((a, b) => a.nome.localeCompare(b.nome))
  const horarioInicial = professoresOrdenados.reduce(
    (min, p) => (p.horarioInicial < min ? p.horarioInicial : min),
    professoresOrdenados[0]?.horarioInicial ?? '08:00',
  )
  const horarioFinal = professoresOrdenados.reduce(
    (max, p) => (p.horarioFinal > max ? p.horarioFinal : max),
    professoresOrdenados[0]?.horarioFinal ?? '18:00',
  )
  const horarios = gerarSlotsHorario(horarioInicial, horarioFinal)

  const colunas: ScheduleGridColumn[] = professoresOrdenados.map((professor) => {
    const materiasDoProfessor = professores?.find((p) => p.id === professor.id)?.materiaIds
    const nomesMaterias = materiasDoProfessor
      ?.map((id) => materias?.find((m) => m.id === id)?.nome)
      .filter(Boolean)
      .join(' · ')
    const alunosNoDia = new Set(
      slotsDoDia.filter((slot) => slot.professorId === professor.id).map((slot) => slot.alunoId),
    ).size

    return {
      key: professor.id,
      header: (
        <div>
          <p className="font-semibold">{professor.nome}</p>
          {nomesMaterias ? <p className="text-xs text-muted-foreground">{nomesMaterias}</p> : null}
          <p className="text-xs text-muted-foreground">{alunosNoDia} aluno(s)</p>
        </div>
      ),
    }
  })

  function slotsDaCelula(professorId: string, horario: string): AgendaSlotOutputType[] {
    return slotsDoDia.filter((slot) => slot.professorId === professorId && slot.horario === horario)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda Geral</h1>
          <p className="text-sm text-muted-foreground">Grade semanal por professor</p>
        </div>
        <Button onClick={() => navigate('/alunos')}>Novo aluno</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <WeekdayTabs value={dia} onChange={setDia} />
        <Input
          placeholder="Pesquisar aluno, professor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <ScheduleGrid
        colunas={colunas}
        horarios={horarios}
        slotsDaCelula={slotsDaCelula}
        onSlotClick={(slot) => setAlunoSelecionado(slot.alunoId)}
      />

      <AlunoInspectorSheet
        open={Boolean(alunoSelecionado)}
        onOpenChange={(open) => !open && setAlunoSelecionado(null)}
        alunoId={alunoSelecionado}
        professores={professores ?? []}
        materias={materias ?? []}
        onAtualizado={() => setAlunoSelecionado(null)}
      />
    </div>
  )
}
