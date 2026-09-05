import { useEffect, useState } from 'react'

import {
  VIRTUAL_REGISTRO_ID,
  contarNotasPreenchidas,
  isCompleto,
  isFalta,
  type AtividadeCasa,
  type Autonomia,
  type Boletim,
  type Chegada,
  type Comportamento,
  type Desempenho,
  type Foco,
  type RegistroInputType,
  type RegistroResumoOutputType,
  type RegistroUpdateInputType,
} from '@shared/dto'

import { useApiMutation } from '../../../hooks/use-api-mutation'
import { useApiQuery } from '../../../hooks/use-api-query'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Progress } from '../../../components/ui/progress'
import { Textarea } from '../../../components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group'
import {
  ATIVIDADE_CASA_LABEL,
  AUTONOMIA_LABEL,
  BOLETIM_LABEL,
  CHEGADA_LABEL,
  COMPORTAMENTO_LABEL,
  DESEMPENHO_LABEL,
  FOCO_LABEL,
} from '../../../components/common/registro-form/enum-labels'

/**
 * Sem autosave por campo — decisão do QA manual da PR #26
 * (docs/qa-fe-07-acompanhamento.md, achado crítico): o design anterior
 * disparava um PUT a cada clique, sem tratar falha — uma queda de rede no
 * meio do preenchimento avançava a barra de progresso local sem nunca
 * gravar o dado, em silêncio. Fluxo atual, só duas escritas:
 *
 * 1. Chegada — único campo visível até escolher. Cria o registro na hora
 *    (POST), só na primeira vez (`registroId` ainda nulo). FALTOU fecha o
 *    dialog assim que o POST resolve; PRESENTE/ATRASADO revela o resto.
 *    Reabrir um registro que já tem `chegada` (pendente/em andamento) não
 *    dispara POST de novo — só atualiza estado local, junto do resto.
 * 2. Os demais campos ficam em estado local (nenhuma chamada de rede por
 *    campo) até o clique em "Enviar", que dispara um único PUT com tudo
 *    preenchido até ali e só fecha o dialog se a chamada tiver sucesso.
 *
 * Reabrir um registro já `isCompleto` (calculado a partir do `resumo` no
 * momento em que o dialog abre) continua inteiramente somente-leitura —
 * isso não mudou, só o caminho de escrita de um registro incompleto.
 */
