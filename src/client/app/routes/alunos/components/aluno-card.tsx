import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { AlunoOutputType, MateriaOutputType, ProfessorOutputType } from '@shared/dto'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../../components/ui/card'
import { SITUACAO_ALUNO_LABEL } from '../../../components/common/aluno-form/enum-labels'
import { AlunoFormDialog } from './aluno-form-dialog'

export function AlunoCard({
  aluno,
  professores,
  materias,
  onAtualizado,
}: {
  aluno: AlunoOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onAtualizado: () => void
}) {
  const [editando, setEditando] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{aluno.nome}</p>
          {aluno.responsavel ? <p className="text-sm text-muted-foreground">{aluno.responsavel}</p> : null}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditando(true)}>
          <Pencil className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant={aluno.situacao === 'ATIVO' ? 'default' : 'secondary'}>
          {SITUACAO_ALUNO_LABEL[aluno.situacao]}
        </Badge>
        {aluno.zonaVermelha ? <Badge variant="destructive">Zona Vermelha</Badge> : null}
        {aluno.connect ? <Badge variant="outline">Connect</Badge> : null}
      </CardContent>

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
