import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, Dumbbell, Flame, Replace, RotateCcw, TrendingUp, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import Skeleton from '../ui/Skeleton'
import ModalConfirmacao from '../ui/ModalConfirmacao'
import TreinoService from '../../services/TreinoService'
import SessaoService from '../../services/SessaoService'
import { useSessaoAtiva } from '../../hooks/useSessaoAtiva'

function inicializarEstado(exercicios) {
  const map = {}
  for (const ex of exercicios) {
    map[ex.id] = {
      series: Array.from({ length: ex.series }, (_, i) => ({
        numero: i + 1,
        carga: ex.carga_inicial_kg != null ? String(ex.carga_inicial_kg) : '',
        reps: String(ex.repeticoes ?? ''),
        concluida: false,
        pulada: false,
      })),
      descansoSeg: ex.tempo_descanso_segundos ?? 60,
      substituido: false,
      nomeSubstituto: '',
      aberto: true,
    }
  }
  return map
}

// Decisões:
// - Sessão criada lazy: só insere sessao_treino quando usuário marca 1ª série como concluída.
//   Evita lixo no banco se o usuário abrir e sair.
// - Cargas/reps default vêm do template; usuário pode editar livremente.
// - FA1 (substituir): override local de nome, marca substituido=true ao salvar.
// - FA5 (ajustar descanso): override local, não toca no template.
// - Salvamento em batch ao concluir: reduz round-trips e mantém consistência relacional.
export default function SessaoMusculacao({ userId, templateId, templateNome, sessaoEmAndamento, onConcluido }) {
  const qc = useQueryClient()
  const { iniciarDescanso, cancelarDescanso, ativo: descansoAtivo } = useSessaoAtiva()

  const exerciciosQ = useQuery({
    queryKey: ['template-exercicios', templateId],
    queryFn: () => TreinoService.listarExercicios(templateId),
    enabled: !!templateId,
    staleTime: 1000 * 60 * 5,
  })

  // Sugestão de progressão por exercício (paralela)
  const sugestoesQ = useQueries({
    queries: (exerciciosQ.data ?? []).map(ex => ({
      queryKey: ['progressao', userId, templateId, ex.nome],
      queryFn: () => TreinoService.sugerirProgressao(userId, ex.nome, templateId),
      enabled: !!userId && !!templateId,
      staleTime: 1000 * 60 * 10,
    })),
  })

  const [estado, setEstado] = useState({})
  const [estadoInitId, setEstadoInitId] = useState(null) // Adjusting state when prop changes
  const [observacao, setObservacao] = useState('')
  const [sessaoId, setSessaoId] = useState(sessaoEmAndamento?.id ?? null)
  const [inicio, setInicio] = useState(
    sessaoEmAndamento?.criado_em ? new Date(sessaoEmAndamento.criado_em).getTime() : null,
  )
  const [resumoAberto, setResumoAberto] = useState(false)
  const [duracaoMinSnap, setDuracaoMinSnap] = useState(0)
  const [caloriasManual, setCaloriasManual] = useState('')
  const [confirmCancelar, setConfirmCancelar] = useState(false)

  // Inicialização derivada — quando exerciciosQ.data chega, monta o estado uma única vez
  if (exerciciosQ.data && estadoInitId !== templateId) {
    setEstadoInitId(templateId)
    setEstado(inicializarEstado(exerciciosQ.data))
  }

  const iniciarSessaoMut = useMutation({
    mutationFn: () => SessaoService.iniciarSessaoTemplate({ userId, templateId }),
    onSuccess: (sess) => {
      setSessaoId(sess.id)
      setInicio(new Date(sess.criado_em).getTime())
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const concluirMut = useMutation({
    mutationFn: async () => {
      const exerciciosRealizados = Object.entries(estado).reduce((acc, [exId, st]) => {
        const ex = exerciciosQ.data?.find(e => e.id === exId)
        if (!ex) return acc
        // Pulada não vira registro — só séries efetivamente feitas
        const seriesFeitas = st.series.filter(s => s.concluida && !s.pulada && s.reps !== '')
        if (seriesFeitas.length === 0) return acc
        acc.push({
          nome: st.substituido && st.nomeSubstituto.trim() ? st.nomeSubstituto.trim() : ex.nome,
          ordem: ex.ordem,
          substituido: st.substituido,
          series: seriesFeitas.map(s => ({
            numero_serie: s.numero,
            repeticoes: Number(s.reps),
            carga_kg: s.carga !== '' ? Number(s.carga) : null,
          })),
        })
        return acc
      }, [])

      return SessaoService.concluirSessaoMusculacao({
        sessaoId,
        duracaoMinutos: duracaoMinSnap || 1,
        observacao,
        caloriasManual,
        exerciciosRealizados,
      })
    },
    onSuccess: async () => {
      cancelarDescanso()
      await qc.refetchQueries({ queryKey: ['sessoes-hoje'] })
      qc.invalidateQueries({ queryKey: ['primeira-sessao-hoje'] })
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      qc.invalidateQueries({ queryKey: ['progressao'] })
      toast.success('Sessão concluída!')
      onConcluido?.()
    },
    onError: (e) => toast.error(e.message),
  })

  function abrirResumo() {
    const bruto = Math.round((Date.now() - (inicio ?? Date.now())) / 60000)
    const min = Math.min(720, Math.max(1, bruto))
    setDuracaoMinSnap(min)
    setResumoAberto(true)
  }

  const cancelarMut = useMutation({
    mutationFn: () => SessaoService.descartarSessao(sessaoId),
    onSuccess: () => {
      cancelarDescanso()
      qc.invalidateQueries({ queryKey: ['sessao-em-andamento', userId] })
      toast.success('Sessão cancelada.')
      onConcluido?.()
    },
    onError: (e) => toast.error(e.message),
  })

  function atualizarSerie(exId, idx, patch) {
    setEstado(prev => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        series: prev[exId].series.map((s, i) => i === idx ? { ...s, ...patch } : s),
      },
    }))
  }

  function alternarConcluida(exId, idx) {
    const ex = exerciciosQ.data?.find(e => e.id === exId)
    const stEx = estado[exId]
    const serie = stEx.series[idx]
    const novaConcluida = !serie.concluida

    // Limpa "pulada" se marcar concluída
    atualizarSerie(exId, idx, { concluida: novaConcluida, pulada: novaConcluida ? false : serie.pulada })

    if (novaConcluida) {
      // Cria sessão lazy na primeira série concluída
      if (!sessaoId && !iniciarSessaoMut.isPending) iniciarSessaoMut.mutate()
      const segundos = stEx.descansoSeg ?? ex?.tempo_descanso_segundos ?? 0
      const nomeExibido = stEx.substituido && stEx.nomeSubstituto.trim() ? stEx.nomeSubstituto.trim() : ex?.nome
      iniciarDescanso(nomeExibido, segundos)
    }
  }

  function alternarPulada(exId, idx) {
    const stEx = estado[exId]
    const serie = stEx.series[idx]
    const novaPulada = !serie.pulada
    // Pular não dispara descanso e exclui da progressão/registro
    atualizarSerie(exId, idx, { pulada: novaPulada, concluida: novaPulada ? false : serie.concluida })
  }

  function ajustarDescansoEx(exId, delta) {
    setEstado(prev => ({
      ...prev,
      [exId]: { ...prev[exId], descansoSeg: Math.max(0, (prev[exId].descansoSeg ?? 0) + delta) },
    }))
  }

  function alternarSubstituir(exId) {
    setEstado(prev => ({
      ...prev,
      [exId]: { ...prev[exId], substituido: !prev[exId].substituido },
    }))
  }

  function atualizarNomeSubstituto(exId, nome) {
    setEstado(prev => ({
      ...prev,
      [exId]: { ...prev[exId], nomeSubstituto: nome },
    }))
  }

  function alternarAberto(exId) {
    setEstado(prev => ({
      ...prev,
      [exId]: { ...prev[exId], aberto: !prev[exId].aberto },
    }))
  }

  const totaisResumo = useMemo(() => {
    let exDone = 0, totalSeries = 0, volumeKg = 0, totalPuladas = 0
    Object.values(estado).forEach(st => {
      const concluidas = st.series.filter(s => s.concluida && !s.pulada)
      const puladas = st.series.filter(s => s.pulada)
      if (concluidas.length > 0) exDone += 1
      totalSeries += concluidas.length
      totalPuladas += puladas.length
      concluidas.forEach(s => {
        const c = Number(s.carga) || 0
        const r = Number(s.reps) || 0
        volumeKg += c * r
      })
    })
    return { exDone, totalSeries, volumeKg, totalPuladas }
  }, [estado])

  if (exerciciosQ.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width="100%" height={120} radius={16} />
        <Skeleton width="100%" height={120} radius={16} />
        <Skeleton width="100%" height={120} radius={16} />
      </div>
    )
  }

  if (exerciciosQ.error) {
    return <p style={{ color: '#EF4444', fontSize: 14 }}>Erro ao carregar exercícios do template.</p>
  }

  if (!exerciciosQ.data?.length) {
    return (
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
        <Dumbbell size={32} color="var(--color-text-3)" aria-hidden style={{ margin: '0 auto 12px' }} />
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          Template sem exercícios
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          Adicione exercícios ao template antes de iniciar a sessão.
        </p>
      </div>
    )
  }

  if (resumoAberto) {
    return (
      <ResumoSessao
        templateNome={templateNome}
        estado={estado}
        exercicios={exerciciosQ.data}
        duracaoMin={duracaoMinSnap}
        setDuracaoMin={setDuracaoMinSnap}
        totaisResumo={totaisResumo}
        observacao={observacao}
        setObservacao={setObservacao}
        caloriasManual={caloriasManual}
        setCaloriasManual={setCaloriasManual}
        salvando={concluirMut.isPending}
        onVoltar={() => setResumoAberto(false)}
        onConfirmar={() => concluirMut.mutate()}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '14px 16px' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>TEMPLATE</p>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
          {templateNome}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>
          {totaisResumo.exDone} de {exerciciosQ.data.length} exercícios · {totaisResumo.totalSeries} séries feitas
        </p>
      </header>

      {exerciciosQ.data.map((ex, i) => {
        const sug = sugestoesQ[i]?.data
        const st = estado[ex.id]
        if (!st) return null
        return (
          <CardExercicio
            key={ex.id}
            exercicio={ex}
            estado={st}
            sugestao={sug}
            onAlternarAberto={() => alternarAberto(ex.id)}
            onAtualizarSerie={(idx, patch) => atualizarSerie(ex.id, idx, patch)}
            onAlternarConcluida={(idx) => alternarConcluida(ex.id, idx)}
            onAlternarPulada={(idx) => alternarPulada(ex.id, idx)}
            onAjustarDescanso={(delta) => ajustarDescansoEx(ex.id, delta)}
            onAlternarSubstituir={() => alternarSubstituir(ex.id)}
            onAtualizarNomeSub={(nome) => atualizarNomeSubstituto(ex.id, nome)}
          />
        )
      })}

      <button
        type="button"
        onClick={abrirResumo}
        disabled={totaisResumo.totalSeries === 0}
        style={{
          width: '100%', minHeight: 52, border: 'none', borderRadius: 14,
          background: totaisResumo.totalSeries === 0 ? 'var(--color-surface-2)' : 'var(--color-accent)',
          color: totaisResumo.totalSeries === 0 ? 'var(--color-text-3)' : '#fff',
          fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
          cursor: totaisResumo.totalSeries === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'transform var(--t-fast)',
        }}
      >
        <Check size={18} aria-hidden /> Concluir sessão
      </button>

      {sessaoId && (
        <button
          type="button"
          onClick={() => setConfirmCancelar(true)}
          disabled={cancelarMut.isPending}
          style={{
            width: '100%', minHeight: 46, borderRadius: 12,
            border: '1.5px dashed rgba(239,68,68,0.5)', background: 'transparent',
            color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
            cursor: cancelarMut.isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: descansoAtivo ? 70 : 0,
          }}
        >
          <X size={16} aria-hidden /> {cancelarMut.isPending ? 'Cancelando…' : 'Cancelar sessão'}
        </button>
      )}

      {confirmCancelar && (
        <ModalConfirmacao
          titulo="Cancelar sessão?"
          descricao="A sessão atual e todas as séries registradas serão descartadas. Esta ação não pode ser desfeita."
          confirmar="Cancelar sessão"
          salvando={cancelarMut.isPending}
          onConfirmar={() => { setConfirmCancelar(false); cancelarMut.mutate() }}
          onFechar={() => setConfirmCancelar(false)}
        />
      )}
    </div>
  )
}


