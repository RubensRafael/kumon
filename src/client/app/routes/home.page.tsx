import { Card } from '../components/ui/card'
import { StatusBadge } from '../components/ui/status-badge'
import { useHealth } from '../hooks/use-health'

export function HomePage() {
  const { status, data, error, refresh } = useHealth()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Full-stack TypeScript na Edge
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          SPA em React servida pela Cloudflare, API em Hono rodando no mesmo Worker e Prisma
          conversando com o Neon via Driver Adapter.
        </p>
      </div>

      <Card
        title="GET /api/health"
        description="Resposta do Worker, incluindo um SELECT 1 real no banco."
        footer={
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Consultar novamente
          </button>
        }
      >
        {status === 'loading' ? <p className="text-sm text-slate-500">Consultando o Worker...</p> : null}

        {status === 'error' ? (
          <div className="space-y-2">
            <StatusBadge tone="danger">Indisponivel</StatusBadge>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={data.status === 'ok' ? 'success' : 'danger'}>
                API {data.status}
              </StatusBadge>
              <StatusBadge tone={data.database.connected ? 'success' : 'danger'}>
                Neon {data.database.connected ? `${data.database.latencyMs} ms` : 'sem conexao'}
              </StatusBadge>
              <StatusBadge tone="neutral">{data.runtime}</StatusBadge>
              <StatusBadge tone="neutral">{data.environment}</StatusBadge>
            </div>

            {data.database.error ? (
              <p className="text-sm text-rose-600">{data.database.error}</p>
            ) : null}

            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
