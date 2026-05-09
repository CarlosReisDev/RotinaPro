import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Dumbbell, ChevronDown, ChevronRight, Lock, Trash2, Waves, Bike, Activity, BedDouble, PlayCircle, Check, TrendingUp, Save, History, CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import TreinoService from '../services/TreinoService'
import AgendaService from '../services/AgendaService'
import SessaoService from '../services/SessaoService'
import ModalTemplate from '../components/treinos/ModalTemplate'
import AgendaSemanal from '../components/treinos/AgendaSemanal'
import ModalAgendaDia from '../components/treinos/ModalAgendaDia'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import SafeInput from '../components/ui/SafeInput'
import toast from 'react-hot-toast'

const NAV_H = 65
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function iconeDoTreino(item) {
  if (item?.descanso) return <BedDouble size={18} color="var(--color-text-3)" aria-hidden />
  const tipo = item?.atividade_livre?.tipo
  if (tipo === 'natacao') return <Waves size={18} color="#0891B2" aria-hidden />
  if (tipo === 'ciclismo') return <Bike size={18} color="#0891B2" aria-hidden />
  if (tipo === 'corrida' || tipo === 'caminhada' || tipo === 'funcional' || tipo === 'outras') {
    return <Activity size={18} color="#0891B2" aria-hidden />
  }
  return <Dumbbell size={18} color="var(--color-accent)" aria-hidden />
}

function tituloTreino(item) {
  if (!item) return 'Iniciar atividade livre'
  if (item.descanso) return 'Hoje e dia de descanso'
  if (item.atividade_livre?.nome) return `Iniciar ${item.atividade_livre.nome}`
  if (item.template_treino?.nome) return `Iniciar ${item.template_treino.nome}`
  return 'Iniciar atividade livre'
}

// ─── Helpers ────────────────────────────────────────────────

const LABEL_INTENSIDADE = { leve: 'Leve', moderado: 'Moderada', intenso: 'Intensa' }

const TIPO_KEYWORD = { natacao: 'nat', corrida: 'corr', caminhada: 'caminh', ciclismo: 'cicl', funcional: 'funcional' }

function corAtividade(nome = '') {
  const n = nome.toLowerCase()
  if (n.includes('nat')) return '#0891B2'
  if (n.includes('corr') || n.includes('caminh')) return '#2563EB'
  if (n.includes('cicl')) return '#16A34A'
  if (n.includes('funcional') || n.includes('cross')) return '#EA580C'
  return 'var(--color-accent)'
}

function IconeAtividade({ nome, cor }) {
  const n = String(nome || '').toLowerCase()
  if (n.includes('nat')) return <Waves size={16} color={cor} aria-hidden />
  if (n.includes('cicl')) return <Bike size={16} color={cor} aria-hidden />
  if (n.includes('muscula') || n.includes('funcional') || n.includes('cross')) return <Dumbbell size={16} color={cor} aria-hidden />
  return <Activity size={16} color={cor} aria-hidden />
}