function CardExercicio({ exercicio, estado, sugestao, onAlternarAberto, onAtualizarSerie, onAlternarConcluida, onAlternarPulada, onAjustarDescanso, onAlternarSubstituir, onAtualizarNomeSub }) {
  const concluidas = estado.series.filter(s => s.concluida && !s.pulada).length
  const puladas = estado.series.filter(s => s.pulada).length
  const total = estado.series.length
  const fechado = concluidas + puladas === total

  const sugCarga = sugestao?.sugerir && sugestao?.tipo_progressao === 'carga' ? sugestao.carga_sugerida_kg : null
  const sugReps = sugestao?.sugerir && sugestao?.tipo_progressao === 'repeticoes' ? sugestao.repeticoes_sugeridas : null

  return (
    <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onAlternarAberto}
        aria-expanded={estado.aberto}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: fechado && concluidas > 0 ? 'rgba(34,197,94,0.16)' :
                       fechado && puladas === total ? 'rgba(239,68,68,0.16)' : 'rgba(249,115,22,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {fechado && concluidas > 0
            ? <Check size={18} color="#22C55E" aria-hidden />
            : fechado && puladas === total
              ? <X size={18} color="#EF4444" aria-hidden />
              : <Dumbbell size={18} color="var(--color-accent)" aria-hidden />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {estado.substituido && estado.nomeSubstituto.trim() ? estado.nomeSubstituto.trim() : exercicio.nome}
            {estado.substituido && <span style={{ fontSize: 10, color: 'var(--color-accent)', marginLeft: 6 }}>(substituído)</span>}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
            {total}×{exercicio.repeticoes} · {concluidas} feita{concluidas !== 1 ? 's' : ''}{puladas > 0 ? ` · ${puladas} pulada${puladas !== 1 ? 's' : ''}` : ''} · {estado.descansoSeg}s descanso
          </p>
        </div>
        <ChevronDown
          size={18} color="var(--color-text-3)" aria-hidden
          style={{ transform: estado.aberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--t-fast)', flexShrink: 0 }}
        />
      </button>

      {estado.aberto && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sugestao?.sugerir && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.4)',
              borderRadius: 10, padding: '8px 10px',
            }}>
              <TrendingUp size={14} color="#22C55E" aria-hidden />
              <span style={{ fontSize: 12, color: 'var(--color-text)' }}>
                Sugestão: {sugCarga != null ? <>subir para <strong>{sugCarga}kg</strong></> : null}
                {sugReps != null ? <>subir para <strong>{sugReps} reps</strong></> : null}
                {!sugCarga && !sugReps ? 'progredir agora' : ''}
                {sugestao.carga_atual_kg != null && sugCarga != null ? (
                  <span style={{ color: 'var(--color-text-3)' }}> (atual {sugestao.carga_atual_kg}kg)</span>
                ) : null}
              </span>
            </div>
          )}
          {sugestao && !sugestao.sugerir && sugestao.carga_atual_kg != null && (
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={11} aria-hidden /> Manter carga atual ({sugestao.carga_atual_kg}kg).
            </div>
          )}

          {/* Header da grade de séries */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 76px', gap: 6, alignItems: 'center', fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>
            <span>#</span>
            <span>CARGA (KG)</span>
            <span>REPS</span>
            <span style={{ textAlign: 'center' }}>FEZ?</span>
          </div>

          {estado.series.map((s, i) => (
            <div key={s.numero} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 1fr 76px', gap: 6, alignItems: 'center',
              opacity: s.concluida || s.pulada ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{s.numero}</span>
              <SafeInput
                type="number"
                inputMode="decimal"
                min={0} max={1000} step={0.5}
                value={s.carga}
                onChange={(e) => onAtualizarSerie(i, { carga: e.target.value })}
                disabled={s.concluida || s.pulada}
                style={{
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '8px 10px', fontSize: 14,
                  color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
                  textDecoration: s.pulada ? 'line-through' : 'none',
                }}
              />
              <SafeInput
                type="number"
                inputMode="numeric"
                min={0} max={200}
                value={s.reps}
                onChange={(e) => onAtualizarSerie(i, { reps: e.target.value })}
                disabled={s.concluida || s.pulada}
                style={{
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '8px 10px', fontSize: 14,
                  color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
                  textDecoration: s.pulada ? 'line-through' : 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onAlternarConcluida(i)}
                  aria-label={s.concluida ? `Desmarcar série ${s.numero}` : `Concluir série ${s.numero}`}
                  style={{
                    flex: 1, height: 36, borderRadius: 8,
                    border: s.concluida ? 'none' : '1px solid var(--color-border)',
                    background: s.concluida ? '#22C55E' : 'var(--color-bg)',
                    color: s.concluida ? '#fff' : 'var(--color-text-3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onAlternarPulada(i)}
                  aria-label={s.pulada ? `Desmarcar série pulada ${s.numero}` : `Pular série ${s.numero}`}
                  style={{
                    flex: 1, height: 36, borderRadius: 8,
                    border: s.pulada ? 'none' : '1px solid var(--color-border)',
                    background: s.pulada ? '#EF4444' : 'var(--color-bg)',
                    color: s.pulada ? '#fff' : 'var(--color-text-3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            </div>
          ))}

          {/* Ajustar descanso (FA5) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, flex: 1 }}>
              DESCANSO ENTRE SÉRIES
            </span>
            <button type="button" onClick={() => onAjustarDescanso(-15)}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 700 }}>
              −15s
            </button>
            <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 700, minWidth: 44, textAlign: 'center' }}>
              {estado.descansoSeg}s
            </span>
            <button type="button" onClick={() => onAjustarDescanso(15)}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 700 }}>
              +15s
            </button>
          </div>

          {/* Substituir exercício (FA1) */}
          <div>
            <button
              type="button"
              onClick={onAlternarSubstituir}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: estado.substituido ? 'var(--color-accent)' : 'var(--color-text-3)',
                fontSize: 12, fontWeight: 600, padding: '4px 0',
              }}
            >
              <Replace size={12} aria-hidden /> {estado.substituido ? 'Cancelar substituição' : 'Substituir exercício'}
            </button>
            {estado.substituido && (
              <SafeInput
                type="text"
                maxLength={100}
                placeholder="Nome do exercício substituto"
                value={estado.nomeSubstituto}
                onChange={(e) => onAtualizarNomeSub(e.target.value)}
                style={{
                  marginTop: 6, width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '8px 10px', fontSize: 14,
                  color: 'var(--color-text)', outline: 'none',
                }}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function ResumoSessao({ templateNome, estado, exercicios, duracaoMin, setDuracaoMin, totaisResumo, observacao, setObservacao, caloriasManual, setCaloriasManual, salvando, onVoltar, onConfirmar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '14px 16px' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>RESUMO DA SESSÃO</p>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
          {templateNome}
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--color-text-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <SafeInput
              type="number"
              min={1}
              max={720}
              value={duracaoMin}
              onChange={e => setDuracaoMin(Math.max(1, Math.min(720, Number(e.target.value) || 1)))}
              style={{
                width: 64, background: 'var(--color-bg)',
                border: '1px solid var(--color-border)', borderRadius: 8,
                padding: '4px 8px', fontSize: 13, color: 'var(--color-text)', outline: 'none',
              }}
            />
            <span>min</span>
          </label>
          <span>{totaisResumo.exDone} exercícios</span>
          <span>{totaisResumo.totalSeries} séries</span>
          <span>{Math.round(totaisResumo.volumeKg)} kg volume</span>
        </div>
      </header>

      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {exercicios.map(ex => {
          const st = estado[ex.id]
          if (!st) return null
          const feitas = st.series.filter(s => s.concluida && !s.pulada)
          if (feitas.length === 0) return null
          const nomeFinal = st.substituido && st.nomeSubstituto.trim() ? st.nomeSubstituto.trim() : ex.nome
          return (
            <div key={ex.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                {nomeFinal} {st.substituido && <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>(sub)</span>}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                {feitas.map(s => `${s.carga || '–'}kg × ${s.reps}`).join(' · ')}
              </p>
            </div>
          )
        })}
      </section>

      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="kcal-musc" style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
          <Flame size={12} aria-hidden style={{ display: 'inline', marginRight: 4 }} />
          CALORIAS DO DISPOSITIVO (OPCIONAL)
        </label>
        <SafeInput
          id="kcal-musc"
          type="number"
          min={0} max={5000}
          value={caloriasManual}
          onChange={e => setCaloriasManual(e.target.value)}
          placeholder="Ex.: 320"
          style={{
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 12px', fontSize: 15,
            color: 'var(--color-text)', outline: 'none',
          }}
        />

        <label htmlFor="obs-musc" style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
          OBSERVAÇÃO
        </label>
        <SafeInput
          id="obs-musc"
          type="text"
          maxLength={500}
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Notas da sessão (opcional)"
          style={{
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 12px', fontSize: 15,
            color: 'var(--color-text)', outline: 'none',
          }}
        />
      </section>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onVoltar}
          disabled={salvando}
          style={{
            flex: 1, minHeight: 50, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            borderRadius: 14, fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600,
            cursor: salvando ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={14} aria-hidden style={{ transform: 'rotate(180deg)', display: 'inline', marginRight: 4 }} />
          Voltar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={salvando}
          style={{
            flex: 2, minHeight: 50, border: 'none',
            background: 'var(--color-accent)', color: '#fff',
            borderRadius: 14, fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
            cursor: salvando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: salvando ? 0.7 : 1,
          }}
        >
          <Save size={16} aria-hidden /> {salvando ? 'Salvando...' : 'Salvar e finalizar'}
        </button>
      </div>
    </div>
  )
}
