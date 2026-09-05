import type { AlunoOutputType, MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { AlunoForm } from '../../../components/common/aluno-form/aluno-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'

export function AlunoFormDialog({
  open,
  onOpenChange,
  aluno,
  professores,
  materias,
  onSalvo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluno?: AlunoOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onSalvo: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aluno ? 'Editar aluno' : 'Novo aluno'}</DialogTitle>
        </DialogHeader>
        {/* `key` força remontar o form ao trocar de aluno (ou criar -> editar depois do 1º salvamento) */}
        <AlunoForm
          key={aluno?.id ?? 'novo'}
          aluno={aluno}
          professores={professores}
          materias={materias}
          onSalvo={() => {
            onOpenChange(false)
            onSalvo()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
