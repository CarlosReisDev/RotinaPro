import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, ChevronRight } from 'lucide-react'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import ModalFatura from '../components/financas/ModalFatura'
import CartaoService from '../services/CartaoService'
import { useAuth } from '../contexts/AuthContext'

const NAV_H = 65

export default function FaturasPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session?.user?.id
  const [cartaoSel, setCartaoSel] = useState(null)

  const { data: cartoes = [], isLoading } = useQuery({
    queryKey: ['cartoes', userId],
    queryFn: () => CartaoService.listar(userId, { apenasAtivos: true }),
    enabled: !!userId,
  })

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px' }}>
        <button
          type="button"
          onClick={() => navigate('/financas')}
          aria-label="Voltar"
          style={{
            width: 40, height: 40, borderRadius: 12, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Faturas</h1>
      </header>

      <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>
          CARTÕES ATIVOS
        </p>

        {isLoading && (
          <>
            <Skeleton width="100%" height={62} radius={14} />
            <Skeleton width="100%" height={62} radius={14} />
          </>
        )}

        {!isLoading && cartoes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-3)' }}>
            <CreditCard size={36} aria-hidden style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Nenhum cartão cadastrado.<br />
              Cadastre em Configurações financeiras.
            </p>
          </div>
        )}

        {!isLoading && cartoes.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCartaoSel(c)}
            aria-label={`Ver fatura de ${c.nome}`}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
              textAlign: 'left', minHeight: 60, fontFamily: 'var(--font-body)',
              color: 'var(--color-text)',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CreditCard size={20} aria-hidden />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                {c.nome}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                Vencimento dia {c.dia_vencimento}
              </p>
            </div>
            <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
          </button>
        ))}
      </section>

      <BottomNav />

      {cartaoSel && (
        <ModalFatura cartao={cartaoSel} onFechar={() => setCartaoSel(null)} />
      )}
    </div>
  )
}
