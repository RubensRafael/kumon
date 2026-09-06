import { useState } from 'react'

import type { MateriaOutputType, MatriculaOutputType, ProfessorOutputType } from '@shared/dto'

import { useApiMutation, useApiQuery } from '../../../hooks/use-api'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { DIAS_SEMANA } from '../dias-semana'
import { SITUACAO_MATRICULA_LABEL, TIPO_ATENDIMENTO_LABEL } from './enum-labels'
import { ProgramacaoSemanalGrid, programacaoSemanalVazia, type ProgramacaoSemanal } from './programacao-semanal-grid'

/**
 * Matrícula já existente: `professorId`/`materiaId`/`tipoAtendimento`/
 * `estagio` aparecem só como texto — trocar qualquer um deles não é
 * suportado por `PUT /matriculas/:id` (encerre e crie uma nova, ver
 * `plan.md` seção 5). Só `situacao`/`observacoes` são editáveis aqui, e os
 * horários (criar novo dia, ou desativar um existente).
 */
export function MatriculaExistenteCard({
  matricula,
  professores,
  materias,
  onAtualizada,
}: {
  matricula: MatriculaOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onAtualizada: () => void
}) {
  const professorNome = professores.find((p) => p.id === matricula.professorId)?.nome ?? '—'
  const materiaNome = materias.find((m) => m.id === matricula.materiaId)?.nome ?? '—'

  const { data: horarios, refetch: refetchHorarios } = useApiQuery('listarHorariosDaMatricula', {
    params: { matriculaId: matricula.id },
  })
  const { mutate: atualizarMatricula } = useApiMutation('atualizarMatricula')
  const { mutate: criarHorario } = useApiMutation('criarHorario')
  const { mutate: atualizarHorario } = useApiMutation('atualizarHorario')
  const [observacoes, setObservacoes] = useState(matricula.observacoes ?? '')
  const [rascunho, setRascunho] = useState<ProgramacaoSemanal | null>(null)
  const [salvandoProgramacao, setSalvandoProgramacao] = useState(false)

  const valoresServidor: ProgramacaoSemanal = { ...programacaoSemanalVazia() }
  for (const horario of horarios ?? []) {
    if (horario.ativo && horario.diaSemana in valoresServidor) {
      valoresServidor[horario.diaSemana as keyof ProgramacaoSemanal] = { frequenta: true, horario: horario.horario }
    }
  }
  const valores = rascunho ?? valoresServidor
  const programacaoAlterada =
    rascunho !== null && JSON.stringify(rascunho) !== JSON.stringify(valoresServidor)

  async function aoMudarSituacao(situacao: string) {
    await atualizarMatricula({
      params: { id: matricula.id },
      body: { situacao: situacao as MatriculaOutputType['situacao'] },
    })
    onAtualizada()
  }

  async function aoSalvarObservacoes() {
    if (observacoes === (matricula.observacoes ?? '')) return
    await atualizarMatricula({ params: { id: matricula.id }, body: { observacoes } })
    onAtualizada()
  }

  function aoMudarDia(dia: keyof ProgramacaoSemanal, valor: { frequenta: boolean; horario: string }) {
    setRascunho({ ...valores, [dia]: valor })
  }

  /**
   * Só persiste no clique de "Salvar" -- antes, cada toggle da grade
   * disparava `criarHorario`/`atualizarHorario` na hora, uma chamada por
   * dia mexido, sem loading nem forma de o usuário ver "uma atualização só"
   * quando mexia em vários dias.
   */
  async function aoSalvarProgramacao() {
    if (!rascunho) return
    setSalvandoProgramacao(true)
    try {
      for (const dia of DIAS_SEMANA) {
        const valorNovo = rascunho[dia.valor]
        const valorAntigo = valoresServidor[dia.valor]
        if (valorNovo.frequenta === valorAntigo.frequenta && valorNovo.horario === valorAntigo.horario) continue

        const existente = horarios?.find((h) => h.ativo && h.diaSemana === dia.valor)
        if (valorNovo.frequenta && !existente) {
          await criarHorario({
            params: { matriculaId: matricula.id },
            body: { diaSemana: dia.valor, horario: valorNovo.horario },
          })
        } else if (!valorNovo.frequenta && existente) {
          await atualizarHorario({ params: { id: existente.id }, body: { ativo: false } })
        } else if (valorNovo.frequenta && existente && existente.horario !== valorNovo.horario) {
          // Trocar o horário de um dia já ativo: desativa o antigo e cria o novo (mesmo padrão de `plan.md` seção 6).
          await atualizarHorario({ params: { id: existente.id }, body: { ativo: false } })
          await criarHorario({
            params: { matriculaId: matricula.id },
            body: { diaSemana: dia.valor, horario: valorNovo.horario },
          })
        }
      }
      setRascunho(null)
      await refetchHorarios()
      onAtualizada()
    } finally {
      setSalvandoProgramacao(false)
    }
  }

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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Estágio</p>
            <p>{matricula.estagio ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Tipo de atendimento</p>
            <p>{TIPO_ATENDIMENTO_LABEL[matricula.tipoAtendimento]}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Situação</Label>
          <Select value={matricula.situacao} onValueChange={(v) => void aoMudarSituacao(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATIVA">{SITUACAO_MATRICULA_LABEL.ATIVA}</SelectItem>
              <SelectItem value="PAUSADA">{SITUACAO_MATRICULA_LABEL.PAUSADA}</SelectItem>
              <SelectItem value="ENCERRADA">{SITUACAO_MATRICULA_LABEL.ENCERRADA}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            onBlur={() => void aoSalvarObservacoes()}
          />
        </div>

        <div className="space-y-2">
          <Label>Programação semanal</Label>
          <ProgramacaoSemanalGrid valores={valores} onChange={aoMudarDia} disabled={salvandoProgramacao} />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!programacaoAlterada || salvandoProgramacao}
              onClick={() => void aoSalvarProgramacao()}
            >
              {salvandoProgramacao ? 'Salvando...' : 'Salvar programação'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
