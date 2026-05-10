import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Plus, Apple, Beef, Wheat, Droplet, Check, X, Edit3,
  ChevronRight, ChevronDown, ChevronLeft, Utensils, Flame, Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import SafeInput from '../components/ui/SafeInput'
import CapturaFoto from '../components/dieta/CapturaFoto'
import MontarPorAlimentos from '../components/dieta/MontarPorAlimentos'
import ModalDetalheRefeicao from '../components/dieta/ModalDetalheRefeicao'
import { useAuth } from '../contexts/AuthContext'
import RefeicaoService from '../services/RefeicaoService'
import DashboardService from '../services/DashboardService'
import AguaService from '../services/AguaService'
import { COR_KCAL, COR_PROT, COR_CARB, COR_GORD, COR_HORA, COR_AGUA, COR_SUCESSO, COR_ERRO } from '../utils/cores'

// ─── Date helpers ─────────────────────────────────────────────

function dataHojeISO() {
  return new Date().toISOString().split('T')[0]
}
function anteriorDia(iso) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
function proximoDia(iso) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function labelData(iso, hoje) {
  if (iso === hoje) return 'Hoje'
  if (iso === anteriorDia(hoje)) return 'Ontem'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatarHora(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function deriveOrigem(descricao, foto) {
  const temTexto = !!descricao?.trim()
  const temFoto  = !!foto
  if (temFoto && temTexto) return 'textoFoto'
  if (temFoto) return 'foto'
  return 'texto'
}

const NAV_H = 65

// ─── Sub-componentes ──────────────────────────────────────────

function BarraProg({ valor = 0, meta = 0, cor, label, unit = 'g', casas = 0, corOver = COR_ERRO, loading }) {
  const pct  = meta > 0 ? Math.min(valor / meta, 1) : 0
  const over = meta > 0 && valor > meta
  const fmt  = v => casas > 0 ? Number(v).toFixed(casas) : Math.round(v)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: cor, fontWeight: 700 }}>{label}</span>
        {loading
          ? <Skeleton width={50} height={11} />
          : <span style={{ fontSize: 11, color: over ? corOver : 'var(--color-text-3)' }}>
              {fmt(valor)}{unit}<span style={{ opacity: 0.6 }}> / {fmt(meta)}{unit}</span>
            </span>
        }
      </div>
      <div style={{ height: 4, background: 'var(--color-surface-2)', borderRadius: 99 }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: over ? corOver : cor,
          width: `${pct * 100}%`,
          transition: 'width 600ms ease',
        }} />
      </div>
    </div>
  )
}

