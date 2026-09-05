import { statusRegistro, type RegistroResumoOutputType } from '@shared/dto'

import { StatusRegistroBadge } from '../../../components/common/registro-form/status-badge'
import { Button } from '../../../components/ui/button'

export function RegistroRow({
  registro,
  onAbrir,
}: {
  registro: RegistroResumoOutputType
  onAbrir: () => void
}) {
  const status = statusRegistro(registro)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{registro.horarioPrevisto}</span>
          <span className="font-semibold">{registro.alunoNome}</span>
          <StatusRegistroBadge status={status} />
        </div>
      </div>
      <Button variant={status === 'CONCLUIDO' ? 'outline' : 'default'} size="sm" onClick={onAbrir}>
        {status === 'CONCLUIDO' ? 'Ver acompanhamento' : 'Registrar aula'}
      </Button>
    </div>
  )
}
