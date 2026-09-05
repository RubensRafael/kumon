import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  AlunoCreateInput,
  type AlunoCreateInputType,
  type AlunoOutputType,
  type MateriaOutputType,
  type ProfessorOutputType,
} from '@shared/dto'

import { paraInputDate } from '../../../lib/format-date'
import { useApiMutation, useApiQuery } from '../../../hooks/use-api'
import { Button } from '../../ui/button'
import { DialogFooter } from '../../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'
import { Textarea } from '../../ui/textarea'
import { DIAS_SEMANA } from '../dias-semana'
import { SITUACAO_ALUNO_LABEL } from './enum-labels'
import { MatriculaDraftCard, type MatriculaDraft } from './matricula-draft-card'
import { MatriculaExistenteCard } from './matricula-existing-card'
import { NovaMatriculaForm } from './nova-matricula-form'
import { programacaoSemanalVazia } from './programacao-semanal-grid'

/**
 * `AlunoCreateInput.dataNascimento`/`dataMatricula` são `z.coerce.date()` —
 * ótimo pro backend (aceita qualquer coisa parseável), mas gera um tipo de
 * "input" (`unknown`) diferente do "output" (`Date`). Aqui o form trabalha
 * só com as strings "AAAA-MM-DD" que `<input type="date">` já produz, e a
 * conversão pra `Date` acontece na hora de montar o corpo da chamada
 * (`onSubmit`), não na validação do formulário.
 *
 * `situacao`/`zonaVermelha`/`connect` têm `.default(...)` no schema
 * original — o tipo de *input* (o que o form segura antes de validar) os
 * deixa opcionais, e só o de *output* (depois do resolver aplicar o
 * default) os torna obrigatórios. Por isso `useForm` usa os 3 genéricos
 * (input pro form, output pro `onSubmit`) em vez de um `z.infer` só.
 */
const AlunoFormSchema = AlunoCreateInput.extend({
  dataNascimento: z.string().optional(),
  dataMatricula: z.string().min(1, 'obrigatório'),
})
type AlunoFormInput = z.input<typeof AlunoFormSchema>
type AlunoFormOutput = z.output<typeof AlunoFormSchema>

let contadorDraft = 0

function novoDraft(): MatriculaDraft {
  contadorDraft += 1
  return {
    key: `draft-${contadorDraft}`,
    professorId: '',
    materiaId: '',
    estagio: '',
    tipoAtendimento: 'REGULAR',
    observacoes: '',
    programacao: programacaoSemanalVazia(),
  }
}

