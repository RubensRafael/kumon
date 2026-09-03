import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Pagina nao encontrada
      </h1>
      <p className="mt-2 text-slate-600">
        O Worker devolveu o index.html e o React Router nao achou uma rota para este endereco.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Voltar ao inicio
      </Link>
    </div>
  )
}
