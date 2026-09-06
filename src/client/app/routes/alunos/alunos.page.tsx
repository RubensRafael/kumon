import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { useApiQuery } from '../../hooks/use-api'
import { usePainelSnapshot } from '../../hooks/use-painel-snapshot'
import { AlunoCard } from './components/aluno-card'
import { AlunoFormDialog } from '../../components/common/aluno-form/aluno-form-dialog'

export function AlunosPage() {
  const { data: alunos, loading, refetch } = useApiQuery('listarAlunos', {})
  const { data: professores } = useApiQuery('listarProfessores', {})
  const { data: materias } = useApiQuery('listarMaterias', { query: {} })
  const { dados: painel, refetch: refetchPainel } = usePainelSnapshot()
  const [busca, setBusca] = useState('')
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)

  function aoAtualizar() {
    refetch()
    refetchPainel()
  }

  // Matrículas ativas por aluno, a partir do snapshot bruto do painel --
  // exatamente o cruzamento que a fe-04 original tinha deixado de fora (pra
  // não duplicar a busca por aluno, N+1) e que a fe-05 traz pronto.
  const matriculasPorAluno = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof painel>['matriculas']>()
    if (!painel) return mapa
    for (const matricula of painel.matriculas) {
      if (matricula.situacao !== 'ATIVA') continue
      const lista = mapa.get(matricula.alunoId) ?? []
      lista.push(matricula)
      mapa.set(matricula.alunoId, lista)
    }
    return mapa
  }, [painel])

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = alunos ?? []
    if (termo) {
      lista = lista.filter(
        (aluno) =>
          aluno.nome.toLowerCase().includes(termo) || (aluno.responsavel ?? '').toLowerCase().includes(termo),
      )
    }
    if (materiaFiltro) {
      lista = lista.filter((aluno) =>
        (matriculasPorAluno.get(aluno.id) ?? []).some((matricula) => matricula.materiaId === materiaFiltro),
      )
    }
    return lista
  }, [alunos, busca, materiaFiltro, matriculasPorAluno])

  const filtroAtivo = Boolean(busca.trim() || materiaFiltro)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Alunos</h1>
          {alunos ? (
            <p className="mt-1.5 text-muted-foreground">
              {filtroAtivo
                ? `${alunosFiltrados.length} de ${alunos.length} aluno(s)`
                : `${alunos.filter((aluno) => aluno.situacao === 'ATIVO').length} alunos ativos`}
            </p>
          ) : (
            <Skeleton className="mt-1.5 h-4 w-24" />
          )}
        </div>
        <Button className="rounded-xl" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo aluno
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisa rápida"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-xl pl-9"
          />
        </div>
        <Select value={materiaFiltro || 'todas'} onValueChange={(v) => setMateriaFiltro(v === 'todas' ? '' : v)}>
          <SelectTrigger className="w-44 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas matérias</SelectItem>
            {(materias ?? []).map((materia) => (
              <SelectItem key={materia.id} value={materia.id}>
                {materia.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {alunos && alunosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {busca.trim()
            ? `Nenhum aluno encontrado para "${busca.trim()}".`
            : materiaFiltro
              ? 'Nenhum aluno nessa matéria.'
              : 'Nenhum aluno cadastrado ainda.'}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {alunosFiltrados.map((aluno) => (
          <AlunoCard
            key={aluno.id}
            aluno={aluno}
            professores={professores ?? []}
            materias={materias ?? []}
            matriculas={matriculasPorAluno.get(aluno.id) ?? []}
            onAtualizado={aoAtualizar}
            onPainelAtualizado={refetchPainel}
          />
        ))}
      </div>

      <AlunoFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        professores={professores ?? []}
        materias={materias ?? []}
        onSalvo={aoAtualizar}
        onPainelAtualizado={refetchPainel}
      />
    </div>
  )
}
