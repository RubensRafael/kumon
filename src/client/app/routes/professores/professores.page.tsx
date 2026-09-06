import { Plus } from 'lucide-react'
import { useState } from 'react'

import { calcularAgregacoesPainel } from '@shared/dto'

import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useAuth } from '../../hooks/use-auth'
import { useApiQuery } from '../../hooks/use-api'
import { usePainelSnapshot } from '../../hooks/use-painel-snapshot'
import { ProfessorCard } from './components/professor-card'
import { ProfessorFormDialog } from './components/professor-form-dialog'

export function ProfessoresPage() {
  const { isAdmin } = useAuth()
  const { data: professores, loading, refetch } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })
  const { dados: painel, refetch: refetchPainel } = usePainelSnapshot()
  const [dialogAberto, setDialogAberto] = useState(false)

  function aoAtualizar() {
    refetch()
    refetchPainel()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Professores</h1>
          <p className="mt-1.5 text-muted-foreground">Equipe da unidade, disponibilidade e capacidade</p>
        </div>
        {/* Criar professor é admin-only no backend (requireAdmin) -- não
            oferecer o botão pra quem só receberia 403. */}
        {isAdmin ? (
          <Button className="rounded-xl" onClick={() => setDialogAberto(true)}>
            <Plus className="size-4" />
            Novo professor
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professores?.map((professor) => (
          <ProfessorCard
            key={professor.id}
            professor={professor}
            materias={materias ?? []}
            alunosAtivos={painel ? calcularAgregacoesPainel(painel, professor.id).totalAlunosAtivos : undefined}
            onAtualizado={aoAtualizar}
          />
        ))}
      </div>

      {isAdmin ? (
        <ProfessorFormDialog
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          materias={materias ?? []}
          onSalvo={aoAtualizar}
        />
      ) : null}
    </div>
  )
}
