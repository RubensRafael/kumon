import { Link } from 'react-router'

import { Button } from '../components/ui/button'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Pagina nao encontrada
      </h1>
      <p className="mt-2 text-muted-foreground">
        O Worker devolveu o index.html e o React Router nao achou uma rota para este endereco.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao inicio</Link>
      </Button>
    </div>
  )
}
