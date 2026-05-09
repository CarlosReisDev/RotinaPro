import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Activity, Bike, Dumbbell, Flame, Trash2, Waves, Clock3, ChevronRight, Replace, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BottomNav from '../components/ui/BottomNav'
import ModalConfirmacao from '../components/ui/ModalConfirmacao'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import SessaoService from '../services/SessaoService'

const NAV_H = 65
const PAGINA = 20

const LABEL_INTENSIDADE = { leve: 'Leve', moderado: 'Moderada', intenso: 'Intensa' }

function corAtividade(nome = '') {
  const n = nome.toLowerCase()
  if (n.includes('nat')) return '#0891B2'
  if (n.includes('corr') || n.includes('caminh')) return '#2563EB'
  if (n.includes('cicl')) return '#16A34A'
  if (n.includes('funcional') || n.includes('cross')) return '#EA580C'
  return 'var(--color-accent)'
}

function IconeSessao({ sessao }) {
  if (sessao.tipo === 'musculacao') return <Dumbbell size={18} color="var(--color-accent)" aria-hidden />
  const nome = sessao.atividade_met?.nome ?? ''
  const cor = corAtividade(nome)
  const n = nome.toLowerCase()
  if (n.includes('nat')) return <Waves size={18} color={cor} aria-hidden />
  if (n.includes('cicl')) return <Bike size={18} color={cor} aria-hidden />
  return <Activity size={18} color={cor} aria-hidden />
}

