import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { derivarAgendaSlots, type AgendaSlotOutputType } from '@shared/dto'

import { AlunoInspectorSheet } from '../../components/common/aluno-inspector-sheet'
import { DIAS_SEMANA } from '../../components/common/dias-semana'
import { gerarSlotsHorario } from '../../components/common/gerar-slots-horario'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Toggle } from '../../components/ui/toggle'
import { useApiQuery } from '../../hooks/use-api-query'

function segundaDaSemanaDe(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay()
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia))
  d.setHours(0, 0, 0, 0)
  return d
}

function formatarDataCurta(data: Date): string {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function AgendaPage() {
  const [searchParams] = useSearchParams()
  const { data: painel, loading } = useApiQuery('obterPainel', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })

  const [professorId, setProfessorId] = useState(searchParams.get('professorId') ?? '')
  const [semanaInicio, setSemanaInicio] = useState(() => segundaDaSemanaDe(new Date()))
  const [materiaId, setMateriaId] = useState<string>('')
  const [estagio, setEstagio] = useState<string>('')
  const [connect, setConnect] = useState(false)
  const [zonaVermelha, setZonaVermelha] = useState(false)
  const [regular, setRegular] = useState(false)
  const [preEscolar, setPreEscolar] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const professorAtualId = professorId || painel?.professores[0]?.id || ''

  const slotsDoProfessor = useMemo(() => {
    if (!painel || !professorAtualId) return []
    return derivarAgendaSlots(painel, { professorId: professorAtualId })
  }, [painel, professorAtualId])

  const slotsFiltrados = useMemo(
    () =>
      slotsDoProfessor.filter(
        (slot) =>
          (!materiaId || slot.materiaId === materiaId) &&
          (!estagio || slot.estagio === estagio) &&
          (!connect || slot.alunoConnect) &&
          (!zonaVermelha || slot.alunoZonaVermelha) &&
          ((!regular && !preEscolar) ||
            (regular && slot.tipoAtendimento === 'REGULAR') ||
            (preEscolar && slot.tipoAtendimento === 'PRE_ESCOLAR')),
      ),
    [slotsDoProfessor, materiaId, estagio, connect, zonaVermelha, regular, preEscolar],
  )

  if (loading || !painel) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  const professor = painel.professores.find((p) => p.id === professorAtualId)
  const horarios = professor ? gerarSlotsHorario(professor.horarioInicial, professor.horarioFinal) : []

  const materiasDoProfessor = [...new Set(slotsDoProfessor.map((s) => s.materiaId))]
    .map((id) => materias?.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
  const estagiosDoProfessor = [...new Set(slotsDoProfessor.map((s) => s.estagio).filter(Boolean))] as string[]

  // Semana é só orientação visual (a data exibida em cada coluna) -- a
  // programação em si é um template semanal recorrente (MatriculaHorario
  // não tem data própria), então navegar a semana não muda quais células
  // aparecem ocupadas, só as datas no cabeçalho.
  const colunas: ScheduleGridColumn[] = DIAS_SEMANA.map((dia, i) => {
    const data = new Date(semanaInicio)
    data.setDate(data.getDate() + i)
    return {
      key: dia.valor,
      header: (
        <div>
          <p className="font-semibold">{dia.label === 'Sáb' ? 'Sábado' : dia.label}</p>
          <p className="text-xs text-muted-foreground">{formatarDataCurta(data)}</p>
        </div>
      ),
    }
  })

  function slotsDaCelula(diaSemana: string, horario: string): AgendaSlotOutputType[] {
    return slotsFiltrados.filter((slot) => slot.diaSemana === diaSemana && slot.horario === horario)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">Visão semanal por professor</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={professorAtualId} onValueChange={setProfessorId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {painel.professores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setSemanaInicio((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() - 7))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {formatarDataCurta(semanaInicio)} – {formatarDataCurta(new Date(semanaInicio.getFullYear(), semanaInicio.getMonth(), semanaInicio.getDate() + 5))}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSemanaInicio((s) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7))}
        >
          <ChevronRight className="size-4" />
        </Button>

        <Select value={materiaId || 'todas'} onValueChange={(v) => setMateriaId(v === 'todas' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Disciplina</SelectItem>
            {materiasDoProfessor.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estagio || 'todos'} onValueChange={(v) => setEstagio(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estágio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estágio</SelectItem>
            {estagiosDoProfessor.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Toggle pressed={connect} onPressedChange={setConnect} variant="outline">
          Connect
        </Toggle>
        <Toggle pressed={zonaVermelha} onPressedChange={setZonaVermelha} variant="outline">
          Zona Vermelha
        </Toggle>
        <Toggle pressed={regular} onPressedChange={setRegular} variant="outline">
          Regular
        </Toggle>
        <Toggle pressed={preEscolar} onPressedChange={setPreEscolar} variant="outline">
          Pré-escolar
        </Toggle>
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
