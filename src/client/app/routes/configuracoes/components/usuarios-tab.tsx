import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Switch } from '../../../components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { useApiMutation } from '../../../hooks/use-api-mutation'
import { useApiQuery } from '../../../hooks/use-api-query'
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
        <p className="text-sm text-muted-foreground">
          {usuarios ? `${usuarios.length} usuário(s)` : 'Carregando...'}
        </p>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo usuário
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

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
