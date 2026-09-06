import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { calcularOcupacaoCelula, derivarAgendaSlots, type AgendaSlotOutputType, type OcupacaoCelula } from '@shared/dto'

import { AlunoInspectorSheet } from '../../components/common/aluno-inspector-sheet'
import { DIAS_SEMANA_GRADE } from '../../components/common/dias-semana'
import { MultiSelectCombobox } from '../../components/common/multi-select-combobox'
import { PillToggleGroup } from '../../components/common/pill-toggle-group'
import { ScheduleGrid, type ScheduleGridColumn } from '../../components/common/schedule-grid'
import { Skeleton } from '../../components/ui/skeleton'
import { useApiQuery } from '../../hooks/use-api'
import { gerarSlotsHorario } from '../../lib/gerar-slots-horario'
import { comFiltroAtualizado, comFiltroListaAtualizado, lerFiltrosDaUrl } from './agenda-filtros'

const TOGGLES_BINARIOS = [
  { value: 'connect', label: 'Connect' },
  { value: 'zonaVermelha', label: 'Zona Vermelha' },
  { value: 'regular', label: 'Regular' },
  { value: 'preEscolar', label: 'Pré-escolar' },
] as const

export function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // `keepPreviousData`: sem isso, o `refetch()` disparado por "adicionar
  // aluno nesse horário" (dentro do modal do `ScheduleGrid`) zera `painel`
  // por um instante, o guard de loading abaixo desmonta a grade inteira e o
  // modal recém-aberto fecha sozinho -- só pra reabrir com os mesmos dados.
  const { data: painel, refetch: refetchPainel } = useApiQuery('obterPainel', {}, { keepPreviousData: true })
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })

  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null)

  const filtros = lerFiltrosDaUrl(searchParams)
  const { materiaIds, estagios, alunoIds, connect, zonaVermelha, regular, preEscolar } = filtros

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

  // Lista vazia (nenhum professorId na URL, inclusive "Todos" no combobox)
  // significa todos os professores -- mesmo criterio de Disciplina/Estagio/
  // Aluno, pra "Todos" ter o mesmo efeito em todo filtro da tela.
  const professoresOrdenados = [...(painel?.professores ?? [])].sort((a, b) => a.nome.localeCompare(b.nome))
  const professorAtualIds =
    filtros.professorIds.length > 0 ? filtros.professorIds : professoresOrdenados.map((p) => p.id)

  const slotsDosProfessores = useMemo(() => {
    if (!painel) return []
    return professorAtualIds.flatMap((professorId) => derivarAgendaSlots(painel, { professorId }))
  }, [painel, professorAtualIds])

  const slotsFiltrados = useMemo(
    () =>
      slotsDosProfessores.filter(
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
    [slotsDosProfessores, materiaIds, estagios, alunoIds, connect, zonaVermelha, regular, preEscolar],
  )

  // Não gate em `loading`: com `keepPreviousData`, ele continua `true`
  // durante um refetch em segundo plano (ex.: depois de "adicionar aluno"),
  // e `painel` já está populado nesse momento -- só falta mesmo na
  // primeiríssima carga da tela.
  if (!painel) {
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

  const professoresSelecionados = painel.professores.filter((p) => professorAtualIds.includes(p.id))
  // Uniao das janelas de atendimento dos professores selecionados (mesmo
  // criterio que a Agenda Geral ja usa pra unir professores diferentes).
  const horarioInicial = professoresSelecionados.reduce(
    (min, p) => (p.horarioInicial < min ? p.horarioInicial : min),
    professoresSelecionados[0]?.horarioInicial ?? '08:00',
  )
  const horarioFinal = professoresSelecionados.reduce(
    (max, p) => (p.horarioFinal > max ? p.horarioFinal : max),
    professoresSelecionados[0]?.horarioFinal ?? '18:00',
  )
  const horarios = professoresSelecionados.length > 0 ? gerarSlotsHorario(horarioInicial, horarioFinal) : []

  const materiasDoProfessor = [...new Set(slotsDosProfessores.map((s) => s.materiaId))]
    .map((id) => materias?.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
  const estagiosDoProfessor = [...new Set(slotsDosProfessores.map((s) => s.estagio).filter(Boolean))] as string[]
  const alunosDoProfessor = [...new Map(slotsDosProfessores.map((s) => [s.alunoId, s.alunoNome])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Sem seletor de semana: MatriculaHorario e um template semanal
  // recorrente (dia + horario), sem data propria -- toda semana mostra
  // exatamente a mesma programacao, entao navegar semana so trocaria um
  // rotulo de data sem nenhum efeito na grade (ver docs/pr-fe-06-agenda.md).
  const colunas: ScheduleGridColumn[] = DIAS_SEMANA_GRADE.map((dia) => ({
    key: dia.valor,
    header: <p className="font-semibold">{dia.label}</p>,
    label: dia.label,
  }))

  function slotsDaCelula(diaSemana: string, horario: string): AgendaSlotOutputType[] {
    return slotsFiltrados.filter((slot) => slot.diaSemana === diaSemana && slot.horario === horario)
  }

  // Ocupacao "de verdade" (ignora os filtros da toolbar, ver comentario em
  // ScheduleGrid) -- coluna aqui e sempre o dia. `painel!`: o early-return
  // de `loading || !painel` acima ja garante isso, mas o narrowing nao
  // atravessa o limite dessa function declaration.
  //
  // Com 1 professor so, e exatamente o calculo de sempre (gradiente normal
  // de cor). Com 2+, ocupantes/overflow de todos os professores selecionados
  // se juntam numa lista so (cada card ja mostra o nome do professor, ver
  // `OcupanteCard` em schedule-grid.tsx) mas `capacidade` fica 0 de proposito
  // -- somar `capacidadePorHorario` de professores diferentes num so
  // percentual sugeriria que eles dividem uma capacidade em comum, o que nao
  // e real (cada um tem sua propria capacidade de atendimento). `capacidade
  // <= 0` ja faz `estiloOcupacao` (schedule-grid.tsx) nao colorir o fundo,
  // sem precisar mudar nada no componente compartilhado com a Agenda Geral.
  function ocupacaoDaCelula(diaSemana: string, horario: string): OcupacaoCelula {
    const porProfessor = professorAtualIds.map((professorId) =>
      calcularOcupacaoCelula(painel!, { professorId, diaSemana, horario }),
    )
    if (porProfessor.length <= 1) {
      return porProfessor[0] ?? { ocupantes: [], overflow: [], capacidade: 0 }
    }
    return {
      ocupantes: porProfessor.flatMap((o) => o.ocupantes),
      overflow: porProfessor.flatMap((o) => o.overflow),
      capacidade: 0,
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">Visão semanal por professor</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* `value` e o cru da URL (`filtros.professorIds`), nao o resolvido
            (`professorAtualIds`) -- senao com "Todos" o combobox reabriria
            com cada professor marcado individualmente em vez de só o
            "Todos" (mesmo comportamento visual de Disciplina/Estágio/Aluno
            quando vazio = sem filtro). */}
        <MultiSelectCombobox
          className="w-48"
          placeholder="Professor"
          searchPlaceholder="Buscar professor..."
          options={professoresOrdenados.map((p) => ({ value: p.id, label: p.nome }))}
          value={filtros.professorIds}
          onValueChange={(v) => atualizarFiltroLista('professorIds', v)}
        />

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

      {/* Legenda de cor por professor -- só faz sentido com 2+ selecionados
          (com 1 só, a cor da pill é óbvia/redundante com o combobox acima).
          As pills já usam `professorCorAgenda` como fundo (schedule-grid.tsx),
          então isso é só a decodificação cor -> nome. */}
      {professoresSelecionados.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {professoresSelecionados.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.corAgenda }} />
              {p.nome}
            </span>
          ))}
        </div>
      ) : null}

      {horarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum professor selecionado tem janela de atendimento configurada.
        </p>
      ) : (
        <ScheduleGrid
          colunas={colunas}
          horarios={horarios}
          slotsDaCelula={slotsDaCelula}
          ocupacaoDaCelula={ocupacaoDaCelula}
          materias={materias ?? []}
          professores={painel.professores}
          alunos={painel.alunos}
          onSlotClick={(slot) => setAlunoSelecionado(slot.alunoId)}
          onAlunoAdicionado={refetchPainel}
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
