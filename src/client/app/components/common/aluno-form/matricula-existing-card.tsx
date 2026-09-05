import { useState } from 'react'

import type { MateriaOutputType, MatriculaOutputType, ProfessorOutputType } from '@shared/dto'

import { useApiMutation, useApiQuery } from '../../../hooks/use-api'
import { Badge } from '../../ui/badge'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Textarea } from '../../ui/textarea'
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

  const valores: ProgramacaoSemanal = { ...programacaoSemanalVazia() }
  for (const horario of horarios ?? []) {
    if (horario.ativo && horario.diaSemana in valores) {
      valores[horario.diaSemana as keyof ProgramacaoSemanal] = { frequenta: true, horario: horario.horario }
    }
  }

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

  async function aoMudarDia(dia: keyof ProgramacaoSemanal, valor: { frequenta: boolean; horario: string }) {
    const existente = horarios?.find((h) => h.ativo && h.diaSemana === dia)

    if (valor.frequenta && !existente) {
      await criarHorario({ params: { matriculaId: matricula.id }, body: { diaSemana: dia, horario: valor.horario } })
    } else if (!valor.frequenta && existente) {
      await atualizarHorario({ params: { id: existente.id }, body: { ativo: false } })
    } else if (valor.frequenta && existente && existente.horario !== valor.horario) {
      // Trocar o horário de um dia já ativo: desativa o antigo e cria o novo (mesmo padrão de `plan.md` seção 6).
      await atualizarHorario({ params: { id: existente.id }, body: { ativo: false } })
      await criarHorario({ params: { matriculaId: matricula.id }, body: { diaSemana: dia, horario: valor.horario } })
    }
    void refetchHorarios()
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
          <ProgramacaoSemanalGrid valores={valores} onChange={(dia, valor) => void aoMudarDia(dia, valor)} />
        </div>
      </CardContent>
    </Card>
  )
}
