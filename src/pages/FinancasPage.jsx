import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import CardTransacao from '../components/financas/CardTransacao'
import CardResumoMes from '../components/financas/CardResumoMes'
import SecaoConfiguracoes from '../components/financas/SecaoConfiguracoes'
import ModalTransacao from '../components/financas/ModalTransacao'
import ModalDetalheTransacao from '../components/financas/ModalDetalheTransacao'
import TransacaoService from '../services/TransacaoService'
import { useAuth } from '../contexts/AuthContext'

const NAV_H = 65
const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function anoMesAtual() {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function formatarAnoMes({ ano, mes }) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

function navegar({ ano, mes }, dir) {
  const novo = new Date(ano, mes - 1 + dir, 1)
  return { ano: novo.getFullYear(), mes: novo.getMonth() + 1 }
}

export default function FinancasPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session?.user?.id

  const [mesSel, setMesSel] = useState(anoMesAtual)
  const [modalNova, setModalNova] = useState(false)
  const [detalheId, setDetalheId] = useState(null)

  const anoMes = formatarAnoMes(mesSel)

  const { data: transacoes = [], isLoading } = useQuery({
    queryKey: ['transacoes-mes', userId, anoMes],
    queryFn: () => TransacaoService.listarPorMes(userId, anoMes),
    enabled: !!userId,
  })

  const { data: resumo, isLoading: carregandoResumo } = useQuery({
    queryKey: ['resumo-financeiro', userId, anoMes],
    queryFn: () => TransacaoService.getResumoMes(userId, anoMes),
    enabled: !!userId,
  })

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 12px' }}>
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
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Finanças</h1>
      </header>

      {/* Navegador de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 20px 12px' }}>
        <button
          type="button"
          onClick={() => setMesSel(s => navegar(s, -1))}
          aria-label="Mês anterior"
          style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
          {MESES_LABEL[mesSel.mes - 1]} {mesSel.ano}
        </p>
        <button
          type="button"
          onClick={() => setMesSel(s => navegar(s, 1))}
          aria-label="Próximo mês"
          style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <CardResumoMes
        resumo={resumo}
        isLoading={carregandoResumo}
        onAbrirFaturas={() => navigate('/financas/faturas')}
      />

      {/* Lista de transações */}
      <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>
          TRANSAÇÕES
        </p>

        {isLoading && (
          <>
            <Skeleton width="100%" height={60} radius={14} />
            <Skeleton width="100%" height={60} radius={14} />
            <Skeleton width="100%" height={60} radius={14} />
          </>
        )}

        {!isLoading && transacoes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-3)' }}>
            <Wallet size={36} aria-hidden style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Nenhuma transação neste mês.<br />
              Toque no botão <strong>+</strong> para registrar.
            </p>
          </div>
        )}

        {!isLoading && transacoes.map(t => (
          <CardTransacao key={t.id} transacao={t} onAbrir={setDetalheId} />
        ))}
      </section>

      <div style={{ height: 16 }} />

      {userId && <SecaoConfiguracoes userId={userId} />}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setModalNova(true)}
        aria-label="Nova transação"
        style={{
          position: 'fixed', right: 20, bottom: NAV_H + 20,
          width: 56, height: 56, borderRadius: 28,
          background: 'var(--color-accent)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          zIndex: 90,
        }}
      >
        <Plus size={26} aria-hidden />
      </button>

      <BottomNav />

      {modalNova && userId && (
        <ModalTransacao
          userId={userId}
          anoMes={anoMes}
          onFechar={() => setModalNova(false)}
        />
      )}

      {detalheId && (
        <ModalDetalheTransacao
          transacaoId={detalheId}
          userId={userId}
          anoMes={anoMes}
          onFechar={() => setDetalheId(null)}
        />
      )}
    </div>
  )
}
