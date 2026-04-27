import { ArrowLeft, HardHat } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/ui/BottomNav'

const NAV_H = 65

export default function PerfilPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Perfil</h1>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 120px)', gap: 16, padding: '0 24px' }}>
        <HardHat size={48} color="var(--color-text-3)" aria-hidden />
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--color-text-2)', textAlign: 'center' }}>
          Em construção
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', textAlign: 'center', lineHeight: 1.5 }}>
          O módulo de perfil está sendo desenvolvido.
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
