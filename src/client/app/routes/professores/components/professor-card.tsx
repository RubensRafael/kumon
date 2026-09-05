import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../../components/ui/card'
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{professor.nome}</p>
          <p className="text-sm text-muted-foreground">{nomesMaterias || 'Sem matérias'}</p>
        </div>
        {/* Editar o cadastro de outro professor sem ser admin é uma escrita
            que o backend (`restrictProfessorSelf`) sempre recusa -- não
            oferecer o botão em vez de abrir um formulário que nunca salva. */}
        {podeEditar ? (
          <Button variant="ghost" size="icon-sm" onClick={() => setEditando(true)}>
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Cap./horário</p>
            <p className="font-medium">{professor.capacidadePorHorario}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Dias</p>
            <p className="flex flex-wrap gap-1 font-medium">
              {professor.diasDisponiveis.map((dia) => (
                <span key={dia} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {DIAS_ABREVIADOS[dia] ?? dia}
                </span>
              ))}
            </p>
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
