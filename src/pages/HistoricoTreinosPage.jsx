import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowLeft, Activity, Bike, Dumbbell, Waves, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import ModalDetalheSessao from '../components/treinos/ModalDetalheSessao'
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

      {detalheId && <ModalDetalheSessao sessaoId={detalheId} userId={userId} onFechar={() => setDetalheId(null)} />}

      <BottomNav />
    </div>
  )
}