function nomeSessao(sessao) {
  if (sessao.tipo === 'musculacao') return sessao.template_treino?.nome ?? 'Musculação'
  return sessao.atividade_met?.nome ?? 'Atividade livre'
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function CardSessao({ sessao, onAbrir }) {
  const kcal = Math.round(Number(sessao.calorias_gastas_manual ?? sessao.calorias_gastas_estimadas ?? 0))
  const corBg = sessao.tipo === 'musculacao' ? 'rgba(249,115,22,0.12)' : `${corAtividade(sessao.atividade_met?.nome ?? '')}18`
  return (
    <button
      type="button"
      onClick={() => onAbrir(sessao.id)}
      style={{
        width: '100%', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 14,
        padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: corBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconeSessao sessao={sessao} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nomeSessao(sessao)}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
          {formatarData(sessao.data)} · {sessao.duracao_minutos} min{kcal > 0 ? ` · ${kcal} kcal` : ''}
          {sessao.intensidade ? ` · ${LABEL_INTENSIDADE[sessao.intensidade]}` : ''}
        </p>
      </div>
      <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
    </button>
  )
}

function ModalDetalhe({ sessaoId, userId, onFechar }) {
  const qc = useQueryClient()
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const { data: sessao, isLoading } = useQuery({
    queryKey: ['sessao-detalhe', sessaoId],
    queryFn: () => SessaoService.obterDetalheSessao(sessaoId),
    enabled: !!sessaoId,
    staleTime: 1000 * 60 * 5,
  })

  const excluir = useMutation({
    mutationFn: () => SessaoService.descartarSessao(sessaoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['historico-treinos', userId] })
      qc.invalidateQueries({ queryKey: ['sessoes-hoje'] })
      qc.invalidateQueries({ queryKey: ['primeira-sessao-hoje'] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Sessão excluída.')
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Detalhes da sessão"
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, background: 'var(--color-surface)',
          borderRadius: '20px 20px 0 0', maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column', zIndex: 201,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 12px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            {isLoading ? 'Carregando...' : nomeSessao(sessao ?? {})}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: 'var(--color-surface-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-2)',
            }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading && (
            <>
              <Skeleton width="100%" height={70} radius={12} />
              <Skeleton width="100%" height={120} radius={12} />
            </>
          )}

          {!isLoading && sessao && (
            <>
              {/* Resumo */}
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--color-text-2)' }}>
                  <span>{formatarData(sessao.data)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock3 size={13} aria-hidden /> {sessao.duracao_minutos} min
                  </span>
                  {(sessao.calorias_gastas_manual ?? sessao.calorias_gastas_estimadas) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Flame size={13} aria-hidden /> {Math.round(Number(sessao.calorias_gastas_manual ?? sessao.calorias_gastas_estimadas))} kcal
                    </span>
                  )}
                  {sessao.intensidade && <span>{LABEL_INTENSIDADE[sessao.intensidade]}</span>}
                </div>
                {sessao.observacao && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 8, fontStyle: 'italic' }}>
                    "{sessao.observacao}"
                  </p>
                )}
              </div>

              {/* Exercícios (musculação) */}
              {sessao.tipo === 'musculacao' && sessao.exercicio_realizado?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>EXERCÍCIOS</p>
                  {sessao.exercicio_realizado.map(ex => (
                    <div key={ex.id} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 12px' }}>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                        {ex.nome}
                        {ex.substituido && (
                          <span style={{ fontSize: 10, color: 'var(--color-accent)', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <Replace size={10} aria-hidden /> sub
                          </span>
                        )}
                      </p>
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {ex.serie_realizada.map(s => (
                          <span key={s.numero_serie} style={{
                            fontSize: 12, padding: '3px 8px', borderRadius: 6,
                            background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
                          }}>
                            {s.numero_serie}: {s.carga_kg ? `${s.carga_kg}kg ×` : ''} {s.repeticoes}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sessao.tipo === 'musculacao' && (!sessao.exercicio_realizado || sessao.exercicio_realizado.length === 0) && (
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: 20 }}>
                  Sem exercícios registrados.
                </p>
              )}

              <button
                type="button"
                onClick={() => setConfirmExcluir(true)}
                disabled={excluir.isPending}
                style={{
                  width: '100%', minHeight: 46, borderRadius: 12,
                  border: '1.5px dashed rgba(239,68,68,0.5)', background: 'transparent',
                  color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                  cursor: excluir.isPending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4,
                }}
              >
                <Trash2 size={16} aria-hidden /> {excluir.isPending ? 'Excluindo…' : 'Excluir sessão'}
              </button>
            </>
          )}
        </div>
      </div>

      {confirmExcluir && (
        <ModalConfirmacao
          titulo="Excluir sessão?"
          descricao="Esta sessão será removida permanentemente do histórico, junto com exercícios e séries registradas. Esta ação não pode ser desfeita."
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmExcluir(false)}
        />
      )}
    </>
  )
}

export default function HistoricoTreinosPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const navigate = useNavigate()
  const [detalheId, setDetalheId] = useState(null)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['historico-treinos', userId],
    queryFn: ({ pageParam = 0 }) => SessaoService.listarHistorico(userId, { limit: PAGINA, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) => ultima.length === PAGINA ? todas.length * PAGINA : undefined,
    enabled: !!userId,
    staleTime: 1000 * 60,
  })

  const sessoes = data?.pages.flat() ?? []

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
        <button type="button" onClick={() => navigate('/treinos')} aria-label="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Histórico</h1>
      </header>

      <main style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && (
          <>
            <Skeleton width="100%" height={62} radius={14} />
            <Skeleton width="100%" height={62} radius={14} />
            <Skeleton width="100%" height={62} radius={14} />
          </>
        )}

        {!isLoading && sessoes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <Dumbbell size={36} color="var(--color-text-3)" aria-hidden style={{ margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
              Sem treinos no histórico
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
              Conclua sua primeira sessão para vê-la aqui.
            </p>
          </div>
        )}

        {sessoes.map(s => <CardSessao key={s.id} sessao={s} onAbrir={setDetalheId} />)}

        {hasNextPage && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            style={{
              width: '100%', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: 12,
              padding: '12px', cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)',
              minHeight: 44, marginTop: 4,
            }}
          >
            {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}
      </main>

      {detalheId && <ModalDetalhe sessaoId={detalheId} userId={userId} onFechar={() => setDetalheId(null)} />}

      <BottomNav />
    </div>
  )
}