function CardSessaoConcluida({ sessao }) {
  const nome = sessao.atividade_met?.nome ?? sessao.template_treino?.nome ?? 'Atividade'
  const kcal = Math.round(Number(sessao.calorias_gastas_manual ?? sessao.calorias_gastas_estimadas ?? 0))
  const cor = corAtividade(nome)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `${cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <IconeAtividade nome={nome} cor={cor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nome}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
          {sessao.intensidade ? `${LABEL_INTENSIDADE[sessao.intensidade]} · ` : ''}{sessao.duracao_minutos} min · {kcal} kcal
        </p>
      </div>
      <Check size={15} color="#22C55E" aria-hidden />
    </div>
  )
}

// ─── Componentes ────────────────────────────────────────────

const LABEL_TIPO = { carga: 'Carga (kg)', repeticoes: 'Repetições', series: 'Séries' }

function ConfigProgressao({ userId }) {
  const qc = useQueryClient()
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['config-progressao', userId],
    queryFn: () => TreinoService.getConfigProgressao(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const defaults = { sessoes_para_sugerir: 3, tipo_progressao: 'carga', incremento_carga: 2.5, incremento_repeticoes: 1 }
  const [form, setForm] = useState(null)
  if (cfg !== undefined && form === null) {
    setForm({ ...defaults, ...(cfg ?? {}) })
  }

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: (dados) => TreinoService.salvarConfigProgressao(userId, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-progressao', userId] })
      toast.success('Configuração salva!')
    },
    onError: (e) => toast.error(e.message),
  })

  const [aberto, setAberto] = useState(false)

  if (isLoading || !form) return null

  const campo = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <section aria-label="Configuração de progressão" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        style={{
          width: '100%', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 16,
          padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
          transition: 'transform var(--t-fast)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(249,115,22,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="var(--color-accent)" aria-hidden />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>PROGRESSÃO</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              Configurar progressão
            </p>
          </div>
        </div>
        <ChevronDown
          size={18} color="var(--color-text-3)" aria-hidden
          style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--t-fast)' }}
        />
      </button>

      {aberto && (
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Sessões para sugerir */}
          <div>
            <label htmlFor="prog-sessoes" style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              SESSÕES CONSECUTIVAS PARA SUGERIR
            </label>
            <SafeInput
              id="prog-sessoes"
              type="number"
              inputMode="numeric"
              min={1} max={20}
              value={form.sessoes_para_sugerir}
              onChange={campo('sessoes_para_sugerir')}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '10px 12px', fontSize: 16,
                color: 'var(--color-text)', outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
              Após quantas sessões bem-sucedidas sugerir aumento
            </p>
          </div>

          {/* Tipo de progressão */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8 }}>TIPO DE PROGRESSÃO</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(LABEL_TIPO).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo_progressao: val }))}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 10, border: '1px solid',
                    borderColor: form.tipo_progressao === val ? 'var(--color-accent)' : 'var(--color-border)',
                    background: form.tipo_progressao === val ? 'rgba(249,115,22,0.12)' : 'var(--color-bg)',
                    color: form.tipo_progressao === val ? 'var(--color-accent)' : 'var(--color-text-3)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Incremento condicional */}
          {form.tipo_progressao === 'carga' && (
            <div>
              <label htmlFor="prog-carga" style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                INCREMENTO DE CARGA (KG)
              </label>
              <SafeInput
                id="prog-carga"
                type="number"
                inputMode="decimal"
                min={0.5} max={50} step={0.5}
                value={form.incremento_carga}
                onChange={campo('incremento_carga')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '10px 12px', fontSize: 16,
                  color: 'var(--color-text)', outline: 'none',
                }}
              />
            </div>
          )}

          {form.tipo_progressao === 'repeticoes' && (
            <div>
              <label htmlFor="prog-reps" style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                INCREMENTO DE REPETIÇÕES
              </label>
              <SafeInput
                id="prog-reps"
                type="number"
                inputMode="numeric"
                min={1} max={10}
                value={form.incremento_repeticoes}
                onChange={campo('incremento_repeticoes')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '10px 12px', fontSize: 16,
                  color: 'var(--color-text)', outline: 'none',
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => salvar(form)}
            disabled={isPending}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--color-accent)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '13px', cursor: 'pointer',
              fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
              transition: 'transform var(--t-fast)', minHeight: 48,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <Save size={16} aria-hidden />
            {isPending ? 'Salvando…' : 'Salvar configuração'}
          </button>
        </div>
      </div>
      )}
    </section>
  )
}

function EmptyState({ onCriar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Dumbbell size={28} color="var(--color-text-3)" aria-hidden />
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Nenhum template ainda</p>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', lineHeight: 1.5 }}>Crie seu primeiro template de treino ou use um dos modelos predefinidos abaixo.</p>
      </div>
      <button type="button" onClick={onCriar}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-accent)', color: '#fff', border: 'none',
          borderRadius: 14, padding: '13px 24px', cursor: 'pointer',
          fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
          transition: 'transform var(--t-fast)', minHeight: 48,
        }}>
        <Plus size={18} aria-hidden /> Criar template
      </button>
    </div>
  )
}

function ItemTemplate({ template, onEditar, onDeletar, predefinido }) {
  const qtd = template.exercicio_template?.[0]?.count ?? 0
  return (
    <div style={{
      width: '100%', background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 16,
      padding: '6px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <button type="button" onClick={() => onEditar(template)}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        aria-label={`${template.nome}, ${qtd} exercícios`}
        style={{
          flex: 1, background: 'transparent',
          border: 'none', borderRadius: 12,
          padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
          transition: 'transform var(--t-fast)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: predefinido ? 'rgba(71,85,105,0.2)' : 'rgba(249,115,22,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {predefinido
            ? <Lock size={18} color="var(--color-text-3)" aria-hidden />
            : <Dumbbell size={18} color="var(--color-accent)" aria-hidden />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {template.nome}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
            {qtd > 0 ? `${qtd} exercício${qtd !== 1 ? 's' : ''}` : 'Sem exercícios'}
            {predefinido && ' · Predefinido'}
          </p>
        </div>
        <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
      </button>

      {!predefinido && (
        <button type="button"
          onClick={() => onDeletar(template)}
          aria-label={`Deletar ${template.nome}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)',
            padding: 6, minWidth: 36, minHeight: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
          }}>
          <Trash2 size={16} aria-hidden />
        </button>
      )}
    </div>
  )
}