export function RegistrarAulaDialog({
  open,
  onOpenChange,
  resumo,
  bloqueadoFuturo,
  onSalvo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumo: RegistroResumoOutputType | null
  /** `true` quando a data do registro é depois de hoje — bloqueia a escrita (leitura/navegação continuam livres). */
  bloqueadoFuturo: boolean
  onSalvo: () => void
}) {
  const idInicial = resumo && resumo.id !== VIRTUAL_REGISTRO_ID ? resumo.id : null

  const [registroId, setRegistroId] = useState(idInicial)
  const [chegada, setChegada] = useState<Chegada | null>(resumo?.chegada ?? null)
  const [boletim, setBoletim] = useState<Boletim | null>(resumo?.boletim ?? null)
  const [atividadeCasa, setAtividadeCasa] = useState<AtividadeCasa | null>(resumo?.atividadeCasa ?? null)
  const [foco, setFoco] = useState<Foco | null>(resumo?.foco ?? null)
  const [autonomia, setAutonomia] = useState<Autonomia | null>(resumo?.autonomia ?? null)
  const [comportamento, setComportamento] = useState<Comportamento | null>(resumo?.comportamento ?? null)
  const [desempenho, setDesempenho] = useState<Desempenho | null>(resumo?.desempenho ?? null)
  const [conteudoIds, setConteudoIds] = useState<string[]>([])
  const [anotacao, setAnotacao] = useState('')
  const [mostrarObservacao, setMostrarObservacao] = useState(false)
  const [eraCompletoAoAbrir] = useState(() =>
    resumo
      ? isCompleto({
          chegada: resumo.chegada,
          boletim: resumo.boletim,
          atividadeCasa: resumo.atividadeCasa,
          foco: resumo.foco,
          autonomia: resumo.autonomia,
          comportamento: resumo.comportamento,
          desempenho: resumo.desempenho,
        })
      : false,
  )

  const { data: detalhe } = useApiQuery(
    'buscarRegistro',
    { params: { id: idInicial ?? '' } },
    { enabled: Boolean(idInicial) },
  )
  const { data: conteudosDaMateria } = useApiQuery(
    'listarConteudosDaMateria',
    { params: { id: resumo?.materiaId ?? '' } },
    { enabled: Boolean(resumo) },
  )

  useEffect(() => {
    if (!detalhe) return
    setConteudoIds(detalhe.conteudoIds)
    if (detalhe.anotacao) {
      setAnotacao(detalhe.anotacao)
      setMostrarObservacao(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so quando `detalhe` (a busca do id inicial) resolve
  }, [detalhe])

  const { mutate: criar, loading: criando } = useApiMutation('criarRegistro')
  const { mutate: atualizar, loading: enviando } = useApiMutation('atualizarRegistro')

  const readOnly = eraCompletoAoAbrir
  const notasPreenchidas = contarNotasPreenchidas({
    chegada,
    boletim,
    atividadeCasa,
    foco,
    autonomia,
    comportamento,
    desempenho,
  })
  const falta = isFalta({ chegada })
  const revelarNotas = chegada === 'PRESENTE' || chegada === 'ATRASADO'

  async function aoMudarChegada(novo: Chegada) {
    if (readOnly || !resumo || bloqueadoFuturo) return

    if (!registroId) {
      // Primeira escrita deste registro (Fase 1) -- cria a linha na hora.
      const corpo: RegistroInputType = {
        horarioId: resumo.horarioId,
        data: resumo.data,
        chegada: novo,
      } as unknown as RegistroInputType
      const criado = await criar({ body: corpo })
      setChegada(novo)
      setRegistroId(criado.id)
      if (novo === 'FALTOU') {
        onSalvo()
        onOpenChange(false)
      }
      return
    }

    // Registro reaberto (ja tinha chegada) -- so estado local; vai junto no "Enviar".
    setChegada(novo)
  }

  async function aoEnviar() {
    if (!registroId) return
    const corpo: RegistroUpdateInputType = {
      chegada: chegada ?? undefined,
      boletim: boletim ?? undefined,
      atividadeCasa: atividadeCasa ?? undefined,
      foco: foco ?? undefined,
      autonomia: autonomia ?? undefined,
      comportamento: comportamento ?? undefined,
      desempenho: desempenho ?? undefined,
      conteudoIds,
      anotacao,
    }
    await atualizar({ params: { id: registroId }, body: corpo })
    onSalvo()
    onOpenChange(false)
  }

  if (!resumo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {resumo.horarioPrevisto} {resumo.alunoNome}
          </DialogTitle>
        </DialogHeader>

        {!falta && revelarNotas ? <Progress value={(notasPreenchidas / 6) * 100} /> : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Chegada</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={chegada ?? ''}
              onValueChange={(v) => v && void aoMudarChegada(v as Chegada)}
              disabled={readOnly || criando || bloqueadoFuturo}
              className="justify-start"
            >
              <ToggleGroupItem value="PRESENTE">{CHEGADA_LABEL.PRESENTE}</ToggleGroupItem>
              <ToggleGroupItem value="ATRASADO">{CHEGADA_LABEL.ATRASADO}</ToggleGroupItem>
              <ToggleGroupItem value="FALTOU">{CHEGADA_LABEL.FALTOU}</ToggleGroupItem>
            </ToggleGroup>
            {bloqueadoFuturo ? (
              <p className="text-xs text-muted-foreground">Esta aula ainda não aconteceu.</p>
            ) : null}
          </div>

          {!falta && revelarNotas ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Boletim</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={boletim ?? ''}
                  onValueChange={(v) => v && setBoletim(v as Boletim)}
                  disabled={readOnly}
                  className="justify-start"
                >
                  <ToggleGroupItem value="PEGOU">{BOLETIM_LABEL.PEGOU}</ToggleGroupItem>
                  <ToggleGroupItem value="NAO_PEGOU">{BOLETIM_LABEL.NAO_PEGOU}</ToggleGroupItem>
                  <ToggleGroupItem value="PROBLEMA">{BOLETIM_LABEL.PROBLEMA}</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Atividade de casa</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={atividadeCasa ?? ''}
                  onValueChange={(v) => v && setAtividadeCasa(v as AtividadeCasa)}
                  disabled={readOnly}
                  className="flex-wrap justify-start"
                >
                  <ToggleGroupItem value="FEZ">{ATIVIDADE_CASA_LABEL.FEZ}</ToggleGroupItem>
                  <ToggleGroupItem value="FEZ_PARCIALMENTE">
                    {ATIVIDADE_CASA_LABEL.FEZ_PARCIALMENTE}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="NAO_FEZ">{ATIVIDADE_CASA_LABEL.NAO_FEZ}</ToggleGroupItem>
                  <ToggleGroupItem value="NAO_HAVIA">{ATIVIDADE_CASA_LABEL.NAO_HAVIA}</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Postura em aula</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Foco</p>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={foco ?? ''}
                    onValueChange={(v) => v && setFoco(v as Foco)}
                    disabled={readOnly}
                    className="justify-start"
                  >
                    {(Object.keys(FOCO_LABEL) as Foco[]).map((v) => (
                      <ToggleGroupItem key={v} value={v}>
                        {FOCO_LABEL[v]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Autonomia</p>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={autonomia ?? ''}
                    onValueChange={(v) => v && setAutonomia(v as Autonomia)}
                    disabled={readOnly}
                    className="justify-start"
                  >
                    {(Object.keys(AUTONOMIA_LABEL) as Autonomia[]).map((v) => (
                      <ToggleGroupItem key={v} value={v}>
                        {AUTONOMIA_LABEL[v]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Comportamento</p>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={comportamento ?? ''}
                    onValueChange={(v) => v && setComportamento(v as Comportamento)}
                    disabled={readOnly}
                    className="flex-wrap justify-start"
                  >
                    {(Object.keys(COMPORTAMENTO_LABEL) as Comportamento[]).map((v) => (
                      <ToggleGroupItem key={v} value={v}>
                        {COMPORTAMENTO_LABEL[v]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Desempenho na aula</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={desempenho ?? ''}
                  onValueChange={(v) => v && setDesempenho(v as Desempenho)}
                  disabled={readOnly}
                  className="flex-wrap justify-start"
                >
                  {(Object.keys(DESEMPENHO_LABEL) as Desempenho[]).map((v) => (
                    <ToggleGroupItem key={v} value={v}>
                      {DESEMPENHO_LABEL[v]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Conteúdos trabalhados</p>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  value={conteudoIds}
                  onValueChange={setConteudoIds}
                  disabled={readOnly}
                  className="flex-wrap justify-start"
                >
                  {conteudosDaMateria
                    ?.filter((c) => c.ativo)
                    .map((conteudo) => (
                      <ToggleGroupItem key={conteudo.id} value={conteudo.id}>
                        {conteudo.nome}
                      </ToggleGroupItem>
                    ))}
                </ToggleGroup>
              </div>

              {mostrarObservacao || anotacao ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Observação</p>
                  <Textarea
                    value={anotacao}
                    disabled={readOnly}
                    onChange={(e) => setAnotacao(e.target.value)}
                  />
                </div>
              ) : !readOnly ? (
                <Button type="button" variant="link" className="px-0" onClick={() => setMostrarObservacao(true)}>
                  + Adicionar observação
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          {revelarNotas || falta ? (
            <p className="text-sm text-muted-foreground">
              {falta || notasPreenchidas === 6 ? '100% concluído' : `${notasPreenchidas}/6 notas`}
            </p>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={() => (readOnly ? onOpenChange(false) : void aoEnviar())}
            disabled={!readOnly && (!registroId || enviando)}
          >
            {readOnly ? 'Fechar' : enviando ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
