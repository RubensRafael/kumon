import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../../components/ui/card'
import { ProfessorFormDialog } from './professor-form-dialog'

export function ProfessorCard({
  professor,
  materias,
  onAtualizado,
}: {
  professor: ProfessorOutputType
  materias: MateriaOutputType[]
  onAtualizado: () => void
}) {
  const [editando, setEditando] = useState(false)
  const nomesMaterias = professor.materiaIds
    .map((id) => materias.find((materia) => materia.id === id)?.nome)
    .filter((nome): nome is string => Boolean(nome))
    .join(' · ')

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{professor.nome}</p>
          <p className="text-sm text-muted-foreground">{nomesMaterias || 'Sem matérias'}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditando(true)}>
          <Pencil className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Cap./horário</p>
            <p className="font-medium">{professor.capacidadePorHorario}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Dias</p>
            <p className="font-medium">{professor.diasDisponiveis.length}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {professor.horarioInicial}–{professor.horarioFinal}
        </p>
        {/* Sem link ate a fe-06 (Agenda) existir. */}
        <Button variant="outline" size="sm" className="w-full" disabled>
          Agenda
        </Button>
      </CardContent>

      <ProfessorFormDialog
        open={editando}
        onOpenChange={setEditando}
        professor={professor}
        materias={materias}
        onSalvo={onAtualizado}
      />
    </Card>
  )
}
