import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export function MetricCard({
  titulo,
  valor,
  legenda,
}: {
  titulo: string
  valor: string | number
  legenda: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-sm text-muted-foreground">{legenda}</p>
      </CardContent>
    </Card>
  )
}
