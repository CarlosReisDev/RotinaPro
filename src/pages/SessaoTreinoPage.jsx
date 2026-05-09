import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowLeft, Bike, Check, ChevronRight, Clock3, Dumbbell, Flame, Lock, PlayCircle, Waves } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import SafeInput from '../components/ui/SafeInput'
import SessaoMusculacao from '../components/treinos/SessaoMusculacao'
import { useAuth } from '../contexts/AuthContext'
import SessaoService from '../services/SessaoService'
import TreinoService from '../services/TreinoService'

const NAV_H = 65
const DURACOES_RAPIDAS = [20, 30, 45, 60, 90]

const TIPO_KEYWORD = {
  natacao: 'nat', corrida: 'corr', caminhada: 'caminh',
  ciclismo: 'cicl', funcional: 'funcional',
}

function encontrarMetPorTipo(atividades, tipo) {
  const kw = TIPO_KEYWORD[tipo]
  if (!kw) return atividades[0] ?? null
  return atividades.find(a => a.nome.toLowerCase().includes(kw)) ?? atividades[0] ?? null
}

function BotaoPrimario({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.98)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{
        width: '100%',
        minHeight: 50,
        border: 'none',
        borderRadius: 14,
        background: disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
        color: disabled ? 'var(--color-text-3)' : '#fff',
        fontFamily: 'var(--font-heading)',
        fontSize: 16,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform var(--t-fast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {children}
    </button>
  )
}

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
  if (n.includes('nat')) return <Waves size={18} color={cor} aria-hidden />
  if (n.includes('cicl')) return <Bike size={18} color={cor} aria-hidden />
  if (n.includes('muscula') || n.includes('funcional') || n.includes('cross')) return <Dumbbell size={18} color={cor} aria-hidden />
  return <Activity size={18} color={cor} aria-hidden />
}

function Header({ subtitulo, onVoltar }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
      <button
        type="button"
        onClick={onVoltar}
        aria-label="Voltar"
        style={{
          width: 40, height: 40, borderRadius: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} aria-hidden />
      </button>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>
          Sessão de Treino
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{subtitulo}</p>
      </div>
    </header>
  )
}

