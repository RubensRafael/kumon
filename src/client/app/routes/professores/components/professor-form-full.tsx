import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { ProfessorCreateInput, type MateriaOutputType, type ProfessorCreateInputType, type ProfessorOutputType } from '@shared/dto'

import { Button } from '../../../components/ui/button'
import { DialogClose, DialogFooter } from '../../../components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group'
import { useApiMutation } from '../../../hooks/use-api'

const PILL_ITEM_CLASSNAME =
  'h-auto rounded-full px-3 py-1.5 font-normal data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/** Sem "Dom" de propósito — nenhuma unidade Kumon funciona aos domingos (ver docs/pr-fe-03-professores.md). */
const DIAS_DISPONIVEIS = [
  { valor: 'SEG', label: 'Seg' },
  { valor: 'TER', label: 'Ter' },
  { valor: 'QUA', label: 'Qua' },
  { valor: 'QUI', label: 'Qui' },
  { valor: 'SEX', label: 'Sex' },
  { valor: 'SAB', label: 'Sáb' },
] as const

export function ProfessorFormFull({
  professor,
  materias,
  onSalvo,
}: {
  professor?: ProfessorOutputType
  materias: MateriaOutputType[]
  onSalvo: () => void
}) {
  const { mutate: criar, loading: criando } = useApiMutation('criarProfessor')
  const { mutate: atualizar, loading: atualizando } = useApiMutation('atualizarProfessor')
  const salvando = criando || atualizando

  const form = useForm<ProfessorCreateInputType>({
    resolver: zodResolver(ProfessorCreateInput),
    defaultValues: professor
      ? {
          nome: professor.nome,
          telefone: professor.telefone ?? undefined,
          email: professor.email ?? undefined,
          photoUrl: professor.photoUrl ?? undefined,
          diasDisponiveis: professor.diasDisponiveis,
          horarioInicial: professor.horarioInicial,
          horarioFinal: professor.horarioFinal,
          capacidadePorHorario: professor.capacidadePorHorario,
          corAgenda: professor.corAgenda,
          observacoes: professor.observacoes ?? undefined,
          materiaIds: professor.materiaIds,
        }
      : {
          nome: '',
          diasDisponiveis: [],
          horarioInicial: '08:00',
          horarioFinal: '18:00',
          capacidadePorHorario: 1,
          corAgenda: '#2563eb',
          materiaIds: [],
        },
  })

  async function onSubmit(dados: ProfessorCreateInputType) {
    if (professor) {
      await atualizar({ params: { id: professor.id }, body: dados })
    } else {
      await criar({ body: dados })
    }
    onSalvo()
  }

  return (
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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <FormField
          control={form.control}
          name="materiaIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matérias</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  spacing={2}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex-wrap justify-start"
                >
                  {materias.map((materia) => (
                    <ToggleGroupItem key={materia.id} value={materia.id} className={PILL_ITEM_CLASSNAME}>
                      {materia.nome}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="diasDisponiveis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dias disponíveis</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  spacing={2}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex-wrap justify-start"
                >
                  {DIAS_DISPONIVEIS.map((dia) => (
                    <ToggleGroupItem key={dia.valor} value={dia.valor} className={PILL_ITEM_CLASSNAME}>
                      {dia.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="horarioInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário inicial</FormLabel>
                <FormControl>
                  <Input type="time" step={1800} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="horarioFinal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário final</FormLabel>
                <FormControl>
                  <Input type="time" step={1800} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacidadePorHorario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidade por horário</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="corAgenda"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor da agenda</FormLabel>
                <FormControl>
                  <input type="color" className="h-9 w-full rounded-md border" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" className="rounded-xl" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
