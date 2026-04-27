import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Activity, BedDouble, Bike, ChevronRight, Droplets, Dumbbell, TrendingDown, TrendingUp, Waves } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import DashboardService from '../services/DashboardService'
import AguaService from '../services/AguaService'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import { COR_PROT, COR_CARB, COR_GORD, COR_AGUA, COR_SUCESSO, COR_ERRO } from '../utils/cores'

// ─── Helpers ─────────────────────────────────────────────────

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
}

function dataISO() {
  return new Date().toISOString().split('T')[0]
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function ProgressRing({ consumido, meta, size = 80 }) {
  const pct = meta > 0 ? Math.min(consumido / meta, 1) : 0
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const cor = pct > 1 ? COR_ERRO : pct > 0.85 ? '#EAB308' : 'var(--color-accent)'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cor} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 600ms ease' }}
      />
    </svg>
  )
}

// ─── Cards ────────────────────────────────────────────────────

const LABEL_INT = { leve: 'Leve', moderado: 'Moderada', intenso: 'Intensa' }

function iconeAtividadeLivre(tipo) {
  if (tipo === 'natacao') return <Waves size={20} color="#0891B2" aria-hidden />
  if (tipo === 'ciclismo') return <Bike size={20} color="#0891B2" aria-hidden />
  if (tipo === 'funcional') return <Dumbbell size={20} color="#0891B2" aria-hidden />
  return <Activity size={20} color="#0891B2" aria-hidden />
}

function CardTreino({ treino, sessaoDoDia, loading }) {
  const navigate = useNavigate()
  const descanso     = treino?.descanso
  const atividadeLivre = treino?.atividade_livre

  const tituloTreino = sessaoDoDia
    ? sessaoDoDia.atividade_met?.nome ?? sessaoDoDia.template_treino?.nome ?? 'Treino'
    : descanso
      ? 'Dia de descanso'
      : atividadeLivre
        ? atividadeLivre.nome
        : treino?.template_treino?.nome ?? 'Sem treino agendado'

  const fundoIcone = sessaoDoDia || (!descanso && !atividadeLivre)
    ? 'rgba(249,115,22,0.15)'
    : descanso
      ? 'rgba(71,85,105,0.2)'
      : 'rgba(8,145,178,0.16)'

  const kcal = sessaoDoDia
    ? Math.round(Number(sessaoDoDia.calorias_gastas_manual ?? sessaoDoDia.calorias_gastas_estimadas ?? 0))
    : null

  const resumoSessao = sessaoDoDia
    ? [
        sessaoDoDia.intensidade ? LABEL_INT[sessaoDoDia.intensidade] : null,
        `${sessaoDoDia.duracao_minutos} min`,
        kcal ? `${kcal} kcal` : null,
      ].filter(Boolean).join(' · ')
    : null

  return (
    <Card onClick={() => navigate('/treinos')} aria-label="Ir para treinos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: fundoIcone,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {descanso && !sessaoDoDia
              ? <BedDouble size={20} color="var(--color-text-3)" aria-hidden />
              : atividadeLivre && !sessaoDoDia
                ? iconeAtividadeLivre(atividadeLivre.tipo)
                : <Dumbbell size={20} color="var(--color-accent)" aria-hidden />}
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>TREINO DE HOJE</p>
            {loading
              ? <Skeleton width={120} height={16} />
              : <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                  {tituloTreino}
                </p>
            }
          </div>
        </div>
        <ChevronRight size={18} color="var(--color-text-3)" aria-hidden />
      </div>
      {!loading && resumoSessao && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: COR_SUCESSO,
            background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 20,
          }}>✓ {resumoSessao}</span>
        </div>
      )}
      {!loading && !sessaoDoDia && !descanso && treino && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
            background: 'rgba(249,115,22,0.1)', padding: '4px 10px', borderRadius: 20,
          }}>Iniciar treino</span>
        </div>
      )}
    </Card>
  )
}

