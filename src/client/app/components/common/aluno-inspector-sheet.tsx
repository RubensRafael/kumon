import { MessageCircle, Pencil, Phone } from 'lucide-react'
import { useState } from 'react'

import type { AlunoOutputType, MateriaOutputType, MatriculaOutputType, ProfessorOutputType } from '@shared/dto'

import { paraExibicao } from '../../lib/format-date'
import { useApiQuery } from '../../hooks/use-api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AlunoFormDialog } from './aluno-form/aluno-form-dialog'
import { SITUACAO_ALUNO_LABEL, SITUACAO_MATRICULA_LABEL, TIPO_ATENDIMENTO_LABEL } from './aluno-form/enum-labels'
import { DIAS_SEMANA } from './dias-semana'
import { corDaMateria } from './materia-cores'

function LinhaDado({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="shrink-0 text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="truncate text-right text-sm">{valor || '—'}</span>
    </div>
  )
}

function AlunoDadosReadOnly({ aluno }: { aluno: AlunoOutputType }) {
  return (
    <div className="py-4 text-sm">
      <LinhaDado label="Situação" valor={SITUACAO_ALUNO_LABEL[aluno.situacao]} />
      <LinhaDado label="Nascimento" valor={paraExibicao(aluno.dataNascimento)} />
      <LinhaDado label="Data da matrícula" valor={paraExibicao(aluno.dataMatricula)} />
      <LinhaDado label="Responsável" valor={aluno.responsavel} />
      <div className="flex gap-4 border-b py-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="size-3.5" />
          {aluno.telefone || '—'}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="size-3.5" />
          {aluno.whatsapp || '—'}
        </span>
      </div>
      <LinhaDado label="Email" valor={aluno.email} />
      <LinhaDado label="Observações" valor={aluno.observacoes} />

      <div className="pt-3">
        <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">Categorias</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="size-2.5 rounded-full bg-red-500" />
              Zona Vermelha
            </span>
            {/* Read-only -- refletindo o estado real, não um controle. Editar é só via "Atualizar aluno/matrícula". */}
            <Switch checked={aluno.zonaVermelha} disabled />
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                C
              </span>
              Connect
            </span>
            <Switch checked={aluno.connect} disabled />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Mesmas informações de `MatriculaExistenteCard`, só que read-only -- sem
 * `<Select>` de situação, sem editar observações, sem toggle de dia. A
 * programação semanal aparece como uma mini-grade Seg-Sáb (mesma ideia do
 * `ProgramacaoSemanalGrid`, só que só leitura). Nenhum botão de ação
 * (editar/duplicar/excluir por matrícula, "+ nova matrícula") -- só existem
 * no app de referência que inspirou o visual, não fazem sentido aqui.
 */
function MatriculaReadOnlyCard({
  matricula,
  professores,
  materias,
}: {
  matricula: MatriculaOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
}) {
  const professorNome = professores.find((p) => p.id === matricula.professorId)?.nome ?? '—'
  const materiaNome = materias.find((m) => m.id === matricula.materiaId)?.nome ?? '—'
  const { data: horarios } = useApiQuery('listarHorariosDaMatricula', { params: { matriculaId: matricula.id } })
  const horarioPorDia = new Map((horarios ?? []).filter((h) => h.ativo).map((h) => [h.diaSemana, h.horario]))

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: corDaMateria(matricula.materiaId, materias) }}
          >
            {materiaNome.charAt(0).toUpperCase()}
          </span>
          <span className="truncate font-medium">{materiaNome}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            · {TIPO_ATENDIMENTO_LABEL[matricula.tipoAtendimento]}
          </span>
        </div>
        <Badge variant={matricula.situacao === 'ATIVA' ? 'default' : 'secondary'} className="shrink-0">
          {SITUACAO_MATRICULA_LABEL[matricula.situacao]}
        </Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {professorNome}
        {matricula.estagio ? ` · ${matricula.estagio}` : ''}
      </p>
      {matricula.observacoes ? <p className="mt-2 text-sm">{matricula.observacoes}</p> : null}
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px]">
        {DIAS_SEMANA.map((dia) => {
          const horario = horarioPorDia.get(dia.valor)
          return (
            <div
              key={dia.valor}
              className={
                horario
                  ? 'rounded bg-primary/10 px-1 py-1 text-primary'
                  : 'rounded bg-muted px-1 py-1 text-muted-foreground/50'
              }
            >
              <p className="font-medium">{dia.label}</p>
              <p>{horario ?? '—'}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Painel lateral de inspecionar um aluno -- usado pela Agenda (fe-06) ao
 * clicar numa pill. Puramente read-only (dados do aluno + matrículas, em
 * abas); a única ação de verdade é o botão "Atualizar aluno/matrícula", que
 * abre o `AlunoFormDialog` de edição de verdade por cima (mesmo componente
 * usado em `/alunos`). Antes desta tela, o clique na pill abria o
 * `AlunoForm` editável direto -- gerava edição acidental num painel que era
 * pra ser só consulta rápida durante a leitura da agenda.
 */
export function AlunoInspectorSheet({
  open,
  onOpenChange,
  alunoId,
  professores,
  materias,
  onAtualizado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  alunoId: string | null
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onAtualizado: () => void
}) {
  const [editando, setEditando] = useState(false)

  const { data: aluno } = useApiQuery(
    'buscarAluno',
    { params: { id: alunoId ?? '' } },
    { enabled: Boolean(alunoId) },
  )
  const { data: matriculas } = useApiQuery(
    'listarMatriculasDoAluno',
    { params: { alunoId: alunoId ?? '' } },
    { enabled: Boolean(alunoId) },
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {/* `pr-10`: reserva espaço pro X de fechar (absolute, canto superior direito do
            SheetContent) não flutuar por cima do botão de ação. */}
        <SheetHeader className="flex-row items-center justify-between gap-2 pr-10">
          <SheetTitle className="flex min-w-0 items-center gap-2 text-lg">
            <span className="truncate">{aluno ? aluno.nome : 'Aluno'}</span>
            {aluno?.connect ? (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                C
              </span>
            ) : null}
          </SheetTitle>
          {aluno ? (
            <Button size="sm" onClick={() => setEditando(true)} className="shrink-0 gap-1.5">
              <Pencil className="size-3.5" />
              Atualizar aluno/matrícula
            </Button>
          ) : null}
        </SheetHeader>
        <div className="px-4 pb-4">
          {!alunoId || !aluno ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecione um aluno na agenda para visualizar dados, matrículas e categorias.
            </p>
          ) : (
            <>
              <Tabs defaultValue="dados">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados">Dados do aluno</TabsTrigger>
                  <TabsTrigger value="matriculas">Matrículas</TabsTrigger>
                </TabsList>
                <TabsContent value="dados">
                  <AlunoDadosReadOnly aluno={aluno} />
                </TabsContent>
                <TabsContent value="matriculas">
                  <div className="space-y-3 py-4">
                    {!matriculas || matriculas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem matrículas.</p>
                    ) : (
                      matriculas.map((matricula) => (
                        <MatriculaReadOnlyCard
                          key={matricula.id}
                          matricula={matricula}
                          professores={professores}
                          materias={materias}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <AlunoFormDialog
                open={editando}
                onOpenChange={setEditando}
                aluno={aluno}
                professores={professores}
                materias={materias}
                onSalvo={onAtualizado}
                onPainelAtualizado={onAtualizado}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
