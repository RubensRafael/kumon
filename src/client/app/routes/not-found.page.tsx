import { Link } from 'react-router'

import { Button } from '../components/ui/button'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Página não encontrada
      </h1>
      <p className="mt-2 text-muted-foreground">
        O endereço acessado não existe ou foi movido.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
