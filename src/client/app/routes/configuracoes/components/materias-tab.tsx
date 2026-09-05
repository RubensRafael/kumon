import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { MateriaCreateInput, type MateriaCreateInputType, type MateriaOutputType } from '@shared/dto'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Switch } from '../../../components/ui/switch'
import { useApiMutation, useApiQuery } from '../../../hooks/use-api'
import { ConteudosDaMateria } from './conteudos-da-materia'

export function MateriasTab() {
  const { data: materias, loading, refetch } = useApiQuery('listarMaterias', {
    query: { incluirInativas: 'true' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {materias ? `${materias.length} matéria(s)` : 'Carregando...'}
        </p>
        <NovaMateriaDialog onCriada={refetch} />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

      {materias && materias.length > 0 ? (
        <Accordion type="multiple" className="rounded-lg border">
          {materias.map((materia) => (
            <MateriaAccordionItem key={materia.id} materia={materia} onAtualizada={refetch} />
          ))}
        </Accordion>
      ) : null}
    </div>
  )
}

function NovaMateriaDialog({ onCriada }: { onCriada: () => void }) {
  const [open, setOpen] = useState(false)
  const { mutate, loading } = useApiMutation('criarMateria')
  const form = useForm<MateriaCreateInputType>({
    resolver: zodResolver(MateriaCreateInput),
    defaultValues: { nome: '' },
  })

  async function onSubmit(dados: MateriaCreateInputType) {
    await mutate({ body: dados })
    form.reset({ nome: '' })
    setOpen(false)
    onCriada()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nova matéria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova matéria</DialogTitle>
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

function MateriaAccordionItem({
  materia,
  onAtualizada,
}: {
  materia: MateriaOutputType
  onAtualizada: () => void
}) {
  const { mutate } = useApiMutation('atualizarMateria')

  async function aoTogglear(ativo: boolean) {
    await mutate({ params: { id: materia.id }, body: { ativo } })
    onAtualizada()
  }

  return (
    <AccordionItem value={materia.id}>
      <div className="flex items-center gap-3 px-4">
        <AccordionTrigger className={materia.ativo ? 'flex-1' : 'flex-1 text-muted-foreground'}>
          <span className="flex items-center gap-2">
            {materia.nome}
            {materia.ativo ? null : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Inativa
              </span>
            )}
          </span>
        </AccordionTrigger>
        <Switch checked={materia.ativo} onCheckedChange={(ativo) => void aoTogglear(ativo)} />
      </div>
      <AccordionContent className="px-4">
        <ConteudosDaMateria materiaId={materia.id} />
      </AccordionContent>
    </AccordionItem>
  )
}
