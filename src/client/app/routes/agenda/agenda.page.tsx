import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { calcularOcupacaoCelula, derivarAgendaSlots, type AgendaSlotOutputType } from '@shared/dto'

import { AlunoInspectorSheet } from '../../components/common/aluno-inspector-sheet'
import { DIAS_SEMANA } from '../../components/common/dias-semana'
import { gerarSlotsHorario } from '../../components/common/gerar-slots-horario'
import { MultiSelectCombobox } from '../../components/common/multi-select-combobox'
import { PillToggleGroup } from '../../components/common/pill-toggle-group'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { useApiQuery } from '../../hooks/use-api'
import { comFiltroAtualizado, comFiltroListaAtualizado, lerFiltrosDaUrl } from './agenda-filtros'

const TOGGLES_BINARIOS = [
  { value: 'connect', label: 'Connect' },
  { value: 'zonaVermelha', label: 'Zona Vermelha' },
  { value: 'regular', label: 'Regular' },
  { value: 'preEscolar', label: 'Pré-escolar' },
] as const

export function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: painel, loading } = useApiQuery('obterPainel', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })

  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const filtros = lerFiltrosDaUrl(searchParams)
  const { materiaIds, estagios, alunoIds, connect, zonaVermelha, regular, preEscolar } = filtros

  function atualizarFiltro(chave: Parameters<typeof comFiltroAtualizado>[1], valor: string | boolean) {
    setSearchParams(comFiltroAtualizado(searchParams, chave, valor), { replace: true })
  }

  function atualizarFiltroLista(chave: Parameters<typeof comFiltroListaAtualizado>[1], valores: string[]) {
    setSearchParams(comFiltroListaAtualizado(searchParams, chave, valores), { replace: true })
  }

  const togglesAtivos = TOGGLES_BINARIOS.filter((t) => filtros[t.value]).map((t) => t.value)

  function atualizarToggles(valores: string[]) {
    let proximo = searchParams
    for (const toggle of TOGGLES_BINARIOS) {
      proximo = comFiltroAtualizado(proximo, toggle.value, valores.includes(toggle.value))
    }
    setSearchParams(proximo, { replace: true })
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
          (materiaIds.length === 0 || materiaIds.includes(slot.materiaId)) &&
          (estagios.length === 0 || (slot.estagio !== null && estagios.includes(slot.estagio))) &&
          (alunoIds.length === 0 || alunoIds.includes(slot.alunoId)) &&
          (!connect || slot.alunoConnect) &&
          (!zonaVermelha || slot.alunoZonaVermelha) &&
          ((!regular && !preEscolar) ||
            (regular && slot.tipoAtendimento === 'REGULAR') ||
            (preEscolar && slot.tipoAtendimento === 'PRE_ESCOLAR')),
      ),
    [slotsDoProfessor, materiaIds, estagios, alunoIds, connect, zonaVermelha, regular, preEscolar],
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
  const alunosDoProfessor = [...new Map(slotsDoProfessor.map((s) => [s.alunoId, s.alunoNome])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Sem seletor de semana: MatriculaHorario e um template semanal
  // recorrente (dia + horario), sem data propria -- toda semana mostra
  // exatamente a mesma programacao, entao navegar semana so trocaria um
  // rotulo de data sem nenhum efeito na grade (ver docs/pr-fe-06-agenda.md).
  const colunas: ScheduleGridColumn[] = DIAS_SEMANA.map((dia) => ({
    key: dia.valor,
    header: <p className="font-semibold">{dia.label}</p>,
  }))

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

        <MultiSelectCombobox
          className="w-40"
          placeholder="Disciplina"
          options={materiasDoProfessor.map((m) => ({ value: m.id, label: m.nome }))}
          value={materiaIds}
          onValueChange={(v) => atualizarFiltroLista('materiaIds', v)}
        />

        <MultiSelectCombobox
          className="w-32"
          placeholder="Estágio"
          options={estagiosDoProfessor.map((e) => ({ value: e, label: e }))}
          value={estagios}
          onValueChange={(v) => atualizarFiltroLista('estagios', v)}
        />

        <MultiSelectCombobox
          className="w-40"
          placeholder="Aluno"
          searchPlaceholder="Buscar aluno..."
          options={alunosDoProfessor}
          value={alunoIds}
          onValueChange={(v) => atualizarFiltroLista('alunoIds', v)}
        />

        <PillToggleGroup
          type="multiple"
          value={togglesAtivos}
          onValueChange={atualizarToggles}
          items={TOGGLES_BINARIOS.map((t) => ({ value: t.value, label: t.label }))}
        />
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
          materias={materias ?? []}
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