function SkeletonLista() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width={42} height={42} radius={12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="35%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────

export default function TreinosPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modal, setModal] = useState(null) // null | { template, exercicios }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [modalAgenda, setModalAgenda] = useState(null) // null | { dia, item }
  const [configAberto, setConfigAberto] = useState(false)
  const [agendaAberta, setAgendaAberta] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', userId],
    queryFn: () => TreinoService.listarTemplates(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const { data: agenda = [], isLoading: loadingAgenda } = useQuery({
    queryKey: ['agenda', userId],
    queryFn: () => AgendaService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })

  const hoje = new Date().toISOString().split('T')[0]

  const { data: sessoesDoDiaRaw } = useQuery({
    queryKey: ['sessoes-hoje', userId, hoje],
    queryFn: () => SessaoService.listarSessoesDoDia(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })
  const sessoesDoDia = Array.isArray(sessoesDoDiaRaw) ? sessoesDoDiaRaw : []

  const { mutateAsync: agendarDia, isPending: agendando } = useMutation({
    mutationFn: (payload) => AgendaService.salvarDia(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda', userId] })
      qc.invalidateQueries({ queryKey: ['treino-hoje', userId, hoje] })
      setModalAgenda(null)
      toast.success('Agendamento salvo.')
    },
    onError: (e) => toast.error(e.message),
  })

  const { mutateAsync: limparDia, isPending: limpando } = useMutation({
    mutationFn: (diaSemana) => AgendaService.removerDia(userId, diaSemana),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda', userId] })
      qc.invalidateQueries({ queryKey: ['treino-hoje', userId, hoje] })
      setModalAgenda(null)
      toast.success('Agendamento removido.')
    },
    onError: (e) => toast.error(e.message),
  })

  const meus      = templates.filter(t => !TreinoService.isPredefinido(t))
  const predefinidos = templates.filter(t => TreinoService.isPredefinido(t))
  const diaHoje = DIAS[new Date().getDay()]
  const treinoHoje = agenda.find(a => a.dia_semana === diaHoje) ?? null

  const predefinidaConcluida = (() => {
    if (!treinoHoje?.atividade_livre) return false
    const kw = TIPO_KEYWORD[treinoHoje.atividade_livre.tipo]
    if (!kw) return sessoesDoDia.length > 0
    return sessoesDoDia.some(s => (s.atividade_met?.nome ?? '').toLowerCase().includes(kw))
  })()

  const { mutateAsync: salvar, isPending: salvando } = useMutation({
    mutationFn: async ({ templateId, nome, exercicios }) => {
      const t = templateId
        ? await TreinoService.atualizarTemplate(templateId, nome)
        : await TreinoService.criarTemplate(userId, nome)
      await TreinoService.salvarExercicios(t.id, exercicios)
      return t
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates', userId] })
      setModal(null)
      toast.success(modal?.template ? 'Template atualizado!' : 'Template criado!')
    },
    onError: (e) => toast.error(e.message),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: (id) => TreinoService.deletarTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates', userId] })
      setConfirmDelete(null)
      toast.success('Template deletado.')
    },
    onError: (e) => toast.error(e.message),
  })

  async function abrirEditar(template) {
    if (TreinoService.isPredefinido(template)) {
      // Abre como leitura — future: opção de clonar
      const exercicios = await TreinoService.listarExercicios(template.id)
      setModal({ template, exercicios, readOnly: true })
      return
    }
    const exercicios = await TreinoService.listarExercicios(template.id)
    setModal({ template, exercicios, readOnly: false })
  }

  function abrirNovo() {
    setModal({ template: null, exercicios: [], readOnly: false })
  }

  async function handleSalvar(nome, exercicios) {
    await salvar({ templateId: modal?.template?.id, nome, exercicios })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>Treinos</h1>
      </header>

      <main style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {(predefinidaConcluida || treinoHoje?.descanso) ? (
          <div style={{
            width: '100%', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 16,
            padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: treinoHoje?.descanso ? 'rgba(71,85,105,0.2)' : 'rgba(34,197,94,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {treinoHoje?.descanso
                  ? <BedDouble size={18} color="var(--color-text-3)" aria-hidden />
                  : <Check size={18} color="#22C55E" aria-hidden />}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>SESSÃO DE TREINO</p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {treinoHoje?.descanso ? 'Hoje é dia de descanso' : (treinoHoje?.atividade_livre?.nome ?? 'Atividade concluída')}
                </p>
              </div>
            </div>
            {!treinoHoje?.descanso && (
              <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 700, flexShrink: 0 }}>Concluída</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (treinoHoje?.template_treino?.id) {
                navigate('/treinos/sessao', { state: { templateId: treinoHoje.template_treino.id, templateNome: treinoHoje.template_treino.nome } })
              } else if (treinoHoje?.atividade_livre) {
                navigate('/treinos/sessao', { state: { atividadeLivre: treinoHoje.atividade_livre } })
              } else {
                navigate('/treinos/sessao')
              }
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{
              width: '100%', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: 16,
              padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
              transition: 'transform var(--t-fast)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: treinoHoje?.descanso
                  ? 'rgba(71,85,105,0.2)'
                  : treinoHoje?.atividade_livre
                    ? 'rgba(8,145,178,0.16)'
                    : 'rgba(249,115,22,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {iconeDoTreino(treinoHoje)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>SESSÃO DE TREINO</p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tituloTreino(treinoHoje)}
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-3)" aria-hidden />
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/treinos/sessao')}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          style={{
            width: '100%', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 14,
            padding: '12px 16px', cursor: 'pointer',
            transition: 'transform var(--t-fast)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, color: 'var(--color-accent)',
            fontFamily: 'var(--font-heading)', minHeight: 46,
          }}
        >
          <PlayCircle size={16} aria-hidden /> Registrar outra atividade
        </button>

        {sessoesDoDia.length > 0 && (
          <section aria-label="Realizadas hoje" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>REALIZADAS HOJE</p>
            {sessoesDoDia.map(s => <CardSessaoConcluida key={s.id} sessao={s} />)}
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate('/treinos/historico')}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          style={{
            width: '100%', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 16,
            padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
            transition: 'transform var(--t-fast)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(71,85,105,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <History size={18} color="var(--color-text-2)" aria-hidden />
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>HISTÓRICO</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                Treinos anteriores
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--color-text-3)" aria-hidden />
        </button>

        <section aria-label="Configurações do treino" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            type="button"
            onClick={() => setConfigAberto(v => !v)}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              padding: '14px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'transform var(--t-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
            aria-expanded={configAberto}
            aria-label="Abrir configurações do treino"
          >
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>TREINOS</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                Configurações do treino
              </p>
            </div>
            <ChevronDown
              size={20}
              color="var(--color-text-3)"
              aria-hidden
              style={{ transform: configAberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--t-fast)' }}
            />
          </button>

          {configAberto && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section aria-label="Meus templates">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>MEUS TEMPLATES</p>
                  <button type="button" onClick={abrirNovo} aria-label="Criar novo template"
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--color-accent)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform var(--t-fast)',
                    }}>
                    <Plus size={18} color="#fff" aria-hidden />
                  </button>
                </div>
                {isLoading
                  ? <SkeletonLista />
                  : meus.length === 0
                    ? <EmptyState onCriar={abrirNovo} />
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {meus.map(t => (
                          <ItemTemplate key={t.id} template={t} predefinido={false}
                            onEditar={abrirEditar} onDeletar={setConfirmDelete} />
                        ))}
                      </div>
                }
              </section>

              {!isLoading && predefinidos.length > 0 && (
                <section aria-label="Templates predefinidos">
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 10 }}>PREDEFINIDOS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {predefinidos.map(t => (
                      <ItemTemplate key={t.id} template={t} predefinido={true}
                        onEditar={abrirEditar} onDeletar={() => {}} />
                    ))}
                  </div>
                </section>
              )}

              <ConfigProgressao userId={userId} />

              <section aria-label="Agenda semanal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAgendaAberta(v => !v)}
                  aria-expanded={agendaAberta}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
                  onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                  style={{
                    width: '100%', background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)', borderRadius: 16,
                    padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                    transition: 'transform var(--t-fast)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(8,145,178,0.16)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CalendarDays size={18} color="#0891B2" aria-hidden />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2 }}>AGENDA</p>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                        Agenda semanal
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18} color="var(--color-text-3)" aria-hidden
                    style={{ transform: agendaAberta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--t-fast)' }}
                  />
                </button>

                {agendaAberta && (
                  <AgendaSemanal
                    agenda={agenda}
                    loading={loadingAgenda}
                    onAbrirDia={(dia, item) => setModalAgenda({ dia, item })}
                  />
                )}
              </section>
            </div>
          )}
        </section>

      </main>

      {/* Modal criar/editar */}
      {modal && !modal.readOnly && (
        <ModalTemplate
          key={modal.template?.id ?? 'novo'}
          template={modal.template}
          exerciciosIniciais={modal.exercicios}
          onSalvar={handleSalvar}
          onFechar={() => setModal(null)}
          loading={salvando}
        />
      )}

      {/* Modal leitura (predefinido) */}
      {modal?.readOnly && (
        <>
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label={modal.template.nome}
            style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'var(--color-surface)', borderRadius: '20px 20px 0 0', maxHeight: '80dvh', display: 'flex', flexDirection: 'column', zIndex: 201, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 12px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>{modal.template.nome}</h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', background: 'var(--color-surface-2)', padding: '4px 10px', borderRadius: 20 }}>Predefinido</span>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modal.exercicios.map((ex, i) => (
                <div key={ex.id} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{i + 1}. {ex.nome}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                    {ex.series}×{ex.repeticoes} {ex.carga_inicial_kg ? `· ${ex.carga_inicial_kg}kg` : ''} {ex.tempo_descanso_segundos ? `· ${ex.tempo_descanso_segundos}s descanso` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal de agenda por dia */}
      {modalAgenda && (
        <ModalAgendaDia
          key={modalAgenda.dia.valor}
          dia={modalAgenda.dia}
          itemAtual={modalAgenda.item}
          templates={templates}
          salvando={agendando || limpando}
          onSalvar={(payload) =>
            agendarDia({ userId, diaSemana: modalAgenda.dia.valor, ...payload })
          }
          onLimpar={() => limparDia(modalAgenda.dia.valor)}
          onFechar={() => setModalAgenda(null)}
        />
      )}

      {/* Confirmação de delete */}
      {confirmDelete && (
        <>
          <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300 }} aria-hidden />
          <div role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão"
            style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'var(--color-surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 301, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Deletar template?</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 24 }}>
              "{confirmDelete.nome}" será removido permanentemente, incluindo todos os exercícios.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '13px', background: 'var(--color-surface-2)', border: 'none', borderRadius: 12, color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
                Cancelar
              </button>
              <button type="button" onClick={() => deletar(confirmDelete.id)} disabled={deletando}
                style={{ flex: 1, padding: '13px', background: '#EF4444', border: 'none', borderRadius: 12, color: '#fff', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
                {deletando ? 'Deletando…' : 'Deletar'}
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
