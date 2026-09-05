import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { AlunoOutputType, MateriaOutputType, PainelDadosOutputType, ProfessorOutputType } from '@shared/dto'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { DIAS_SEMANA } from '../../../components/common/dias-semana'
import { corDaMateria } from '../../../components/common/materia-cores'
import { SITUACAO_ALUNO_LABEL } from '../../../components/common/aluno-form/enum-labels'
import { AlunoFormDialog } from './aluno-form-dialog'

const ORDEM_DIA: Record<string, number> = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 }
const LABEL_DIA: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((dia) => [dia.valor, dia.label]))

function horariosTexto(horarios: { diaSemana: string; horario: string }[]): string {
  return [...horarios]
    .sort((a, b) => (ORDEM_DIA[a.diaSemana] ?? 0) - (ORDEM_DIA[b.diaSemana] ?? 0) || a.horario.localeCompare(b.horario))
    .map((h) => `${LABEL_DIA[h.diaSemana] ?? h.diaSemana} ${h.horario}`)
    .join('  ·  ')
}

export function AlunoCard({
  aluno,
  professores,
  materias,
  matriculas,
  onAtualizado,
}: {
  aluno: AlunoOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  matriculas: PainelDadosOutputType['matriculas']
  onAtualizado: () => void
}) {
  const [editando, setEditando] = useState(false)

  return (
    <Card className="gap-0 rounded-2xl p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="truncate">{aluno.nome}</span>
            {aluno.connect ? (
              <span
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                title="Connect"
              >
                C
              </span>
            ) : null}
          </p>
          <p className="truncate text-sm text-muted-foreground">{aluno.responsavel || '—'}</p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-md text-xs" onClick={() => setEditando(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-1.5">
        {matriculas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem matrículas.</p>
        ) : (
          matriculas.map((matricula) => {
            const materiaNome = materias.find((m) => m.id === matricula.materiaId)?.nome ?? '—'
            const professorNome = professores.find((p) => p.id === matricula.professorId)?.nome ?? '—'
            return (
              <div key={matricula.id} className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: corDaMateria(matricula.materiaId, materias) }}
                  />
                  <span className="font-medium">{materiaNome}</span>
                  {matricula.estagio ? <span className="text-muted-foreground">· {matricula.estagio}</span> : null}
                  <span className="ml-auto truncate text-muted-foreground">{professorNome}</span>
                </div>
                {matricula.horarios.length > 0 ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{horariosTexto(matricula.horarios)}</p>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {aluno.situacao !== 'ATIVO' || aluno.zonaVermelha ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {aluno.situacao !== 'ATIVO' ? (
            <Badge variant="secondary">{SITUACAO_ALUNO_LABEL[aluno.situacao]}</Badge>
          ) : null}
          {aluno.zonaVermelha ? <Badge variant="destructive">Zona Vermelha</Badge> : null}
        </div>
      ) : null}

      <AlunoFormDialog
        open={editando}
        onOpenChange={setEditando}
        aluno={aluno}
        professores={professores}
        materias={materias}
        onSalvo={onAtualizado}
      />
    </Card>
  )
}
