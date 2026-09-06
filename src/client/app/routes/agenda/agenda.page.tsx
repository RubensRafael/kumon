import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { calcularOcupacaoCelula, derivarAgendaSlots, type AgendaSlotOutputType } from '@shared/dto'

import { AlunoInspectorSheet } from '../../components/common/aluno-inspector-sheet'
import { DIAS_SEMANA } from '../../components/common/dias-semana'
import { gerarSlotsHorario } from '../../components/common/gerar-slots-horario'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { Toggle } from '../../components/ui/toggle'
import { useApiQuery } from '../../hooks/use-api'
import { comFiltroAtualizado, lerFiltrosDaUrl } from './agenda-filtros'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: painel, loading } = useApiQuery('obterPainel', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })

  const [semanaInicio, setSemanaInicio] = useState(() => segundaDaSemanaDe(new Date()))
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const filtros = lerFiltrosDaUrl(searchParams)
  const { materiaId, estagio, connect, zonaVermelha, regular, preEscolar } = filtros

  function atualizarFiltro(chave: Parameters<typeof comFiltroAtualizado>[1], valor: string | boolean) {
    setSearchParams(comFiltroAtualizado(searchParams, chave, valor), { replace: true })
  }

  // Padrao quando a URL nao especifica professor: o primeiro em ordem
  // alfabetica (mesmo criterio que a Agenda Geral ja usa) -- nunca "o que
  // calhar de vir primeiro" na resposta bruta da API, que ja causou a tela
  // abrir vazia num professor com horario invalido.
  const professoresOrdenados = [...(painel?.professores ?? [])].sort((a, b) => a.nome.localeCompare(b.nome))
  const professorAtualId = filtros.professorId || professoresOrdenados[0]?.id || ''

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
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Visão semanal por professor</p>
        </div>
        <Skeleton className="h-9 w-full max-w-3xl rounded-md" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
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
          <p className="font-semibold">{dia.label}</p>
          <p className="text-xs text-muted-foreground">{formatarDataCurta(data)}</p>
        </div>
      ),
    }
  })

  function slotsDaCelula(diaSemana: string, horario: string): AgendaSlotOutputType[] {
    return slotsFiltrados.filter((slot) => slot.diaSemana === diaSemana && slot.horario === horario)
  }

  // Ocupacao "de verdade" (ignora os filtros da toolbar, ver comentario em
  // ScheduleGrid) -- coluna aqui e sempre o dia, o professor e fixo (o
  // selecionado no <Select> acima). `painel!`: o early-return de
  // `loading || !painel` acima ja garante isso, mas o narrowing nao
  // atravessa o limite dessa function declaration.
  function ocupacaoDaCelula(diaSemana: string, horario: string) {
    return calcularOcupacaoCelula(painel!, { professorId: professorAtualId, diaSemana, horario })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">Visão semanal por professor</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={professorAtualId}
          onValueChange={(v) => atualizarFiltro('professorId', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {professoresOrdenados.map((p) => (
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

        <Select
          value={materiaId || 'todas'}
          onValueChange={(v) => atualizarFiltro('materiaId', v === 'todas' ? '' : v)}
        >
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

        <Select
          value={estagio || 'todos'}
          onValueChange={(v) => atualizarFiltro('estagio', v === 'todos' ? '' : v)}
        >
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

        <Toggle pressed={connect} onPressedChange={(v) => atualizarFiltro('connect', v)} variant="outline">
          Connect
        </Toggle>
        <Toggle
          pressed={zonaVermelha}
          onPressedChange={(v) => atualizarFiltro('zonaVermelha', v)}
          variant="outline"
        >
          Zona Vermelha
        </Toggle>
        <Toggle pressed={regular} onPressedChange={(v) => atualizarFiltro('regular', v)} variant="outline">
          Regular
        </Toggle>
        <Toggle
          pressed={preEscolar}
          onPressedChange={(v) => atualizarFiltro('preEscolar', v)}
          variant="outline"
        >
          Pré-escolar
        </Toggle>
      </div>

      {horarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este professor não tem janela de atendimento configurada.
        </p>
      ) : (
        <ScheduleGrid
          colunas={colunas}
          horarios={horarios}
          slotsDaCelula={slotsDaCelula}
          ocupacaoDaCelula={ocupacaoDaCelula}
          onSlotClick={(slot) => setAlunoSelecionado(slot.alunoId)}
        />
      )}

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
