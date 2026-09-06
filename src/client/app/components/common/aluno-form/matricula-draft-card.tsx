import { Trash2 } from 'lucide-react'

import type { MateriaOutputType, ProfessorOutputType, TipoAtendimento } from '@shared/dto'

import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { TIPO_ATENDIMENTO_LABEL } from './enum-labels'
import { ProgramacaoSemanalGrid, type ProgramacaoSemanal } from './programacao-semanal-grid'

export interface MatriculaDraft {
  key: string
  professorId: string
  materiaId: string
  estagio: string
  tipoAtendimento: TipoAtendimento
  observacoes: string
  programacao: ProgramacaoSemanal
}

/** Matrícula ainda não persistida — some do POST /alunos até o form inteiro ser salvo. */
export function MatriculaDraftCard({
  draft,
  professores,
  materias,
  onChange,
  onRemover,
}: {
  draft: MatriculaDraft
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onChange: (draft: MatriculaDraft) => void
  onRemover: () => void
}) {
  const materiaNome = materias.find((m) => m.id === draft.materiaId)?.nome ?? 'Nova matrícula'
  // So oferecer professor que leciona a materia escolhida -- sem isso, o
  // form deixa criar uma matricula de Matematica com um professor que so
  // leciona Portugues (o backend recusa, mas so depois do submit).
  const professoresDaMateria = draft.materiaId
    ? professores.filter((professor) => professor.materiaIds.includes(draft.materiaId))
    : professores
  const professorSelecionado = professores.find((professor) => professor.id === draft.professorId)

  function aoTrocarMateria(materiaId: string) {
    const aindaLeciona = professores
      .find((professor) => professor.id === draft.professorId)
      ?.materiaIds.includes(materiaId)
    onChange({ ...draft, materiaId, professorId: aindaLeciona ? draft.professorId : '' })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <span className="font-medium">{materiaNome}</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemover}>
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={draft.materiaId} onValueChange={aoTrocarMateria}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {materias.map((materia) => (
                  <SelectItem key={materia.id} value={materia.id}>
                    {materia.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Professor</Label>
            <Select
              value={draft.professorId}
              onValueChange={(professorId) => onChange({ ...draft, professorId })}
              disabled={Boolean(draft.materiaId) && professoresDaMateria.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !draft.materiaId
                      ? 'Escolha a disciplina primeiro'
                      : professoresDaMateria.length === 0
                        ? 'Nenhum professor para essa disciplina'
                        : 'Selecione'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {professoresDaMateria.map((professor) => (
                  <SelectItem key={professor.id} value={professor.id}>
                    {professor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estágio</Label>
            <Input value={draft.estagio} onChange={(e) => onChange({ ...draft, estagio: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de atendimento</Label>
            <Select
              value={draft.tipoAtendimento}
              onValueChange={(tipoAtendimento) =>
                onChange({ ...draft, tipoAtendimento: tipoAtendimento as TipoAtendimento })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGULAR">{TIPO_ATENDIMENTO_LABEL.REGULAR}</SelectItem>
                <SelectItem value="PRE_ESCOLAR">{TIPO_ATENDIMENTO_LABEL.PRE_ESCOLAR}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Programação semanal</Label>
          <ProgramacaoSemanalGrid
            valores={draft.programacao}
            professor={professorSelecionado}
            onChange={(dia, valor) =>
              onChange({ ...draft, programacao: { ...draft.programacao, [dia]: valor } })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
