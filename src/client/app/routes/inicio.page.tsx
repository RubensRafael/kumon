import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../hooks/use-auth'

/**
 * Landing temporária — a fe-05 (Painel) substitui isto pelo dashboard de
 * verdade. Existe só pra `/` ter algo pra mostrar entre esta PR e aquela.
 */
export function InicioPage() {
  const { usuario } = useAuth()

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Bem-vindo{usuario ? `, ${usuario.nome}` : ''}</CardTitle>
        <CardDescription>O painel da unidade chega numa PR futura.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Por enquanto, esta é só a tela inicial autenticada — o app cresce
        feature a feature nas próximas PRs.
      </CardContent>
    </Card>
  )
}
