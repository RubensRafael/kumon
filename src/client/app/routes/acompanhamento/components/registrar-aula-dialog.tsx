import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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

function avisarSalvo() {
  toast.success('Acompanhamento salvo automaticamente', { description: 'Você pode continuar depois.' })
}

export function RegistrarAulaDialog({
  open,
  onOpenChange,
  resumo,
  onSalvo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumo: RegistroResumoOutputType | null
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
    resumo ? isCompleto({ chegada: resumo.chegada, boletim: resumo.boletim, atividadeCasa: resumo.atividadeCasa, foco: resumo.foco, autonomia: resumo.autonomia, comportamento: resumo.comportamento, desempenho: resumo.desempenho }) : false,
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

  const { mutate: criar } = useApiMutation('criarRegistro')
  const { mutate: atualizar } = useApiMutation('atualizarRegistro')

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

  async function aoMudarChegada(novo: Chegada) {
    if (readOnly || !resumo) return
    setChegada(novo)
    if (!registroId) {
      const corpo: RegistroInputType = {
        horarioId: resumo.horarioId,
        data: resumo.data,
        chegada: novo,
      } as unknown as RegistroInputType
      const criado = await criar({ body: corpo })
      setRegistroId(criado.id)
    } else {
      await atualizar({ params: { id: registroId }, body: { chegada: novo } })
    }
    avisarSalvo()
    onSalvo()
  }

  async function salvarCampo(patch: Record<string, unknown>) {
    if (readOnly || !registroId) return
    await atualizar({ params: { id: registroId }, body: patch })
    avisarSalvo()
    onSalvo()
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

        {!falta && (chegada === 'PRESENTE' || chegada === 'ATRASADO') ? (
          <Progress value={(notasPreenchidas / 6) * 100} />
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Chegada</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={chegada ?? undefined}
              onValueChange={(v) => v && void aoMudarChegada(v as Chegada)}
              disabled={readOnly}
              className="justify-start"
            >
              <ToggleGroupItem value="PRESENTE">{CHEGADA_LABEL.PRESENTE}</ToggleGroupItem>
              <ToggleGroupItem value="ATRASADO">{CHEGADA_LABEL.ATRASADO}</ToggleGroupItem>
              <ToggleGroupItem value="FALTOU">{CHEGADA_LABEL.FALTOU}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {!falta && (chegada === 'PRESENTE' || chegada === 'ATRASADO') ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Boletim</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={boletim ?? undefined}
                  onValueChange={(v) => {
                    if (!v) return
                    setBoletim(v as Boletim)
                    void salvarCampo({ boletim: v })
                  }}
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
                  value={atividadeCasa ?? undefined}
                  onValueChange={(v) => {
                    if (!v) return
                    setAtividadeCasa(v as AtividadeCasa)
                    void salvarCampo({ atividadeCasa: v })
                  }}
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
                <p className="text-sm font-medium">Comportamento</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Foco</p>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={foco ?? undefined}
                    onValueChange={(v) => {
                      if (!v) return
                      setFoco(v as Foco)
                      void salvarCampo({ foco: v })
                    }}
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
                    value={autonomia ?? undefined}
                    onValueChange={(v) => {
                      if (!v) return
                      setAutonomia(v as Autonomia)
                      void salvarCampo({ autonomia: v })
                    }}
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
                    value={comportamento ?? undefined}
                    onValueChange={(v) => {
                      if (!v) return
                      setComportamento(v as Comportamento)
                      void salvarCampo({ comportamento: v })
                    }}
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
                  value={desempenho ?? undefined}
                  onValueChange={(v) => {
                    if (!v) return
                    setDesempenho(v as Desempenho)
                    void salvarCampo({ desempenho: v })
                  }}
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
                  onValueChange={(v) => {
                    setConteudoIds(v)
                    void salvarCampo({ conteudoIds: v })
                  }}
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
                    onBlur={() => void salvarCampo({ anotacao })}
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
          <p className="text-sm text-muted-foreground">
            {falta || notasPreenchidas === 6 ? '100% concluído' : `${notasPreenchidas}/6 notas`}
          </p>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {readOnly ? 'Fechar' : 'Finalizar aula'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
