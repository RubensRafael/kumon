import type { MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { useAuth } from '../../../hooks/use-auth'
import { ProfessorFormFull } from './professor-form-full'
import { ProfessorFormSelf } from './professor-form-self'

export function ProfessorFormDialog({
  open,
  onOpenChange,
  professor,
  materias,
  onSalvo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  professor?: ProfessorOutputType
  materias: MateriaOutputType[]
  onSalvo: () => void
}) {
  const { usuario, podeEditarProfessor } = useAuth()
  const ehAutoEdicao =
    Boolean(professor) && usuario?.papel === 'PROFESSOR' && podeEditarProfessor(professor?.id ?? '')

  function aoSalvar() {
    onOpenChange(false)
    onSalvo()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{professor ? 'Editar professor' : 'Novo professor'}</DialogTitle>
        </DialogHeader>
        {ehAutoEdicao && professor ? (
          <ProfessorFormSelf professor={professor} onSalvo={aoSalvar} />
        ) : (
          <ProfessorFormFull professor={professor} materias={materias} onSalvo={aoSalvar} />
        )}
      </DialogContent>
    </Dialog>
  )
}
