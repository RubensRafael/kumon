import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { ProfessorUpdateInputSelf, type ProfessorOutputType, type ProfessorUpdateInputSelfType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { DialogFooter } from '../../../components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { useApiMutation } from '../../../hooks/use-api'

/**
 * Professor editando o próprio perfil: só os 4 campos que
 * `ProfessorUpdateInputSelf` aceita — disponibilidade/capacidade/matérias
 * não aparecem aqui, não é o backend que os esconde (ele só descarta em
 * silêncio), é a UI que nunca oferece.
 */
export function ProfessorFormSelf({
  professor,
  onSalvo,
}: {
  professor: ProfessorOutputType
  onSalvo: () => void
}) {
  const { mutate, loading } = useApiMutation('atualizarProfessor')

  const form = useForm<ProfessorUpdateInputSelfType>({
    resolver: zodResolver(ProfessorUpdateInputSelf),
    defaultValues: {
      telefone: professor.telefone ?? undefined,
      email: professor.email ?? undefined,
      photoUrl: professor.photoUrl ?? undefined,
      observacoes: professor.observacoes ?? undefined,
    },
  })

  async function onSubmit(dados: ProfessorUpdateInputSelfType) {
    await mutate({ params: { id: professor.id }, body: dados })
    onSalvo()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
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
                <Input type="email" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
