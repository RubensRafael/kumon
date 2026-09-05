import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { useApiQuery } from '../../hooks/use-api'
import { AlunoCard } from './components/aluno-card'
import { AlunoFormDialog } from './components/aluno-form-dialog'

export function AlunosPage() {
  const { data: alunos, loading, refetch } = useApiQuery('listarAlunos', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })
  const [busca, setBusca] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return alunos ?? []
    return (alunos ?? []).filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        (aluno.responsavel ?? '').toLowerCase().includes(termo),
    )
  }, [alunos, busca])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
          {alunos ? (
            <p className="text-sm text-muted-foreground">
              {busca.trim()
                ? `${alunosFiltrados.length} de ${alunos.length} aluno(s)`
                : `${alunos.length} aluno(s)`}
            </p>
          ) : (
            <Skeleton className="h-4 w-24" />
          )}
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo aluno
        </Button>
      </div>

      <Input
        placeholder="Pesquisa rápida"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}

      {alunos && alunosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {busca.trim() ? `Nenhum aluno encontrado para "${busca.trim()}".` : 'Nenhum aluno cadastrado ainda.'}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {alunosFiltrados.map((aluno) => (
          <AlunoCard
            key={aluno.id}
            aluno={aluno}
            professores={professores ?? []}
            materias={materias ?? []}
            onAtualizado={refetch}
          />
        ))}
      </div>

      <AlunoFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        professores={professores ?? []}
        materias={materias ?? []}
        onSalvo={refetch}
      />
    </div>
  )
}
