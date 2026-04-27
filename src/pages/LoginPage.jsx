import { Dumbbell, ShieldAlert } from 'lucide-react'
import AuthClient from '../api/auth'
import toast from 'react-hot-toast'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const acessoNegado = useMemo(() => searchParams.get('erro') === 'acesso_negado', [searchParams])

  async function handleLogin() {
    setLoading(true)
    try {
      await AuthClient.loginComGoogle()
    } catch {
      toast.error('Erro ao entrar com Google. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'max(48px, env(safe-area-inset-top, 48px)) 24px max(32px, env(safe-area-inset-bottom, 32px))',
    }}>

      {/* Logo + título */}
      <div />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 320 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 32px rgba(249,115,22,0.35)',
        }}>
          <Dumbbell size={36} color="#fff" strokeWidth={2} aria-hidden />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 40,
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.5px',
            marginBottom: 8,
          }}>
            Treino & Vida
          </h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: 15, lineHeight: 1.5 }}>
            Treinos, dieta e finanças.<br />Tudo no mesmo lugar.
          </p>
        </div>

        {acessoNegado && (
          <div
            role="alert"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: 'rgba(239, 68, 68, 0.10)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              color: '#FCA5A5',
              fontSize: 13,
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            <ShieldAlert size={18} color="#EF4444" strokeWidth={2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong style={{ color: '#FECACA', fontWeight: 600 }}>Acesso não autorizado.</strong>{' '}
              Esta conta não está liberada. Entre em contato para solicitar acesso.
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleLogin}
          disabled={loading}
          aria-label="Entrar com Google"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: loading ? '#1a1a1a' : '#fff',
            color: '#1a1a1a',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 16,
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'transform var(--t-base), opacity var(--t-base)',
            opacity: loading ? 0.6 : 1,
            minHeight: 52,
          }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {loading ? (
            <span style={{
              width: 20, height: 20,
              border: '2px solid #ccc',
              borderTop: '2px solid #1a1a1a',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }} />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Entrando…' : 'Entrar com Google'}
        </button>

        <p style={{ color: 'var(--color-text-3)', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
          Acesso restrito. Apenas contas autorizadas.
        </p>
      </div>

      <div style={{ color: 'var(--color-text-3)', fontSize: 12 }}>
        Treino & Vida © {new Date().getFullYear()}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
