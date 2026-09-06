import { useState } from 'react'

import { professorDisponivel, type DiaSemana, type MateriaOutputType } from '@shared/dto'

import { useApiMutation } from '../../hooks/use-api'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export interface ProfessorParaMatricula {
  id: string
  nome: string
  diasDisponiveis: string[]
  horarioInicial: string
  horarioFinal: string
  materiaIds: string[]
}

export interface AlunoParaMatricula {
  id: string
  nome: string
  situacao: string
}

/**
 * Seção no fim do modal de ocupação da célula (schedule-grid.tsx) --
 * adiciona um aluno *nesse* dia/horário específico, direto da grade, sem
 * passar pela ficha do aluno. A lotação exibida na célula é só indicativa
 * (nada no backend impede passar da capacidade do professor), então este
 * formulário nunca bloqueia por causa dela -- só pela disponibilidade real
 * do professor (`professorDisponivel`), a única restrição que o servidor de
 * fato aplica (`criarHorario` rejeita dia/horário fora da janela dele).
 *
 * Sempre cria uma matrícula nova (mesmo padrão de `NovaMatriculaForm`) --
 * adicionar um dia a uma matrícula já existente do aluno continua sendo
 * feito na própria ficha dele (`MatriculaExistenteCard`), não aqui.
 */
export function AdicionarAlunoHorarioForm({
  diaSemana,
  horario,
  professores,
  materias,
  alunos,
  onCriado,
}: {
  diaSemana: string
  horario: string
  professores: ProfessorParaMatricula[]
  materias: MateriaOutputType[]
  alunos: AlunoParaMatricula[]
  onCriado: () => void
}) {
  const [materiaId, setMateriaId] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const { mutate: criarMatricula, loading: criandoMatricula } = useApiMutation('criarMatricula')
  const { mutate: criarHorario } = useApiMutation('criarHorario')

  const professoresDisponiveis = professores
    .filter((professor) => professorDisponivel(professor, diaSemana, horario))
    .sort((a, b) => a.nome.localeCompare(b.nome))
  // Só oferece matéria que algum professor disponível nesse horário leciona --
  // senão a seleção leva a um beco sem saída (matéria escolhida, professor
  // vazio) que só o placeholder do select explicaria.
  const materiasDisponiveis = materias.filter((materia) =>
    professoresDisponiveis.some((professor) => professor.materiaIds.includes(materia.id)),
  )
  const professoresDaMateria = materiaId
    ? professoresDisponiveis.filter((professor) => professor.materiaIds.includes(materiaId))
    : professoresDisponiveis
  const alunosAtivos = alunos
    .filter((aluno) => aluno.situacao === 'ATIVO')
    .sort((a, b) => a.nome.localeCompare(b.nome))

  function aoTrocarMateria(proximoMateriaId: string) {
    const aindaLeciona = professoresDisponiveis
      .find((professor) => professor.id === professorId)
      ?.materiaIds.includes(proximoMateriaId)
    setMateriaId(proximoMateriaId)
    if (!aindaLeciona) setProfessorId('')
  }

  async function aoSalvar() {
    setErro(null)
    if (!materiaId || !professorId || !alunoId) {
      setErro('Selecione matéria, professor e aluno.')
      return
    }

    try {
      const matricula = await criarMatricula({
        params: { alunoId },
        body: { professorId, materiaId, tipoAtendimento: 'REGULAR' },
      })
      // `diaSemana` chega como `string` (widening de `ScheduleGridColumn.key` no schedule-grid.tsx),
      // mas sempre é um valor real de `DiaSemana` -- as duas telas que renderizam esse formulário só
      // constroem colunas a partir de `DIAS_SEMANA_GRADE`.
      await criarHorario({
        params: { matriculaId: matricula.id },
        body: { diaSemana: diaSemana as DiaSemana, horario },
      })
      setMateriaId('')
      setProfessorId('')
      setAlunoId('')
      onCriado()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível adicionar o aluno.')
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">Adicionar aluno nesse horário</p>
      {professoresDisponiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum professor disponível nesse dia/horário.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Matéria</Label>
              <Select value={materiaId} onValueChange={aoTrocarMateria}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {materiasDisponiveis.map((materia) => (
                    <SelectItem key={materia.id} value={materia.id}>
                      {materia.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Select
                value={professorId}
                onValueChange={setProfessorId}
                disabled={Boolean(materiaId) && professoresDaMateria.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !materiaId
                        ? 'Escolha a matéria'
                        : professoresDaMateria.length === 0
                          ? 'Nenhum professor disponível'
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
            <div className="space-y-1.5">
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {alunosAtivos.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <div className="flex justify-end">
            <Button type="button" onClick={() => void aoSalvar()} disabled={criandoMatricula}>
              {criandoMatricula ? 'Adicionando...' : 'Adicionar aluno'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
