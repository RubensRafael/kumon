import { useState } from 'react'

import type { AlunoOutputType, MateriaOutputType, MatriculaOutputType, ProfessorOutputType } from '@shared/dto'

import { paraExibicao } from '../../lib/format-date'
import { useApiQuery } from '../../hooks/use-api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AlunoFormDialog } from './aluno-form/aluno-form-dialog'
import { SITUACAO_ALUNO_LABEL, SITUACAO_MATRICULA_LABEL, TIPO_ATENDIMENTO_LABEL } from './aluno-form/enum-labels'
import { horariosTexto } from './dias-semana'

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p>{valor || '—'}</p>
    </div>
  )
}

function AlunoDadosReadOnly({ aluno }: { aluno: AlunoOutputType }) {
  return (
    <div className="space-y-4 py-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Responsável" valor={aluno.responsavel} />
        <Campo label="Telefone" valor={aluno.telefone} />
        <Campo label="WhatsApp" valor={aluno.whatsapp} />
        <Campo label="Email" valor={aluno.email} />
        <Campo label="Data de nascimento" valor={paraExibicao(aluno.dataNascimento)} />
        <Campo label="Data da matrícula" valor={paraExibicao(aluno.dataMatricula)} />
      </div>
      <Campo label="Observações" valor={aluno.observacoes} />
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={aluno.situacao === 'ATIVO' ? 'default' : 'secondary'}>
          {SITUACAO_ALUNO_LABEL[aluno.situacao]}
        </Badge>
        {aluno.zonaVermelha ? <Badge variant="destructive">Zona Vermelha</Badge> : null}
        {aluno.connect ? <Badge variant="secondary">Connect</Badge> : null}
      </div>
    </div>
  )
}

/**
 * Mesmas informações de `MatriculaExistenteCard`, só que read-only -- sem
 * `<Select>` de situação, sem editar observações, sem
 * `ProgramacaoSemanalGrid` (toggle por dia). Só consulta, nada de mutação.
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
  const horariosAtivos = (horarios ?? []).filter((h) => h.ativo)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <span className="font-medium">
          {materiaNome} · {professorNome}
        </span>
        <Badge variant={matricula.situacao === 'ATIVA' ? 'default' : 'secondary'}>
          {SITUACAO_MATRICULA_LABEL[matricula.situacao]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Campo label="Estágio" valor={matricula.estagio} />
          <Campo label="Tipo de atendimento" valor={TIPO_ATENDIMENTO_LABEL[matricula.tipoAtendimento]} />
        </div>
        {matricula.observacoes ? <Campo label="Observações" valor={matricula.observacoes} /> : null}
        <Campo
          label="Programação semanal"
          valor={horariosAtivos.length > 0 ? horariosTexto(horariosAtivos) : 'Sem horários.'}
        />
      </CardContent>
    </Card>
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
        <SheetHeader>
          <SheetTitle>Aluno</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          {!alunoId || !aluno ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecione um aluno na agenda para visualizar dados, matrículas e categorias.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="min-w-0 truncate text-lg font-semibold">{aluno.nome}</h2>
                <Button size="sm" onClick={() => setEditando(true)}>
                  Atualizar aluno/matrícula
                </Button>
              </div>

              <Tabs defaultValue="dados">
                <TabsList>
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