function CardDieta({ resumo, meta, loading, userId }) {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const consumido = resumo?.total_calorias_consumidas ?? 0
  const gasto     = resumo?.total_calorias_gastas ?? 0
  const metaKcal  = meta?.meta_calorica_diaria ?? 2000
  const saldo     = metaKcal - consumido + gasto

  const registrarAgua = useMutation({
    mutationFn: (ml) => AguaService.registrar(userId, ml),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumo-diario'] }),
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card onClick={() => navigate('/dieta')} aria-label="Ir para dieta">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>CALORIAS HOJE</p>
          {loading
            ? <><Skeleton width={80} height={28} style={{ marginBottom: 4 }} /><Skeleton width={100} height={13} /></>
            : <>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                  {Math.round(consumido)} <span style={{ fontSize: 14, color: 'var(--color-text-3)', fontWeight: 400 }}>/ {Math.round(metaKcal)} kcal</span>
                </p>
                <p style={{ fontSize: 13, color: saldo < 0 ? COR_ERRO : saldo > 0 ? COR_SUCESSO : 'var(--color-text-2)', marginTop: 4 }}>
                  Saldo: {saldo >= 0 ? '+' : ''}{Math.round(saldo)} kcal
                </p>
              </>
          }
        </div>
        {!loading && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing consumido={consumido} meta={metaKcal} />
            <span style={{
              position: 'absolute',
              fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
              color: 'var(--color-text)',
            }}>
              {metaKcal > 0 ? `${Math.round((consumido / metaKcal) * 100)}%` : '0%'}
            </span>
          </div>
        )}
      </div>

      {!loading && resumo && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Prot', v: resumo.total_proteina_g,    ref: meta?.meta_proteina_g,    cor: COR_PROT },
            { label: 'Carb', v: resumo.total_carboidrato_g, ref: meta?.meta_carboidrato_g, cor: COR_CARB },
            { label: 'Gord', v: resumo.total_gordura_g,     ref: meta?.meta_gordura_g,     cor: COR_GORD },
          ].map(({ label, v, ref, cor }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: cor, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 11, color: cor, fontWeight: 600 }}>{Math.round(v)}g</span>
              </div>
              <div style={{ height: 3, background: 'var(--color-surface-2)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: cor,
                  width: `${ref > 0 ? Math.min((v / ref) * 100, 100) : 0}%`,
                  transition: 'width 600ms ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && resumo && (() => {
        const aguaMl   = resumo.total_agua_ml ?? 0
        const metaAgua = meta?.meta_agua_ml ?? 2500
        const pct      = metaAgua > 0 ? Math.min(aguaMl / metaAgua, 1) : 0
        const over     = aguaMl > metaAgua
        return (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Droplets size={12} color={COR_AGUA} aria-hidden />
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Água</span>
              </div>
              <span style={{ fontSize: 11, color: over ? COR_SUCESSO : COR_AGUA, fontWeight: 600 }}>
                {(aguaMl / 1000).toFixed(1)}L
                <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}> / {(metaAgua / 1000).toFixed(1)}L</span>
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--color-surface-2)', borderRadius: 99 }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: over ? COR_SUCESSO : COR_AGUA,
                width: `${pct * 100}%`,
                transition: 'width 600ms ease',
              }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
              {[
                { label: '+200ml', ml: 200 },
                { label: '+500ml', ml: 500 },
                { label: '+1L',    ml: 1000 },
                { label: '+1,5L',  ml: 1500 },
              ].map(({ label, ml }) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => registrarAgua.mutate(ml)}
                  disabled={registrarAgua.isPending}
                  style={{
                    flex: 1, height: 32, border: '1px solid var(--color-border)',
                    borderRadius: 8, background: 'var(--color-bg)',
                    color: COR_AGUA, fontSize: 11, fontWeight: 700,
                    cursor: registrarAgua.isPending ? 'not-allowed' : 'pointer',
                    opacity: registrarAgua.isPending ? 0.5 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })()}
    </Card>
  )
}

function CardFinancas({ saldoMes, loading }) {
  const navigate = useNavigate()
  const positivo = (saldoMes?.saldo ?? 0) >= 0

  return (
    <Card onClick={() => navigate('/financas')} aria-label="Ir para finanças">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>SALDO DO MÊS</p>
          {loading
            ? <Skeleton width={140} height={28} />
            : <p style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: positivo ? COR_SUCESSO : COR_ERRO, lineHeight: 1 }}>
                {formatarMoeda(saldoMes?.saldo ?? 0)}
              </p>
          }
        </div>
        <ChevronRight size={18} color="var(--color-text-3)" aria-hidden />
      </div>
      {!loading && saldoMes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {[
            { label: 'Entradas', valor: saldoMes.entradas || 0, cor: COR_SUCESSO, Icon: TrendingUp },
            { label: 'Gastos',   valor: saldoMes.gastos   || 0, cor: COR_ERRO, Icon: TrendingDown },
            { label: 'Crédito',  valor: saldoMes.credito  || 0, cor: '#EAB308', Icon: TrendingDown },
          ].map(({ label, valor, cor, Icon }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} color={cor} aria-hidden />
                <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 13, color: cor, fontWeight: 600 }}>{formatarMoeda(valor)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Card base ───────────────────────────────────────────────

function Card({ children, onClick, 'aria-label': ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{
        width: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 18,
        padding: '16px 18px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform var(--t-fast)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Página ───────────────────────────────────────────────────

const NAV_H = 65

export default function DashboardPage() {
  const { session, perfil } = useAuth()
  const userId = session?.user?.id
  const hoje   = dataISO()

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['resumo-diario', hoje],
    queryFn:  () => DashboardService.getResumoDiario(hoje),
    staleTime: 1000 * 60 * 5,
  })

  const { data: treino, isLoading: loadingTreino } = useQuery({
    queryKey: ['treino-hoje', userId, hoje],
    queryFn:  () => DashboardService.getTreinoDoDia(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 10,
  })

  const { data: sessaoDoDia, isLoading: loadingSessao } = useQuery({
    queryKey: ['primeira-sessao-hoje', userId, hoje],
    queryFn:  () => DashboardService.getPrimeiraSessaoDoDia(userId),
    enabled:  !!userId,
    staleTime: 1000 * 15,
  })

  const { data: saldoMes, isLoading: loadingSaldo } = useQuery({
    queryKey: ['saldo-mes', userId, hoje.slice(0, 7)],
    queryFn:  () => DashboardService.getSaldoMes(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const meta = useQuery({
    queryKey: ['configuracao-dieta', userId],
    queryFn:  () => DashboardService.getMetaAtual(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 30,
  })

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>

      {/* Header */}
      <header style={{ padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 8px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', textTransform: 'capitalize' }}>{dataHoje()}</p>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginTop: 2 }}>
          {saudacao()}, {perfil?.nome?.split(' ')[0] ?? ''}
        </h1>
      </header>

      {/* Cards */}
      <main style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CardTreino   treino={treino}     sessaoDoDia={sessaoDoDia} loading={loadingTreino || loadingSessao} />
        <CardDieta    resumo={resumo}     meta={meta.data}    loading={loadingResumo || meta.isLoading} userId={userId} />
        <CardFinancas saldoMes={saldoMes} loading={loadingSaldo} />
      </main>

      <BottomNav />

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  )
}
