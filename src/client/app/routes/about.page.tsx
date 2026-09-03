import { Card } from '../components/ui/card'

const STACK = [
  ['Front-end', 'React 19 + Vite, navegacao 100% client-side com React Router.'],
  ['Back-end', 'Hono no Cloudflare Workers, servido pelo @hono/vite-dev-server em dev.'],
  ['Banco', 'PostgreSQL do Neon via Prisma Driver Adapters (@prisma/adapter-neon).'],
  ['Estilo', 'Tailwind CSS v4 pelo plugin oficial do Vite.'],
] as const

export function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sobre o projeto</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {STACK.map(([title, description]) => (
          <Card key={title} title={title} description={description} />
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Esta pagina foi renderizada sem nenhuma ida ao servidor: o React Router trocou a rota no
        cliente.
      </p>
    </div>
  )
}