export function AlunoForm({
  aluno,
  professores,
  materias,
  onSalvo,
}: {
  aluno?: AlunoOutputType
  professores: ProfessorOutputType[]
  materias: MateriaOutputType[]
  onSalvo: () => void
}) {
  // Depois que `criarAluno` responde (modo criação), a mesma tela passa a se
  // comportar como edição desse aluno recém-criado — inclusive se a criação
  // de alguma matrícula falhar no meio do caminho (ver `onSubmit`).
  const [alunoPersistido, setAlunoPersistido] = useState(aluno)
  const [matriculasDraft, setMatriculasDraft] = useState<MatriculaDraft[]>([])
  const [adicionandoMatricula, setAdicionandoMatricula] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { mutate: criarAluno, loading: criando } = useApiMutation('criarAluno')
  const { mutate: atualizarAluno, loading: atualizando } = useApiMutation('atualizarAluno')
  const { mutate: criarMatricula } = useApiMutation('criarMatricula')
  const { mutate: criarHorario } = useApiMutation('criarHorario')

  const { data: matriculasExistentes, refetch: refetchMatriculas } = useApiQuery(
    'listarMatriculasDoAluno',
    { params: { alunoId: alunoPersistido?.id ?? '' } },
    { enabled: Boolean(alunoPersistido) },
  )

  const form = useForm<AlunoFormInput, unknown, AlunoFormOutput>({
    resolver: zodResolver(AlunoFormSchema),
    defaultValues: aluno
      ? {
          nome: aluno.nome,
          responsavel: aluno.responsavel ?? undefined,
          telefone: aluno.telefone ?? undefined,
          whatsapp: aluno.whatsapp ?? undefined,
          email: aluno.email ?? undefined,
          dataNascimento: paraInputDate(aluno.dataNascimento) || undefined,
          observacoes: aluno.observacoes ?? undefined,
          dataMatricula: paraInputDate(aluno.dataMatricula),
          situacao: aluno.situacao,
          zonaVermelha: aluno.zonaVermelha,
          connect: aluno.connect,
        }
      : {
          nome: '',
          dataMatricula: paraInputDate(new Date()),
          situacao: 'ATIVO',
          zonaVermelha: false,
          connect: false,
        },
  })

  async function onSubmit(dados: AlunoFormOutput) {
    setErro(null)
    // `dataNascimento`/`dataMatricula` viajam como string "AAAA-MM-DD" no
    // corpo da requisição -- `z.coerce.date()` do backend converte na
    // validação. O cast é só pro tipo do contrato (que reflete o valor já
    // convertido, `Date`), não o formato real de JSON entre client/server.
    const corpo = {
      ...dados,
      dataNascimento: dados.dataNascimento || undefined,
    } as unknown as AlunoCreateInputType

    if (alunoPersistido) {
      await atualizarAluno({ params: { id: alunoPersistido.id }, body: corpo })
      onSalvo()
      return
    }

    const novoAluno = await criarAluno({ body: corpo })
    setAlunoPersistido(novoAluno)

    for (const draft of matriculasDraft) {
      if (!draft.materiaId || !draft.professorId) continue
      try {
        const matricula = await criarMatricula({
          params: { alunoId: novoAluno.id },
          body: {
            professorId: draft.professorId,
            materiaId: draft.materiaId,
            estagio: draft.estagio || undefined,
            tipoAtendimento: draft.tipoAtendimento,
            observacoes: draft.observacoes || undefined,
          },
        })
        for (const dia of DIAS_SEMANA) {
          const valor = draft.programacao[dia.valor]
          if (valor.frequenta) {
            await criarHorario({
              params: { matriculaId: matricula.id },
              body: { diaSemana: dia.valor, horario: valor.horario },
            })
          }
        }
      } catch (error) {
        setErro(
          `Aluno criado, mas houve um problema salvando uma matrícula: ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }. O aluno já existe — continue por aqui pra tentar de novo.`,
        )
        setMatriculasDraft([])
        void refetchMatriculas()
        return
      }
    }

    onSalvo()
  }

  const salvando = criando || atualizando

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Dados pessoais</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
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
              name="dataNascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações gerais</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dataMatricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da matrícula</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="situacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação do aluno</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ATIVO">{SITUACAO_ALUNO_LABEL.ATIVO}</SelectItem>
                      <SelectItem value="TRANCADO">{SITUACAO_ALUNO_LABEL.TRANCADO}</SelectItem>
                      <SelectItem value="DESISTENTE">{SITUACAO_ALUNO_LABEL.DESISTENTE}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Categorias</h3>
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="zonaVermelha"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <Label className="!mt-0">Zona Vermelha</Label>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="connect"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <Label className="!mt-0">Connect</Label>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Matrículas</h3>
            {alunoPersistido && !adicionandoMatricula ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setAdicionandoMatricula(true)}>
                <Plus className="size-4" />
                Nova matrícula
              </Button>
            ) : null}
          </div>

          {!alunoPersistido ? (
            <div className="space-y-3">
              {matriculasDraft.map((draft) => (
                <MatriculaDraftCard
                  key={draft.key}
                  draft={draft}
                  professores={professores}
                  materias={materias}
                  onChange={(novo) =>
                    setMatriculasDraft((atual) => atual.map((d) => (d.key === draft.key ? novo : d)))
                  }
                  onRemover={() =>
                    setMatriculasDraft((atual) => atual.filter((d) => d.key !== draft.key))
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMatriculasDraft((atual) => [...atual, novoDraft()])}
              >
                <Plus className="size-4" />
                Nova matrícula
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {matriculasExistentes?.map((matricula) => (
                <MatriculaExistenteCard
                  key={matricula.id}
                  matricula={matricula}
                  professores={professores}
                  materias={materias}
                  onAtualizada={refetchMatriculas}
                />
              ))}
              {adicionandoMatricula ? (
                <NovaMatriculaForm
                  alunoId={alunoPersistido.id}
                  professores={professores}
                  materias={materias}
                  onCriada={() => {
                    setAdicionandoMatricula(false)
                    void refetchMatriculas()
                  }}
                  onCancelar={() => setAdicionandoMatricula(false)}
                />
              ) : null}
            </div>
          )}
        </div>

        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

        <DialogFooter>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