function BotaoAgua({ label, onClick, disabled, ativo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, minHeight: 44, border: `1px solid ${ativo ? COR_AGUA : 'var(--color-border)'}`,
        borderRadius: 12, background: ativo ? `${COR_AGUA}18` : 'var(--color-bg)',
        color: COR_AGUA, fontFamily: 'var(--font-heading)',
        fontSize: 13, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

function CardRefeicao({ refeicao, onAbrir }) {
  const kcal       = Math.round(Number(refeicao.calorias_confirmadas ?? 0))
  const ehAlimento = refeicao.origem === 'alimento'
  const Icone      = ehAlimento ? Utensils : Apple
  return (
    <button
      type="button"
      onClick={() => onAbrir(refeicao.id)}
      aria-label="Ver detalhes"
      style={{
        width: '100%', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 14,
        padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'transform var(--t-fast)',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: ehAlimento ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icone size={18} color={ehAlimento ? 'var(--color-accent)' : COR_SUCESSO} aria-hidden />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {refeicao.descricao_texto || 'Refeição'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
          <span style={{ color: COR_HORA, fontWeight: 600 }}>{formatarHora(refeicao.data_hora)}</span>
          {' · '}
          <span style={{ color: COR_KCAL, fontWeight: 700 }}>{kcal} kcal</span>
          {' · '}
          <span style={{ color: COR_PROT, fontWeight: 600 }}>P {Math.round(refeicao.proteina_g)}g</span>
          {' · '}
          <span style={{ color: COR_CARB, fontWeight: 600 }}>C {Math.round(refeicao.carboidrato_g)}g</span>
          {' · '}
          <span style={{ color: COR_GORD, fontWeight: 600 }}>G {Math.round(refeicao.gordura_g)}g</span>
        </p>
        {refeicao.classificacao_ia && (
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2, fontStyle: 'italic' }}>
            {refeicao.classificacao_ia}
          </p>
        )}
      </div>
      <ChevronRight size={14} color="var(--color-text-3)" aria-hidden />
    </button>
  )
}

function MacroInput({ id, label, icone, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 10, color: color ?? 'var(--color-text-3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icone} {label}
      </label>
      <SafeInput
        id={id}
        type="number"
        inputMode="decimal"
        min={0} max={5000} step={0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--color-bg)',
          border: `1.5px solid ${color ? color + '55' : 'var(--color-border)'}`,
          borderRadius: 10, padding: '8px 10px', fontSize: 14,
          color: 'var(--color-text)', outline: 'none',
          width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────

export default function DietaPage() {
  const { session, perfil } = useAuth()
  const userId = session?.user?.id
  const qc     = useQueryClient()
  const hoje   = dataHojeISO()

  const [dataISO, setDataISO] = useState(hoje)
  const ehHoje = dataISO === hoje

  // Água state
  const [aguaAberta, setAguaAberta]             = useState(false)
  const [aguaCustom, setAguaCustom]             = useState('')
  const [aguaCustomAberto, setAguaCustomAberto] = useState(false)
  const [registroAberto, setRegistroAberto]     = useState(false)

  // Metas state
  const [metaAberta, setMetaAberta]     = useState(false)
  const [mKcal, setMKcal]               = useState('')
  const [mVariavel, setMVariavel]       = useState(false)
  const [mTreino, setMTreino]           = useState('')
  const [mDescanso, setMDescanso]       = useState('')
  const [mAgua, setMAgua]               = useState('')
  const [mProtPct, setMProtPct]         = useState('30')
  const [mCarbPct, setMCarbPct]         = useState('45')
  const [mGordPct, setMGordPct]         = useState('25')

  // IA state
  const [descricao, setDescricao]     = useState('')
  const [foto, setFoto]               = useState(null)
  const [analisado, setAnalisado]     = useState(false)
  const [calorias, setCalorias]       = useState('')
  const [proteina, setProteina]       = useState('')
  const [carboidrato, setCarboidrato] = useState('')
  const [gordura, setGordura]         = useState('')
  const [classificacao, setClassificacao] = useState('')
  const [detalheId, setDetalheId]     = useState(null)
  const [iaAberta, setIaAberta]       = useState(false)

  // ─── Queries ───────────────────────────────────────────────

  const refeicoes = useQuery({
    queryKey: ['refeicoes-dia', userId, dataISO],
    queryFn:  () => RefeicaoService.listarDoDia(userId, dataISO),
    enabled:  !!userId,
    staleTime: 1000 * 30,
  })

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['resumo-diario', dataISO],
    queryFn:  () => DashboardService.getResumoDiario(dataISO),
    staleTime: 1000 * 60 * 2,
  })

  const { data: meta } = useQuery({
    queryKey: ['configuracao-dieta', userId],
    queryFn:  () => DashboardService.getMetaAtual(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 30,
  })

  // ─── Valores do resumo ─────────────────────────────────────

  const consumido  = resumo?.total_calorias_consumidas ?? 0
  const gasto      = resumo?.total_calorias_gastas ?? 0
  const aguaMl     = resumo?.total_agua_ml ?? 0
  const metaKcal   = meta?.meta_calorica_diaria ?? 0
  const metaProt   = meta?.meta_proteina_g ?? 0
  const metaCarb   = meta?.meta_carboidrato_g ?? 0
  const metaGord   = meta?.meta_gordura_g ?? 0
  const metaAgua   = meta?.meta_agua_ml ?? 2500
  const saldo      = metaKcal - consumido + gasto

  // ─── Mutations ─────────────────────────────────────────────

  function toggleMeta() {
    if (!metaAberta && meta) {
      const kcal = Math.round(meta.meta_calorica_diaria ?? 0)
      setMKcal(String(kcal))
      setMVariavel(!!meta.meta_variavel)
      setMTreino(meta.meta_calorica_treino    ? String(Math.round(meta.meta_calorica_treino))    : '')
      setMDescanso(meta.meta_calorica_descanso ? String(Math.round(meta.meta_calorica_descanso)) : '')
      setMAgua(String(meta?.meta_agua_ml ?? 2500))
      if (kcal > 0) {
        const prot = Math.round((Number(meta.meta_proteina_g    ?? 0) * 4 / kcal) * 100)
        const carb = Math.round((Number(meta.meta_carboidrato_g ?? 0) * 4 / kcal) * 100)
        const gord = Math.round((Number(meta.meta_gordura_g     ?? 0) * 9 / kcal) * 100)
        setMProtPct(String(prot || 30))
        setMCarbPct(String(carb || 45))
        setMGordPct(String(gord || 25))
      }
    }
    setMetaAberta(v => !v)
  }

  const somaMacros = Number(mProtPct || 0) + Number(mCarbPct || 0) + Number(mGordPct || 0)
  const macrosOk   = Math.abs(somaMacros - 100) <= 1
  const kcalNum    = Number(mKcal) || 0
  const gramasProt = Math.round((Number(mProtPct || 0) / 100) * kcalNum / 4)
  const gramasCarb = Math.round((Number(mCarbPct || 0) / 100) * kcalNum / 4)
  const gramasGord = Math.round((Number(mGordPct || 0) / 100) * kcalNum / 9)

  const salvarMeta = useMutation({
    mutationFn: () => DashboardService.atualizarMeta(userId, meta?.id, {
      metaCalorica: Number(mKcal),
      metaVariavel: mVariavel,
      metaTreino:   mVariavel ? Number(mTreino)   : Number(mKcal),
      metaDescanso: mVariavel ? Number(mDescanso) : Number(mKcal),
      metaAgua:     Number(mAgua),
      metaProteina: gramasProt,
      metaCarbo:    gramasCarb,
      metaGordura:  gramasGord,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracao-dieta', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Metas atualizadas!')
      setMetaAberta(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const registrarAgua = useMutation({
    mutationFn: (ml) => AguaService.registrar(userId, ml),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumo-diario', dataISO] })
      qc.invalidateQueries({ queryKey: ['resumo-diario', hoje] })
    },
    onError: (e) => toast.error(e.message),
  })

  function invalidarDia() {
    qc.invalidateQueries({ queryKey: ['refeicoes-dia', userId, dataISO] })
    qc.invalidateQueries({ queryKey: ['resumo-diario', dataISO] })
    qc.invalidateQueries({ queryKey: ['resumo-diario', hoje] })
  }

  const analisar = useMutation({
    mutationFn: () => foto
      ? RefeicaoService.analisarPorFoto({ imagemBase64: foto.base64, descricao, objetivoUsuario: perfil?.objetivo })
      : RefeicaoService.analisarPorTexto({ descricao, objetivoUsuario: perfil?.objetivo }),
    onSuccess: (data) => {
      setCalorias(String(Math.round(data.calorias)))
      setProteina(String(Math.round(data.proteina_g)))
      setCarboidrato(String(Math.round(data.carboidrato_g)))
      setGordura(String(Math.round(data.gordura_g)))
      setClassificacao(data.classificacao || '')
      if (!descricao.trim() && data.descricao_identificada) setDescricao(data.descricao_identificada)
      setAnalisado(true)
      toast.success('Análise pronta. Confira e ajuste se necessário.')
    },
    onError: (e) => toast.error(e.message),
  })

  const salvar = useMutation({
    mutationFn: () => RefeicaoService.salvar({
      userId, descricao, calorias,
      proteina_g: proteina, carboidrato_g: carboidrato, gordura_g: gordura,
      classificacao, origem: deriveOrigem(descricao, foto),
    }),
    onSuccess: () => { invalidarDia(); toast.success('Refeição registrada!'); resetar() },
    onError:   (e) => toast.error(e.message),
  })

  function resetar() {
    setDescricao(''); setFoto(null); setAnalisado(false)
    setCalorias(''); setProteina(''); setCarboidrato(''); setGordura(''); setClassificacao('')
  }

  const podeAnalisar = (descricao.trim().length >= 2 || !!foto) && !analisar.isPending
  const podeSalvar   = calorias !== '' && proteina !== '' && carboidrato !== '' && gordura !== '' && !salvar.isPending

  // ─── Render ────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>

      {/* Header + nav de data */}
      <header style={{ padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Dieta</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setDataISO(anteriorDia(dataISO))}
            aria-label="Dia anterior"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={18} color="var(--color-text-2)" aria-hidden />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: ehHoje ? 'var(--color-accent)' : 'var(--color-text)',
            }}>
              {labelData(dataISO, hoje)}
            </span>
            {!ehHoje && (
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                {new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDataISO(d => d < hoje ? proximoDia(d) : d)}
            disabled={ehHoje}
            aria-label="Próximo dia"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', cursor: ehHoje ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: ehHoje ? 0.3 : 1,
            }}
          >
            <ChevronRight size={18} color="var(--color-text-2)" aria-hidden />
          </button>
        </div>
      </header>

      <main style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Resumo do dia */}
        <section style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 16, padding: '16px',
        }}>
          {/* Calorias + saldo */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              {loadingResumo
                ? <><Skeleton width={100} height={32} /><Skeleton width={80} height={13} style={{ marginTop: 4 }} /></>
                : <>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, color: COR_KCAL, lineHeight: 1 }}>
                      {Math.round(consumido)}
                      <span style={{ fontSize: 14, color: 'var(--color-text-3)', fontWeight: 400, marginLeft: 4 }}>
                        / {Math.round(metaKcal)} kcal
                      </span>
                    </p>
                    <p style={{ fontSize: 13, marginTop: 4, color: saldo < 0 ? COR_ERRO : saldo > 0 ? COR_SUCESSO : 'var(--color-text-2)' }}>
                      Saldo: {saldo >= 0 ? '+' : ''}{Math.round(saldo)} kcal
                    </p>
                  </>
              }
            </div>
            {gasto > 0 && !loadingResumo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(249,115,22,0.1)', borderRadius: 10,
                padding: '6px 10px',
              }}>
                <Flame size={13} color="var(--color-accent)" aria-hidden />
                <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700 }}>
                  -{Math.round(gasto)} kcal treino
                </span>
              </div>
            )}
          </div>

          {/* Barras de progresso */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BarraProg valor={consumido} meta={metaKcal} cor={COR_KCAL} label="Kcal" unit=" kcal" loading={loadingResumo} />
            <div style={{ display: 'flex', gap: 16 }}>
              <BarraProg valor={resumo?.total_proteina_g ?? 0}    meta={metaProt} cor={COR_PROT} label="Proteína" loading={loadingResumo} />
              <BarraProg valor={resumo?.total_carboidrato_g ?? 0} meta={metaCarb} cor={COR_CARB} label="Carboidrato" loading={loadingResumo} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <BarraProg valor={resumo?.total_gordura_g ?? 0} meta={metaGord} cor={COR_GORD} label="Gordura" loading={loadingResumo} />
              <BarraProg valor={aguaMl / 1000} meta={metaAgua / 1000} cor={COR_AGUA} label="Água" unit="L" casas={1} corOver={COR_SUCESSO} loading={loadingResumo} />
            </div>
          </div>
        </section>

        {/* ── Apenas para hoje ── */}
        {ehHoje && (
          <>
            {/* Água — colapsável */}
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setAguaAberta(v => !v)}
                style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Droplet size={14} color={COR_AGUA} aria-hidden />
                <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1, textAlign: 'left' }}>ÁGUA</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: aguaMl >= metaAgua ? COR_SUCESSO : COR_AGUA, marginRight: 4 }}>
                  {(aguaMl / 1000).toFixed(1)}<span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>/{(metaAgua / 1000).toFixed(1)} L</span>
                </span>
                <ChevronDown size={16} color="var(--color-text-3)" aria-hidden style={{ transform: aguaAberta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>

              {aguaAberta && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[200, 500].map(ml => (
                      <BotaoAgua key={ml} label={`+${ml} ml`} onClick={() => registrarAgua.mutate(ml)} disabled={registrarAgua.isPending} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1000, 1500].map(ml => (
                      <BotaoAgua key={ml} label={ml === 1000 ? '+1 L' : '+1,5 L'} onClick={() => registrarAgua.mutate(ml)} disabled={registrarAgua.isPending} />
                    ))}
                    <BotaoAgua label="Outro" onClick={() => setAguaCustomAberto(v => !v)} disabled={registrarAgua.isPending} ativo={aguaCustomAberto} />
                  </div>
                  {aguaCustomAberto && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <SafeInput type="number" maxLength={4} placeholder="ml" value={aguaCustom} onChange={e => setAguaCustom(e.target.value)}
                        style={{ flex: 1, minHeight: 44, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '0 12px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
                      <button type="button" disabled={!aguaCustom || registrarAgua.isPending}
                        onClick={() => { const v = parseInt(aguaCustom, 10); if (v > 0 && v <= 5000) { registrarAgua.mutate(v); setAguaCustom(''); setAguaCustomAberto(false) } }}
                        style={{ minHeight: 44, padding: '0 18px', borderRadius: 12, border: 'none', background: COR_AGUA, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, cursor: (!aguaCustom || registrarAgua.isPending) ? 'not-allowed' : 'pointer', opacity: (!aguaCustom || registrarAgua.isPending) ? 0.5 : 1 }}>
                        Adicionar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Adicionar refeição — colapsável externo */}
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setRegistroAberto(v => !v)}
                style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={14} color="var(--color-accent)" aria-hidden />
                <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1, textAlign: 'left' }}>ADICIONAR REFEIÇÃO</span>
                <ChevronDown size={16} color="var(--color-text-3)" aria-hidden style={{ transform: registroAberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {registroAberto && (
                <div style={{ borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                  <MontarPorAlimentos />

                  {/* Analisar com IA — nested collapsible */}
                  <div style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setIaAberta(v => !v)}
                      style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Sparkles size={13} color="var(--color-accent)" aria-hidden />
                      <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1, textAlign: 'left' }}>
                        ANALISAR COM IA
                      </span>
                      <ChevronDown
                        size={16} color="var(--color-text-3)" aria-hidden
                        style={{ transform: iaAberta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      />
                    </button>

                    {iaAberta && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <CapturaFoto
                          valor={foto}
                          onChange={(novo) => { setFoto(novo); if (analisado) setAnalisado(false) }}
                          disabled={analisar.isPending || salvar.isPending}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label htmlFor="desc" style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
                            {foto ? 'Detalhes adicionais (opcional)' : 'O que você comeu?'}
                          </label>
                          <SafeInput
                            id="desc"
                            type="text"
                            maxLength={1000}
                            value={descricao}
                            onChange={(e) => { setDescricao(e.target.value); if (analisado) setAnalisado(false) }}
                            placeholder={foto
                              ? 'Ex: arroz integral, sem óleo, porção pequena'
                              : 'Ex: 2 ovos mexidos, 1 pão integral, café preto'}
                            style={{
                              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                              borderRadius: 12, minHeight: 48, padding: '10px 12px', fontSize: 15,
                              color: 'var(--color-text)', outline: 'none',
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => analisar.mutate()}
                          disabled={!podeAnalisar}
                          onMouseDown={e => { if (podeAnalisar) e.currentTarget.style.transform = 'scale(0.985)' }}
                          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                          onTouchStart={e => { if (podeAnalisar) e.currentTarget.style.transform = 'scale(0.985)' }}
                          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                          style={{
                            width: '100%', minHeight: 46, border: 'none', borderRadius: 12,
                            background: podeAnalisar ? 'rgba(249,115,22,0.14)' : 'var(--color-surface-2)',
                            color: podeAnalisar ? 'var(--color-accent)' : 'var(--color-text-3)',
                            cursor: podeAnalisar ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'transform var(--t-fast)',
                          }}
                        >
                          <Sparkles size={16} aria-hidden />
                          {analisar.isPending ? 'Analisando...' : analisado ? 'Reanalisar com IA' : 'Analisar com IA'}
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <MacroInput id="kcal" label="KCAL"     icone={null}                              value={calorias}    onChange={setCalorias}    color={COR_KCAL} />
                            <MacroInput id="prot" label="PROT (g)" icone={<Beef  size={10} aria-hidden />}   value={proteina}    onChange={setProteina}    color={COR_PROT} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <MacroInput id="carb" label="CARB (g)" icone={<Wheat size={10} aria-hidden />}   value={carboidrato} onChange={setCarboidrato} color={COR_CARB} />
                            <MacroInput id="gord" label="GORD (g)" icone={<Droplet size={10} aria-hidden />} value={gordura}     onChange={setGordura}    color={COR_GORD} />
                          </div>
                        </div>

                        {classificacao && (
                          <div style={{
                            fontSize: 12, color: 'var(--color-text-2)',
                            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                            borderRadius: 10, padding: '8px 10px',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <Sparkles size={12} color="var(--color-accent)" aria-hidden />
                            <span style={{ flex: 1 }}>{classificacao}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={resetar}
                            disabled={salvar.isPending}
                            style={{
                              flex: 1, minHeight: 46, border: '1px solid var(--color-border)',
                              background: 'var(--color-bg)', color: 'var(--color-text-2)',
                              borderRadius: 12, fontSize: 14, fontWeight: 600,
                              cursor: salvar.isPending ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                          >
                            <X size={14} aria-hidden /> Limpar
                          </button>
                          <button
                            type="button"
                            onClick={() => salvar.mutate()}
                            disabled={!podeSalvar}
                            onMouseDown={e => { if (podeSalvar) e.currentTarget.style.transform = 'scale(0.985)' }}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            onTouchStart={e => { if (podeSalvar) e.currentTarget.style.transform = 'scale(0.985)' }}
                            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                            style={{
                              flex: 2, minHeight: 46, border: 'none', borderRadius: 12,
                              background: podeSalvar ? 'var(--color-accent)' : 'var(--color-surface-2)',
                              color: podeSalvar ? '#fff' : 'var(--color-text-3)',
                              fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
                              cursor: podeSalvar ? 'pointer' : 'not-allowed',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              transition: 'transform var(--t-fast)',
                            }}
                          >
                            <Check size={14} aria-hidden /> {salvar.isPending ? 'Salvando...' : 'Salvar refeição'}
                          </button>
                        </div>

                        {!analisado && podeSalvar && (
                          <p style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Edit3 size={11} aria-hidden /> Salvando com macros preenchidos manualmente
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* Refeições do dia */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.5, margin: 0 }}>
            REFEIÇÕES {ehHoje ? 'DE HOJE' : 'DO DIA'}
          </h2>
          {refeicoes.isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton height={64} borderRadius={14} />
              <Skeleton height={64} borderRadius={14} />
            </div>
          )}
          {!refeicoes.isLoading && !refeicoes.data?.length && (
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
              Nenhuma refeição registrada
            </p>
          )}
          {refeicoes.data?.map(r => (
            <CardRefeicao key={r.id} refeicao={r} onAbrir={setDetalheId} />
          ))}
        </section>

        {/* Configurar metas */}
        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={toggleMeta}
            style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Settings size={13} color="var(--color-text-3)" aria-hidden />
            <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1, textAlign: 'left' }}>
              CONFIGURAR METAS
            </span>
            <ChevronDown size={16} color="var(--color-text-3)" aria-hidden
              style={{ transform: metaAberta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>

          {metaAberta && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
                  Meta calórica diária (kcal)
                </label>
                <SafeInput type="number" maxLength={5} value={mKcal} onChange={e => setMKcal(e.target.value)}
                  placeholder="ex: 2000"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, minHeight: 44, padding: '0 12px', fontSize: 15, color: 'var(--color-text)', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Meta variável</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Metas diferentes para treino e descanso</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMVariavel(v => !v)}
                  style={{
                    width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: mVariavel ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: mVariavel ? 21 : 3,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {mVariavel && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Dia de treino</label>
                    <SafeInput type="number" maxLength={5} value={mTreino} onChange={e => setMTreino(e.target.value)}
                      placeholder="ex: 2200"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, minHeight: 44, padding: '0 12px', fontSize: 15, color: 'var(--color-text)', outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Dia de descanso</label>
                    <SafeInput type="number" maxLength={5} value={mDescanso} onChange={e => setMDescanso(e.target.value)}
                      placeholder="ex: 1800"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, minHeight: 44, padding: '0 12px', fontSize: 15, color: 'var(--color-text)', outline: 'none' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
                    Distribuição de macros (% das calorias)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: macrosOk ? COR_SUCESSO : COR_ERRO }}>
                    {somaMacros}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { lbl: 'Prot', cor: COR_PROT, val: mProtPct, set: setMProtPct, g: gramasProt },
                    { lbl: 'Carb', cor: COR_CARB, val: mCarbPct, set: setMCarbPct, g: gramasCarb },
                    { lbl: 'Gord', cor: COR_GORD, val: mGordPct, set: setMGordPct, g: gramasGord },
                  ].map(({ lbl, cor, val, set, g }) => (
                    <div key={lbl} style={{
                      flex: 1, background: 'var(--color-bg)',
                      border: `1.5px solid ${cor}33`, borderRadius: 12,
                      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: cor, fontWeight: 700 }}>{lbl}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <SafeInput type="number" min={0} max={100} value={val}
                          onChange={e => set(e.target.value)}
                          onFocus={e => e.target.select()}
                          style={{
                            width: 44, background: 'transparent', border: 'none', outline: 'none',
                            fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
                            color: cor, textAlign: 'center', padding: 0,
                          }} />
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>%</span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{g}g</span>
                    </div>
                  ))}
                </div>
                {!macrosOk && (
                  <p style={{ fontSize: 11, color: COR_ERRO }}>
                    A soma deve ser 100%.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Meta de água (ml)</label>
                  {perfil?.peso_kg && (
                    <button type="button"
                      onClick={() => setMAgua(String(Math.round(perfil.peso_kg * 35)))}
                      style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Sugerir ({Math.round(perfil.peso_kg * 35)} ml)
                    </button>
                  )}
                </div>
                <SafeInput type="number" maxLength={5} value={mAgua} onChange={e => setMAgua(e.target.value)}
                  placeholder="ex: 2500"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, minHeight: 44, padding: '0 12px', fontSize: 15, color: 'var(--color-text)', outline: 'none' }} />
              </div>

              <button
                type="button"
                onClick={() => salvarMeta.mutate()}
                disabled={salvarMeta.isPending || !mKcal || !mAgua}
                style={{
                  width: '100%', minHeight: 46, border: 'none', borderRadius: 12,
                  background: 'var(--color-accent)', color: '#fff',
                  fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
                  cursor: (salvarMeta.isPending || !mKcal || !mAgua || !macrosOk) ? 'not-allowed' : 'pointer',
                  opacity: (salvarMeta.isPending || !mKcal || !mAgua || !macrosOk) ? 0.6 : 1,
                }}
              >
                {salvarMeta.isPending ? 'Salvando...' : 'Salvar metas'}
              </button>
            </div>
          )}
        </section>

      </main>

      {detalheId && (
        <ModalDetalheRefeicao
          refeicaoId={detalheId}
          userId={userId}
          dataISO={dataISO}
          onFechar={() => setDetalheId(null)}
        />
      )}

      <BottomNav />
    </div>
  )
}
