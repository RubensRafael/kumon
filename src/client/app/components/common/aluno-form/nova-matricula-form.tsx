import { useState } from 'react'

import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { useApiMutation } from '../../../hooks/use-api-mutation'
import { Button } from '../../ui/button'
import { DIAS_SEMANA } from '../dias-semana'
import { MatriculaDraftCard, type MatriculaDraft } from './matricula-draft-card'
import { programacaoSemanalVazia } from './programacao-semanal-grid'

function draftVazio(): MatriculaDraft {
  return {
    key: 'nova',
    professorId: '',
    materiaId: '',
    estagio: '',
    tipoAtendimento: 'REGULAR',
    observacoes: '',
    programacao: programacaoSemanalVazia(),
  }
}

/** "+ Nova matrícula" num aluno que já existe — persiste assim que salva, sem estágio de rascunho. */
export function NovaMatriculaForm({
  alunoId,
  professores,
  materias,
  onCriada,
  onCancelar,
}: {
  alunoId: string
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onCriada: () => void
  onCancelar: () => void
}) {
  const [draft, setDraft] = useState<MatriculaDraft>(draftVazio())
  const { mutate: criarMatricula, loading: criandoMatricula } = useApiMutation('criarMatricula')
  const { mutate: criarHorario } = useApiMutation('criarHorario')
  const [erro, setErro] = useState<string | null>(null)

  async function aoSalvar() {
    setErro(null)
    if (!draft.materiaId || !draft.professorId) {
      setErro('Selecione a disciplina e o professor.')
      return
    }

    try {
      const matricula = await criarMatricula({
        params: { alunoId },
        body: {
          professorId: draft.professorId,
          materiaId: draft.materiaId,
          estagio: draft.estagio || undefined,
          tipoAtendimento: draft.tipoAtendimento,
          observacoes: draft.observacoes || undefined,
        },
      })

      for (const dia of DIAS_SEMANA) {
        const valor = draft.programacao[dia.valor]
        if (valor.frequenta) {
          await criarHorario({ params: { matriculaId: matricula.id }, body: { diaSemana: dia.valor, horario: valor.horario } })
        }
      }

      onCriada()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível criar a matrícula.')
    }
  }

  return (
    <div className="space-y-3">
      <MatriculaDraftCard
        draft={draft}
        professores={professores}
        materias={materias}
        onChange={setDraft}
        onRemover={onCancelar}
      />
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void aoSalvar()} disabled={criandoMatricula}>
          {criandoMatricula ? 'Salvando...' : 'Salvar matrícula'}
        </Button>
      </div>
    </div>
  )
}
