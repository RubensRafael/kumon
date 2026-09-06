import { calcularAgregacoesPainel, type PainelDadosOutputType } from '@shared/dto'

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'

/**
 * Uma linha por professor, reaproveitando `calcularAgregacoesPainel` com
 * `professorId` -- o mesmo escopo já usado no stat "Alunos" do card de
 * Professores e no dashboard individual, só que numa tabela em vez de N
 * cards. `ocupacaoPercentual` aqui é por professor (slots dele ocupados /
 * capacidade dele), não o `capacidadeSimultanea` da unidade inteira usado
 * nos cards do topo -- faz sentido por professor porque a agenda dele é o
 * recurso concreto sendo ocupado.
 */
export function ProfessoresTabela({ dados }: { dados: PainelDadosOutputType }) {
  const linhas = dados.professores.map((professor) => {
    const stats = calcularAgregacoesPainel(dados, professor.id)
    const materiasNomes = professor.materiaIds
      .map((id) => dados.materias.find((materia) => materia.id === id)?.nome)
      .filter((nome): nome is string => Boolean(nome))
    return { professor, materiasNomes, ...stats }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
          Operação do período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Matérias</TableHead>
              <TableHead className="text-right">Alunos ativos</TableHead>
              <TableHead className="text-right">Ocupação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ professor, materiasNomes, totalAlunosAtivos, ocupacaoPercentual }) => (
              <TableRow key={professor.id}>
                <TableCell className="font-medium">{professor.nome}</TableCell>
                <TableCell className="text-muted-foreground">{materiasNomes.join(' · ') || '—'}</TableCell>
                <TableCell className="text-right">{totalAlunosAtivos}</TableCell>
                <TableCell className="text-right">{ocupacaoPercentual}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
