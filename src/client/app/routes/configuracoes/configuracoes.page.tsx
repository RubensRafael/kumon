import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { MateriasTab } from './components/materias-tab'

export function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados de referência da unidade.</p>
      </div>

      {/* Cada aba nova (Usuários na fe-03, e o que mais vier depois) entra
          aqui sem reestruturar a página. */}
      <Tabs defaultValue="materias">
        <TabsList>
          <TabsTrigger value="materias">Matérias e conteúdos</TabsTrigger>
        </TabsList>
        <TabsContent value="materias" className="mt-4">
          <MateriasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
