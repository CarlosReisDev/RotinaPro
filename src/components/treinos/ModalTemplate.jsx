import { useState } from 'react'
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import SafeInput from '../ui/SafeInput'

const EXERCICIO_VAZIO = {
  nome: '', series: 3, repeticoes: 12, carga_inicial_kg: '', tempo_descanso_segundos: 60,
}

function InputField({ label, id, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</label>
      <SafeInput id={id} {...props}
        onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
        style={{
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 10, padding: '10px 12px', fontSize: 15,
          color: 'var(--color-text)', fontFamily: 'var(--font-body)',
          outline: 'none', transition: 'border-color var(--t-fast)',
          width: '100%', ...props.style,
        }}
      />
    </div>
  )
}

function ItemExercicio({ ex, idx, total, onChange, onRemove, onMover }) {
  const base = `ex-${idx}`
  return (
    <div style={{
      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
      borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header do exercício */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button type="button" onClick={() => onMover(idx, -1)} disabled={idx === 0}
            aria-label="Mover para cima"
            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, color: idx === 0 ? 'var(--color-text-3)' : 'var(--color-text-2)' }}>
            <ChevronUp size={14} aria-hidden />
          </button>
          <button type="button" onClick={() => onMover(idx, 1)} disabled={idx === total - 1}
            aria-label="Mover para baixo"
            style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', padding: 2, color: idx === total - 1 ? 'var(--color-text-3)' : 'var(--color-text-2)' }}>
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--color-text-3)', minWidth: 20 }}>
          {idx + 1}.
        </span>
        <div style={{ flex: 1 }}>
          <InputField label="Nome do exercício" id={`${base}-nome`} type="text"
            placeholder="Ex: Supino reto" value={ex.nome} maxLength={80}
            onChange={e => onChange(idx, 'nome', e.target.value)} />
        </div>
        <button type="button" onClick={() => onRemove(idx)} aria-label="Remover exercício"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      {/* Campos numéricos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <InputField label="Séries" id={`${base}-series`} type="number" inputMode="numeric"
          value={ex.series} min={1} max={20}
          onChange={e => onChange(idx, 'series', e.target.value)}
          style={{ textAlign: 'center' }} />
        <InputField label="Reps" id={`${base}-reps`} type="number" inputMode="numeric"
          value={ex.repeticoes} min={1} max={200}
          onChange={e => onChange(idx, 'repeticoes', e.target.value)}
          style={{ textAlign: 'center' }} />
        <InputField label="Carga (kg)" id={`${base}-carga`} type="number" inputMode="decimal"
          value={ex.carga_inicial_kg} placeholder="—" min={0} max={1000}
          onChange={e => onChange(idx, 'carga_inicial_kg', e.target.value)}
          style={{ textAlign: 'center' }} />
        <InputField label="Desc (s)" id={`${base}-desc`} type="number" inputMode="numeric"
          value={ex.tempo_descanso_segundos} placeholder="60" min={0} max={3600}
          onChange={e => onChange(idx, 'tempo_descanso_segundos', e.target.value)}
          style={{ textAlign: 'center' }} />
      </div>
    </div>
  )
}

// Reset da edição deve ocorrer via remontagem (key prop no pai), não via effect
// sincronizando props → state. Ver TreinosPage: <ModalTemplate key={...} />.
export default function ModalTemplate({ template, exerciciosIniciais = [], onSalvar, onFechar, loading }) {
  const [nome, setNome] = useState(template?.nome ?? '')
  const [exercicios, setExercicios] = useState(exerciciosIniciais)

  function adicionarExercicio() {
    setExercicios(prev => [...prev, { ...EXERCICIO_VAZIO }])
  }

  function alterarExercicio(idx, campo, valor) {
    setExercicios(prev => prev.map((ex, i) => i === idx ? { ...ex, [campo]: valor } : ex))
  }

  function removerExercicio(idx) {
    setExercicios(prev => prev.filter((_, i) => i !== idx))
  }

  function moverExercicio(idx, dir) {
    setExercicios(prev => {
      const arr = [...prev]
      const novo = idx + dir
      if (novo < 0 || novo >= arr.length) return arr;
      [arr[idx], arr[novo]] = [arr[novo], arr[idx]]
      return arr
    })
  }

  const valido = nome.trim().length >= 2

  return (
    <>
      {/* Backdrop */}
      <div onClick={onFechar} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} aria-hidden />

      {/* Sheet */}
      <div role="dialog" aria-modal="true" aria-label={template ? 'Editar template' : 'Novo template'}
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
          maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
          zIndex: 201,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>
            {template ? 'Editar template' : 'Novo template'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nome */}
          <InputField label="Nome do template" id="template-nome" type="text"
            placeholder="Ex: Treino A — Peito e Tríceps" maxLength={60}
            value={nome} onChange={e => setNome(e.target.value)}
            style={{ fontSize: 16, padding: '13px 14px' }} />

          {/* Exercícios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
                EXERCÍCIOS {exercicios.length > 0 && `(${exercicios.length})`}
              </span>
            </div>

            {exercicios.length === 0 && (
              <p style={{ fontSize: 14, color: 'var(--color-text-3)', textAlign: 'center', padding: '20px 0' }}>
                Nenhum exercício adicionado ainda.
              </p>
            )}

            {exercicios.map((ex, idx) => (
              <ItemExercicio key={idx} ex={ex} idx={idx} total={exercicios.length}
                onChange={alterarExercicio} onRemove={removerExercicio} onMover={moverExercicio} />
            ))}

            <button type="button" onClick={adicionarExercicio}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'none', border: '1.5px dashed var(--color-border)',
                borderRadius: 14, padding: '13px 16px', cursor: 'pointer',
                color: 'var(--color-text-2)', fontFamily: 'var(--font-body)', fontSize: 14,
                transition: 'border-color var(--t-fast), color var(--t-fast)',
                minHeight: 48,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-2)' }}
            >
              <Plus size={16} aria-hidden /> Adicionar exercício
            </button>
          </div>

          <div style={{ height: 8 }} />
        </div>

        {/* Rodapé */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={() => onSalvar(nome.trim(), exercicios)}
            disabled={!valido || loading}
            style={{
              width: '100%', padding: '15px 20px',
              background: !valido || loading ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color: !valido || loading ? 'var(--color-text-3)' : '#fff',
              border: 'none', borderRadius: 14,
              fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
              cursor: !valido || loading ? 'not-allowed' : 'pointer',
              transition: 'all var(--t-base)', minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading
              ? <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : template ? 'Salvar alterações' : 'Criar template'
            }
          </button>
        </div>
      </div>
    </>
  )
}
