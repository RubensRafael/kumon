import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useAuth } from '../../../hooks/use-auth'
import { ProfessorFormDialog } from './professor-form-dialog'

const DIAS_ABREVIADOS: Record<string, string> = {
  SEG: 'Seg',
  TER: 'Ter',
  QUA: 'Qua',
  QUI: 'Qui',
  SEX: 'Sex',
  SAB: 'Sáb',
}

export function ProfessorCard({
  professor,
  materias,
  onAtualizado,
}: {
  professor: ProfessorOutputType
  materias: MateriaOutputType[]
  onAtualizado: () => void
}) {
  const { podeEditarProfessor } = useAuth()
  const [editando, setEditando] = useState(false)
  const nomesMaterias = professor.materiaIds
    .map((id) => materias.find((materia) => materia.id === id)?.nome)
    .filter((nome): nome is string => Boolean(nome))
    .join(' · ')
  const podeEditar = podeEditarProfessor(professor.id)
  const diasTexto = professor.diasDisponiveis.map((dia) => DIAS_ABREVIADOS[dia] ?? dia).join(', ')

  return (
    <Card className="gap-0 rounded-2xl p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full font-semibold text-white"
          style={{ backgroundColor: professor.corAgenda }}
        >
          {professor.nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{professor.nome}</p>
          <p className="truncate text-sm text-muted-foreground">{nomesMaterias || 'Sem matérias'}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground uppercase">Cap./horário</dt>
          <dd className="font-semibold">{professor.capacidadePorHorario}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground uppercase">Dias</dt>
          <dd className="font-semibold">{professor.diasDisponiveis.length}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        {diasTexto} · {professor.horarioInicial}–{professor.horarioFinal}
      </p>

      <div className="mt-4 flex gap-2">
        {/* Sem link ate a fe-06 (Agenda) existir. */}
        <Button variant="outline" size="sm" className="flex-1 rounded-xl" disabled>
          Agenda
        </Button>
        {/* Editar o cadastro de outro professor sem ser admin é uma escrita
            que o backend (`restrictProfessorSelf`) sempre recusa -- não
            oferecer o botão em vez de abrir um formulário que nunca salva. */}
        {podeEditar ? (
          <Button variant="outline" size="icon-sm" className="rounded-xl" onClick={() => setEditando(true)}>
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </div>

      {podeEditar ? (
        <ProfessorFormDialog
          open={editando}
          onOpenChange={setEditando}
          professor={professor}
          materias={materias}
          onSalvo={onAtualizado}
        />
      ) : null}
    </Card>
  )
}
