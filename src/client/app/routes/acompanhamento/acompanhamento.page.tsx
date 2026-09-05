import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { statusRegistro, type RegistroResumoOutputType, type StatusRegistro } from '@shared/dto'

import { STATUS_REGISTRO_LABEL } from '../../components/common/registro-form/enum-labels'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useApiQuery } from '../../hooks/use-api-query'
import { RegistrarAulaDialog } from './components/registrar-aula-dialog'
import { RegistroRow } from './components/registro-row'

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

const ORDEM_STATUS: StatusRegistro[] = ['NAO_INICIADO', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO']

export function AcompanhamentoPage() {
  const [data, setData] = useState(() => paraISO(new Date()))
  const [busca, setBusca] = useState('')
  const [linhaAtiva, setLinhaAtiva] = useState<RegistroResumoOutputType | null>(null)

  const { data: registros, loading, refetch } = useApiQuery('listarRegistrosDoDia', {
    query: { data } as unknown as { data: Date },
  })

  const registrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = registros ?? []
    if (!termo) return lista
    return lista.filter(
      (r) => r.alunoNome.toLowerCase().includes(termo) || r.horarioPrevisto.includes(termo),
    )
  }, [registros, busca])

  const contagens = useMemo(() => {
    const base: Record<StatusRegistro, number> = {
      NAO_INICIADO: 0,
      PENDENTE: 0,
      EM_ANDAMENTO: 0,
      CONCLUIDO: 0,
    }
    for (const registro of registros ?? []) {
      base[statusRegistro(registro)] += 1
    }
    return base
  }, [registros])

  function mudarDia(deltaDias: number) {
    const atual = new Date(`${data}T00:00:00`)
    atual.setDate(atual.getDate() + deltaDias)
    setData(paraISO(atual))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <p className="text-sm text-muted-foreground">Lista diária de aulas por horário</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => mudarDia(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-auto" />
        <Button variant="outline" size="icon" onClick={() => mudarDia(1)}>
          <ChevronRight className="size-4" />
        </Button>

        <div className="flex flex-wrap gap-2">
          {ORDEM_STATUS.map((status) => (
            <span key={status} className="rounded-full border px-3 py-1 text-xs">
              {contagens[status]} {STATUS_REGISTRO_LABEL[status]}
            </span>
          ))}
        </div>
      </div>

      <Input
        placeholder="Buscar aluno..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

      <div className="space-y-2">
        {registrosFiltrados
          .slice()
          .sort((a, b) => a.horarioPrevisto.localeCompare(b.horarioPrevisto))
          .map((registro) => (
            <RegistroRow
              key={registro.horarioId}
              registro={registro}
              onAbrir={() => setLinhaAtiva(registro)}
            />
          ))}
      </div>

      <RegistrarAulaDialog
        key={linhaAtiva?.horarioId ?? 'fechado'}
        open={Boolean(linhaAtiva)}
        onOpenChange={(open) => !open && setLinhaAtiva(null)}
        resumo={linhaAtiva}
        onSalvo={refetch}
      />
    </div>
  )
}
