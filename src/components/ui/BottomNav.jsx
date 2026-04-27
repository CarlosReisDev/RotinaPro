import { useLocation, useNavigate } from 'react-router-dom'
import { House, Dumbbell, Apple, Wallet, User } from 'lucide-react'

const TABS = [
  { path: '/',        label: 'Início',   Icon: House },
  { path: '/treinos', label: 'Treinos',  Icon: Dumbbell },
  { path: '/dieta',   label: 'Dieta',    Icon: Apple },
  { path: '/financas',label: 'Finanças', Icon: Wallet },
  { path: '/perfil',  label: 'Perfil',   Icon: User },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const ativo = pathname === path
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={ativo ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 4px',
              minHeight: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: ativo ? 'var(--color-accent)' : 'var(--color-text-3)',
              transition: 'color var(--t-fast)',
            }}
            onMouseDown={e => { e.currentTarget.style.opacity = '0.7' }}
            onMouseUp={e => { e.currentTarget.style.opacity = '1' }}
            onTouchStart={e => { e.currentTarget.style.opacity = '0.7' }}
            onTouchEnd={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Icon size={22} strokeWidth={ativo ? 2.5 : 1.8} aria-hidden />
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-body)',
              fontWeight: ativo ? 600 : 400,
              letterSpacing: 0.3,
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
