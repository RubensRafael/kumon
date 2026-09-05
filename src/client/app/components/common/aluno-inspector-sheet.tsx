import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { useApiQuery } from '../../hooks/use-api-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { AlunoForm } from './aluno-form/aluno-form'

/**
 * Painel lateral de inspecionar/editar um aluno — usado pela Agenda (fe-06)
 * ao clicar num slot ocupado, construído já aqui (fe-04) porque reaproveita
 * o mesmo `AlunoForm` do Dialog da lista de Alunos. Sem `alunoId`, mostra o
 * estado vazio do print ("Selecione um aluno na agenda...").
 */
export function AlunoInspectorSheet({
  open,
  onOpenChange,
  alunoId,
  professores,
  materias,
  onAtualizado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  alunoId: string | null
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onAtualizado: () => void
}) {
  const { data: aluno } = useApiQuery(
    'buscarAluno',
    { params: { id: alunoId ?? '' } },
    { enabled: Boolean(alunoId) },
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Aluno</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          {!alunoId || !aluno ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecione um aluno na agenda para visualizar dados, matrículas e categorias.
            </p>
          ) : (
            <AlunoForm
              key={aluno.id}
              aluno={aluno}
              professores={professores}
              materias={materias}
              onSalvo={onAtualizado}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
