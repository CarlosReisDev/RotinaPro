import { Plus, Minus, X, Timer } from 'lucide-react'
import { useSessaoAtiva } from '../../hooks/useSessaoAtiva'

function formatar(s) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// Banner flutuante posicionado acima do BottomNav (65px).
// Visível em qualquer rota enquanto houver descanso ativo no contexto.
export default function CronometroDescanso() {
  const { ativo, exercicio, segundosRestantes, ajustarDescanso, cancelarDescanso } = useSessaoAtiva()
  if (!ativo) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(75px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        width: 'min(420px, calc(100vw - 24px))',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-accent)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        borderRadius: 16,
        padding: '12px 14px',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: 'rgba(249,115,22,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Timer size={18} color="var(--color-accent)" aria-hidden />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>DESCANSO</p>
        <p style={{
          fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
          color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {exercicio} · <span style={{ color: 'var(--color-accent)' }}>{formatar(segundosRestantes)}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => ajustarDescanso(-15)}
        aria-label="-15 segundos"
        style={{
          width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-border)',
          background: 'var(--color-bg)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-2)',
        }}
      >
        <Minus size={14} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => ajustarDescanso(15)}
        aria-label="+15 segundos"
        style={{
          width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-border)',
          background: 'var(--color-bg)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-2)',
        }}
      >
        <Plus size={14} aria-hidden />
      </button>
      <button
        type="button"
        onClick={cancelarDescanso}
        aria-label="Pular descanso"
        style={{
          width: 34, height: 34, borderRadius: 10, border: 'none',
          background: 'rgba(239,68,68,0.16)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#EF4444',
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
