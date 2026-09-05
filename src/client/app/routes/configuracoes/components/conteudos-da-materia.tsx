import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { ConteudoCreateInput, type ConteudoCreateInputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Switch } from '../../../components/ui/switch'
import { useApiMutation, useApiQuery } from '../../../hooks/use-api'

export function ConteudosDaMateria({ materiaId }: { materiaId: string }) {
  const { data: conteudos, loading, refetch } = useApiQuery('listarConteudosDaMateria', {
    params: { id: materiaId },
  })
  const { mutate: atualizar } = useApiMutation('atualizarConteudo')

  async function aoTogglear(conteudoId: string, ativo: boolean) {
    await atualizar({ params: { id: conteudoId }, body: { ativo } })
    void refetch()
  }

  return (
    <div className="space-y-3">
      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

      {conteudos && conteudos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum conteúdo cadastrado ainda.</p>
      ) : null}

      <ul className="space-y-2">
        {conteudos?.map((conteudo) => (
          <li key={conteudo.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span className="flex items-center gap-2">
              <span className={conteudo.ativo ? undefined : 'text-muted-foreground line-through'}>
                {conteudo.nome}
              </span>
              {conteudo.ativo ? null : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Inativo
                </span>
              )}
            </span>
            <Switch checked={conteudo.ativo} onCheckedChange={(ativo) => void aoTogglear(conteudo.id, ativo)} />
          </li>
        ))}
      </ul>

      <NovoConteudoForm materiaId={materiaId} onCriado={refetch} />
    </div>
  )
}

function NovoConteudoForm({ materiaId, onCriado }: { materiaId: string; onCriado: () => void }) {
  const { mutate, loading } = useApiMutation('criarConteudo')
  const form = useForm<ConteudoCreateInputType>({
    resolver: zodResolver(ConteudoCreateInput),
    defaultValues: { materiaId, nome: '' },
  })

  async function onSubmit(dados: ConteudoCreateInputType) {
    await mutate({ body: dados })
    form.reset({ materiaId, nome: '' })
    onCriado()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input placeholder="Novo conteúdo..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="outline" size="sm" disabled={loading}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </form>
    </Form>
  )
}
