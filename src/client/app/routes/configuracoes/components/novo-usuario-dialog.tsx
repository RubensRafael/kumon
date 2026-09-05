import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { UsuarioCreateInput, type ProfessorOutputType, type UsuarioCreateInputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useApiMutation } from '../../../hooks/use-api'

export function NovoUsuarioDialog({
  open,
  onOpenChange,
  professores,
  onCriado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  professores: ProfessorOutputType[]
  onCriado: () => void
}) {
  const { mutate, loading } = useApiMutation('criarUsuario')
  const professoresSemLogin = professores.filter((professor) => !professor.usuarioId)

  const form = useForm<UsuarioCreateInputType>({
    resolver: zodResolver(UsuarioCreateInput),
    defaultValues: { nome: '', email: '', papel: 'ADMIN' },
  })

  const papel = form.watch('papel')

  async function onSubmit(dados: UsuarioCreateInputType) {
    await mutate({ body: dados })
    form.reset({ nome: '', email: '', papel: 'ADMIN' })
    onOpenChange(false)
    onCriado()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ nome: '', email: '', papel: 'ADMIN' })
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="papel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="PROFESSOR">Professor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {papel === 'PROFESSOR' ? (
              <FormField
                control={form.control}
                name="professorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor vinculado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professoresSemLogin.map((professor) => (
                          <SelectItem key={professor.id} value={professor.id}>
                            {professor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
