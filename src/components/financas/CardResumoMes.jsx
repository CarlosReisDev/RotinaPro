import { ArrowDown, CreditCard, Banknote, Landmark, ChevronRight } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import { COR_SUCESSO, COR_ERRO } from '../../utils/cores'

function formatarBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Cores fixas das modalidades — não pertencem a cores.js ainda (Fase 6 vai centralizar)
const COR_DEBITO   = '#F59E0B'
const COR_CREDITO  = '#EF4444'
const COR_DINHEIRO = '#14B8A6'

export default function CardResumoMes({ resumo, isLoading, onAbrirFaturas }) {
  if (isLoading) {
    return (
      <section style={{ padding: '0 20px 16px' }}>
        <Skeleton width="100%" height={150} radius={14} />
      </section>
    )
  }

  const r = resumo ?? { entradas: 0, saidasDebito: 0, saidasCredito: 0, saidasDinheiro: 0, saldo: 0 }
  const saldoCor = r.saldo >= 0 ? COR_SUCESSO : COR_ERRO

  return (
    <section style={{ padding: '0 20px 16px' }}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.4 }}>
            SALDO DO MÊS
          </span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: saldoCor }}>
            {r.saldo < 0 ? '−' : ''}R$ {formatarBR(Math.abs(r.saldo))}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Bloco
            rotulo="Entradas"
            valor={r.entradas}
            cor={COR_SUCESSO}
            Icone={ArrowDown}
          />
          <Bloco
            rotulo="Débito"
            valor={r.saidasDebito}
            cor={COR_DEBITO}
            Icone={Landmark}
            prefixo="−"
          />
          <Bloco
            rotulo="Crédito"
            valor={r.saidasCredito}
            cor={COR_CREDITO}
            Icone={CreditCard}
            prefixo="−"
          />
          <Bloco
            rotulo="Dinheiro"
            valor={r.saidasDinheiro}
            cor={COR_DINHEIRO}
            Icone={Banknote}
            prefixo="−"
          />
        </div>

        {r.saidasCredito > 0 && onAbrirFaturas && (
          <button
            type="button"
            onClick={onAbrirFaturas}
            aria-label="Ver faturas dos cartões"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'transparent', border: '1px dashed var(--color-border)',
              borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
              color: 'var(--color-text-2)', fontFamily: 'var(--font-body)',
              fontSize: 12, fontWeight: 600, minHeight: 36,
            }}
          >
            Ver faturas dos cartões
            <ChevronRight size={14} aria-hidden />
          </button>
        )}
      </div>
    </section>
  )
}

function Bloco({ rotulo, valor, cor, Icone, prefixo = '' }) {
  return (
    <div style={{
      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: '9px 10px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icone size={12} color={cor} aria-hidden />
        <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.3 }}>
          {rotulo.toUpperCase()}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: cor }}>
        {prefixo}R$ {formatarBR(valor)}
      </p>
    </div>
  )
}