// ─── FA3: escolha entre template ou atividade livre ─────────────
function EscolhaTreino({ userId, onEscolherTemplate, onEscolherLivre, sessaoEmAndamento, onDescartarSessao, descartando }) {
  const templatesQ = useQuery({
    queryKey: ['templates', userId],
    queryFn: () => TreinoService.listarTemplates(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const meus = (templatesQ.data ?? []).filter(t => !TreinoService.isPredefinido(t))
  const predefs = (templatesQ.data ?? []).filter(t => TreinoService.isPredefinido(t))
  // FE1: mostra predefinidos quando o usuário não tem nenhum próprio
  const lista = meus.length > 0 ? meus : predefs
  const semNada = !templatesQ.isLoading && lista.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sessaoEmAndamento && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>SESSÃO EM ANDAMENTO</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
            Há uma sessão antiga não concluída ({sessaoEmAndamento.template_treino?.nome ?? sessaoEmAndamento.atividade_met?.nome ?? 'sem nome'}). Descarte-a para continuar.
          </p>
          <button
            type="button"
            onClick={onDescartarSessao}
            disabled={descartando}
            style={{
              minHeight: 40, border: 'none', borderRadius: 10,
              background: '#EF4444', color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              cursor: descartando ? 'not-allowed' : 'pointer',
            }}
          >
            {descartando ? 'Descartando...' : 'Descartar sessão em andamento'}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onEscolherLivre}
        style={{
          width: '100%', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 16,
          padding: '16px', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(8,145,178,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={20} color="#0891B2" aria-hidden />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Atividade livre</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>Corrida, natação, ciclismo, funcional…</p>
        </div>
        <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
      </button>

      <section>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 10 }}>
          {meus.length > 0 ? 'MEUS TEMPLATES' : 'TEMPLATES PREDEFINIDOS'}
        </p>

        {templatesQ.isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton width="100%" height={68} radius={16} />
            <Skeleton width="100%" height={68} radius={16} />
          </div>
        )}

        {semNada && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <Dumbbell size={28} color="var(--color-text-3)" aria-hidden style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>Nenhum template disponível.</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>Crie um template em Treinos → Configurações.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map(t => {
            const ehPredef = TreinoService.isPredefinido(t)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onEscolherTemplate(t.id, t.nome)}
                style={{
                  width: '100%', background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)', borderRadius: 16,
                  padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: ehPredef ? 'rgba(71,85,105,0.2)' : 'rgba(249,115,22,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {ehPredef ? <Lock size={18} color="var(--color-text-3)" aria-hidden /> : <Dumbbell size={18} color="var(--color-accent)" aria-hidden />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t.nome}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                    {(t.exercicio_template?.[0]?.count ?? 0)} exercício(s) {ehPredef ? '· Predefinido' : ''}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function SessaoTreinoPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const templateIdState = location.state?.templateId ?? null
  const templateNomeState = location.state?.templateNome ?? null
  const agendaAtividade = location.state?.atividadeLivre ?? null
  const iniciarLivreState = location.state?.iniciarLivre === true

  const sessao = useQuery({
    queryKey: ['sessao-em-andamento', userId],
    queryFn: () => SessaoService.obterSessaoEmAndamento(userId),
    enabled: !!userId,
    staleTime: 1000 * 15,
  })

  const sessaoAtual = sessao.data
  const intencaoExplicita = !!templateIdState || !!agendaAtividade || iniciarLivreState

  const descartarSessao = useMutation({
    mutationFn: (sessaoId) => SessaoService.descartarSessao(sessaoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
      toast.success('Sessão descartada.')
    },
    onError: (error) => toast.error(error.message),
  })

  // ─── Modo: MUSCULAÇÃO ──────────────────────────────────────
  // Só entra aqui quando o usuário pediu um template OU quando há sessão de musculação
  // em andamento e nenhuma intenção explícita conflitante.
  const continuaMusculacao = !intencaoExplicita && !!sessaoAtual?.template_treino_id
  const sessaoBateComTemplate = !!sessaoAtual?.template_treino_id
    && !!templateIdState
    && sessaoAtual.template_treino_id === templateIdState

  if (!sessao.isLoading && (templateIdState || continuaMusculacao)) {
    const tplId = templateIdState ?? sessaoAtual?.template_treino_id
    const tplNome = (sessaoBateComTemplate || continuaMusculacao
      ? sessaoAtual?.template_treino?.nome
      : null) ?? templateNomeState ?? 'Template'
    const sessaoParaRetomar = sessaoBateComTemplate || continuaMusculacao ? sessaoAtual : null

    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
        <Header subtitulo={tplNome} onVoltar={() => navigate('/treinos')} />
        <main style={{ padding: '0 16px' }}>
          <SessaoMusculacao
            userId={userId}
            templateId={tplId}
            templateNome={tplNome}
            sessaoEmAndamento={sessaoParaRetomar}
            onConcluido={() => navigate('/treinos')}
          />
        </main>
        <BottomNav />
      </div>
    )
  }

  // ─── Modo: ATIVIDADE LIVRE ────────────────────────────────
  // Entra quando o usuário pediu atividade livre (botão "outra atividade" ou agenda do dia)
  // ou quando há sessão de atividade livre em andamento sem intenção contrária.
  const continuaLivre = !intencaoExplicita && !!sessaoAtual?.atividade_met_id
  if (!sessao.isLoading && (iniciarLivreState || agendaAtividade || continuaLivre)) {
    const sessaoParaLivre = continuaLivre ? sessaoAtual : null
    return <FormAtividadeLivre userId={userId} agendaAtividade={agendaAtividade} navigate={navigate} qc={qc} sessaoData={sessaoParaLivre} sessaoLoading={sessao.isLoading} />
  }

  // ─── Modo: ESCOLHA (FA3) ───────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <Header subtitulo="Escolha o tipo de treino" onVoltar={() => navigate('/treinos')} />
      <main style={{ padding: '0 16px' }}>
        <EscolhaTreino
          userId={userId}
          sessaoEmAndamento={sessaoAtual ?? null}
          onDescartarSessao={() => sessaoAtual && descartarSessao.mutate(sessaoAtual.id)}
          descartando={descartarSessao.isPending}
          onEscolherTemplate={(id, nome) => navigate('/treinos/sessao', { state: { templateId: id, templateNome: nome }, replace: true })}
          onEscolherLivre={() => navigate('/treinos/sessao', { state: { iniciarLivre: true }, replace: true })}
        />
      </main>
      <BottomNav />
    </div>
  )
}

// ─── Form atividade livre (lógica preservada do fluxo anterior) ──
function FormAtividadeLivre({ userId, agendaAtividade, navigate, qc, sessaoData, sessaoLoading }) {
  const [atividadeId, setAtividadeId] = useState('')
  const [intensidade, setIntensidade] = useState('moderado')
  const [duracaoMin, setDuracaoMin] = useState('45')
  const [observacao, setObservacao] = useState('')
  const [caloriasManual, setCaloriasManual] = useState('')

  const atividades = useQuery({
    queryKey: ['atividades-met-livres'],
    queryFn: () => SessaoService.listarAtividadesMet(),
    staleTime: 1000 * 60 * 10,
  })

  const atividadePredefinida = agendaAtividade && atividades.data?.length
    ? encontrarMetPorTipo(atividades.data, agendaAtividade.tipo)
    : null

  const atividadeIdEfetivo = atividadeId
    || atividadePredefinida?.id
    || atividades.data?.[0]?.id
    || ''

  const iniciar = useMutation({
    mutationFn: () => SessaoService.iniciarAtividadeLivre({
      userId,
      atividadeMetId: atividadeIdEfetivo,
      duracaoMinutos: duracaoMin,
      observacao,
      intensidade,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
      toast.success('Sessão iniciada!')
    },
    onError: (error) => toast.error(error.message),
  })

  const concluir = useMutation({
    mutationFn: (sessaoId) => SessaoService.concluirSessao({ sessaoId, caloriasManual }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['sessoes-hoje'] })
      qc.invalidateQueries({ queryKey: ['primeira-sessao-hoje'] })
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Sessão concluída!')
      navigate('/treinos')
    },
    onError: (error) => toast.error(error.message),
  })

  const carregando = atividades.isLoading || sessaoLoading
  const sessaoAtual = sessaoData
  const atividadeSelecionada = (atividades.data ?? []).find(a => a.id === atividadeIdEfetivo) ?? null
  const corSelecionada = corAtividade(atividadeSelecionada?.nome)
  const duracaoNumerica = Number(duracaoMin)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <Header subtitulo={agendaAtividade?.nome ?? 'Atividade livre'} onVoltar={() => navigate('/treinos')} />

      <main style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {carregando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton width="100%" height={110} radius={16} />
            <Skeleton width="100%" height={170} radius={16} />
          </div>
        )}

        {!carregando && sessaoAtual && (
          <>
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>SESSÃO EM ANDAMENTO</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                {sessaoAtual.atividade_met?.nome ?? 'Atividade livre'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)' }}>
                  <Clock3 size={14} aria-hidden /> {sessaoAtual.duracao_minutos} min
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)' }}>
                  <Flame size={14} aria-hidden /> {Math.round(Number(sessaoAtual.calorias_gastas_estimadas ?? 0))} kcal estimadas
                </span>
              </div>
            </section>

            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label htmlFor="kcal-manual" style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>
                Calorias medidas no dispositivo (opcional)
              </label>
              <SafeInput
                id="kcal-manual"
                type="number"
                min={0}
                max={5000}
                value={caloriasManual}
                onChange={e => setCaloriasManual(e.target.value)}
                placeholder="Ex.: 410"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  minHeight: 44,
                  padding: '10px 12px',
                  fontSize: 15,
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              <BotaoPrimario
                disabled={concluir.isPending}
                onClick={() => concluir.mutate(sessaoAtual.id)}
              >
                <Check size={18} aria-hidden /> {concluir.isPending ? 'Concluindo...' : 'Concluir sessão'}
              </BotaoPrimario>
            </section>
          </>
        )}

        {!carregando && !sessaoAtual && (
          <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>NOVA ATIVIDADE LIVRE</p>

            {atividadePredefinida ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: `${corSelecionada}12`,
                border: `1.5px solid ${corSelecionada}40`,
                borderRadius: 14, padding: '12px 14px',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${corSelecionada}24`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconeAtividade nome={atividadePredefinida.nome} cor={corSelecionada} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>ATIVIDADE DE HOJE</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                    {agendaAtividade.nome}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>Atividade</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {(atividades.data ?? []).map(a => {
                    const ativa = atividadeIdEfetivo === a.id
                    const cor = corAtividade(a.nome)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAtividadeId(a.id)}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
                        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                        style={{
                          minHeight: 52,
                          background: ativa ? `${cor}1A` : 'var(--color-bg)',
                          border: `1.5px solid ${ativa ? cor : 'var(--color-border)'}`,
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'transform var(--t-fast)',
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', textAlign: 'left',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: ativa ? `${cor}24` : 'var(--color-surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <IconeAtividade nome={a.nome} cor={cor} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.nome}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>Intensidade</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { valor: 'leve',     label: 'Leve',     cor: '#3B82F6', descricao: 'Baixo esforço'  },
                  { valor: 'moderado', label: 'Moderada', cor: 'var(--color-accent)', descricao: 'Ritmo confortável' },
                  { valor: 'intenso',  label: 'Intensa',  cor: '#EF4444', descricao: 'Alto esforço'   },
                ].map(({ valor, label, cor, descricao }) => {
                  const ativa = intensidade === valor
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setIntensidade(valor)}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
                      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                      style={{
                        minHeight: 64,
                        background: ativa ? `${cor}18` : 'var(--color-bg)',
                        border: `1.5px solid ${ativa ? cor : 'var(--color-border)'}`,
                        borderRadius: 12, cursor: 'pointer',
                        transition: 'transform var(--t-fast)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '8px 6px',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: ativa ? cor : 'var(--color-text)' }}>{label}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-3)', textAlign: 'center' }}>{descricao}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="duracao" style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>Duração (minutos)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURACOES_RAPIDAS.map(min => {
                  const ativa = duracaoNumerica === min
                  return (
                    <button key={min} type="button" onClick={() => setDuracaoMin(String(min))}
                      style={{
                        border: `1px solid ${ativa ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: ativa ? 'rgba(249,115,22,0.12)' : 'var(--color-bg)',
                        color: ativa ? 'var(--color-accent)' : 'var(--color-text-2)',
                        borderRadius: 999, padding: '6px 10px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 32,
                      }}
                    >
                      {min} min
                    </button>
                  )
                })}
              </div>
              <SafeInput
                id="duracao"
                type="number"
                min={5}
                max={720}
                value={duracaoMin}
                onChange={e => setDuracaoMin(e.target.value)}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12, minHeight: 44,
                  padding: '10px 12px', fontSize: 15,
                  color: 'var(--color-text)', outline: 'none',
                }}
              />
            </div>

            {!atividadePredefinida && (
              <div style={{
                border: '1px dashed var(--color-border)', borderRadius: 12,
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--color-bg)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${corSelecionada}1A`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconeAtividade nome={atividadeSelecionada?.nome} cor={corSelecionada} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Resumo rápido</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {atividadeSelecionada?.nome ?? 'Atividade'} · {duracaoNumerica > 0 ? `${duracaoNumerica} min` : '--'}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="observacao" style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>Observação (opcional)</label>
              <SafeInput
                id="observacao"
                type="text"
                maxLength={500}
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex.: corrida leve ao ar livre"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12, minHeight: 44,
                  padding: '10px 12px', fontSize: 15,
                  color: 'var(--color-text)', outline: 'none',
                }}
              />
            </div>

            <BotaoPrimario
              disabled={iniciar.isPending || !atividadeIdEfetivo || !duracaoNumerica || duracaoNumerica < 5}
              onClick={() => iniciar.mutate()}
            >
              <PlayCircle size={18} aria-hidden /> {iniciar.isPending ? 'Iniciando...' : 'Iniciar sessão'}
            </BotaoPrimario>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
