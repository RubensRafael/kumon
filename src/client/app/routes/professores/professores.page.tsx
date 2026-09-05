import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { useApiQuery } from '../../hooks/use-api-query'
import { ProfessorCard } from './components/professor-card'
import { ProfessorFormDialog } from './components/professor-form-dialog'

export function ProfessoresPage() {
  const { data: professores, loading, refetch } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })
  const [dialogAberto, setDialogAberto] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Professores</h1>
          <p className="text-sm text-muted-foreground">Equipe da unidade, disponibilidade e capacidade</p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo professor
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professores?.map((professor) => (
          <ProfessorCard
            key={professor.id}
            professor={professor}
            materias={materias ?? []}
            onAtualizado={refetch}
          />
        ))}
      </div>

      <ProfessorFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        materias={materias ?? []}
        onSalvo={refetch}
      />
    </div>
  )
}
