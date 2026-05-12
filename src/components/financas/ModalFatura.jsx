import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import TransacaoService from '../../services/TransacaoService'
import { COR_ERRO } from '../../utils/cores'

function formatarBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarDia(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${d} ${meses[Number(m) - 1]}`
}

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function isoMes(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

function navegar({ ano, mes }, dir) {
  const d = new Date(ano, mes - 1 + dir, 1)
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

export default function ModalFatura({ cartao, onFechar }) {
  const hoje = new Date()
  const [mesSel, setMesSel] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 })

  const mesISO = isoMes(mesSel.ano, mesSel.mes)

  const { data, isLoading } = useQuery({
    queryKey: ['fatura', cartao.id, mesISO],
    queryFn: () => TransacaoService.getFatura(cartao.id, mesISO),
    enabled: !!cartao?.id,
  })

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const itens = data?.itens ?? []
  const total = data?.total ?? 0

  return createPortal(
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 16px env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--color-bg)', borderRadius: 20, overflow: 'hidden',
          width: '100%', maxWidth: 520, maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px 12px', borderBottom: '1px solid var(--color-border)',
        }}>
          <CreditCard size={18} color="var(--color-accent)" aria-hidden />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, flex: 1 }}>
            {cartao.nome}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--color-surface)', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        {/* Navegador de mês de vencimento */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setMesSel(s => navegar(s, -1))}
            aria-label="Mês anterior"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.3 }}>VENCIMENTO</span>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700 }}>
              {MESES_LABEL[mesSel.mes - 1]} {mesSel.ano}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMesSel(s => navegar(s, 1))}
            aria-label="Próximo mês"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>

        {/* Total */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.4 }}>TOTAL DA FATURA</span>
          {isLoading
            ? <Skeleton width={120} height={28} radius={6} />
            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: COR_ERRO }}>
                R$ {formatarBR(total)}
              </span>}
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading && (
            <>
              <Skeleton width="100%" height={52} radius={10} />
              <Skeleton width="100%" height={52} radius={10} />
            </>
          )}

          {!isLoading && itens.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13, padding: '24px 0' }}>
              Nenhuma transação nesta fatura.
            </p>
          )}

          {!isLoading && itens.map(item => (
            <div key={item.id} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.descricao}
                </p>
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
                  <span>{formatarDia(item.data)}</span>
                  {item.numeroParcelas > 1 && (
                    <>
                      <span>·</span>
                      <span>{item.parcelaAtual}/{item.numeroParcelas}</span>
                    </>
                  )}
                  {item.categoriaNome && (
                    <>
                      <span>·</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.categoriaNome}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: COR_ERRO, flexShrink: 0 }}>
                R$ {formatarBR(item.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
