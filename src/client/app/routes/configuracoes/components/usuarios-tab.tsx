import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'
import { Switch } from '../../../components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { useApiMutation, useApiQuery } from '../../../hooks/use-api'
import { NovoUsuarioDialog } from './novo-usuario-dialog'

export function UsuariosTab() {
  const { data: usuarios, loading, refetch } = useApiQuery('listarUsuarios', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { mutate: atualizar } = useApiMutation('atualizarUsuario')
  const [dialogAberto, setDialogAberto] = useState(false)

  async function aoTogglearAtivo(id: string, ativo: boolean) {
    await atualizar({ params: { id }, body: { ativo } })
    void refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {usuarios ? (
          <p className="text-sm text-muted-foreground">{usuarios.length} usuário(s)</p>
        ) : (
          <Skeleton className="h-4 w-24" />
        )}
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo usuário
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {usuarios && usuarios.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.papel === 'ADMIN' ? 'default' : 'secondary'}>
                      {usuario.papel === 'ADMIN' ? 'Admin' : 'Professor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={usuario.ativo}
                      onCheckedChange={(ativo) => void aoTogglearAtivo(usuario.id, ativo)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <NovoUsuarioDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        professores={professores ?? []}
        onCriado={refetch}
      />
    </div>
  )
}
