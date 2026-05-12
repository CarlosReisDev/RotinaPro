import { ArrowDown, ArrowUp, CreditCard, Banknote, Wallet } from 'lucide-react'
import { COR_SUCESSO, COR_ERRO } from '../../utils/cores'

function formatarBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarDia(iso) {
  // iso = 'YYYY-MM-DD' — formato local sem fuso
  const [, m, d] = iso.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${d} ${meses[Number(m) - 1]}`
}

const ICONE_MODALIDADE = {
  debito:   CreditCard,
  credito:  CreditCard,
  dinheiro: Banknote,
}

export default function CardTransacao({ transacao, onAbrir }) {
  const isEntrada = transacao.tipo === 'entrada'
  const cor = isEntrada ? COR_SUCESSO : COR_ERRO
  const Icone = isEntrada ? ArrowDown : ArrowUp
  const IconeMod = ICONE_MODALIDADE[transacao.modalidade] ?? Wallet
  const temParcela = transacao.numero_parcelas && transacao.numero_parcelas > 1
  const nomeCategoria = transacao.categoria?.nome
  const nomeCartao = transacao.cartao?.nome

  return (
    <button
      type="button"
      onClick={() => onAbrir(transacao.id)}
      aria-label={`Detalhes de ${transacao.descricao}`}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
        textAlign: 'left', minHeight: 56, fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${cor}1A`, color: cor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icone size={18} aria-hidden />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {transacao.descricao}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
          <span>{formatarDia(transacao.data)}</span>
          <span>·</span>
          <IconeMod size={11} aria-hidden />
          {nomeCartao && <span>{nomeCartao}</span>}
          {temParcela && (
            <>
              <span>·</span>
              <span>{transacao.parcela_atual}/{transacao.numero_parcelas}</span>
            </>
          )}
          {nomeCategoria && !nomeCartao && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nomeCategoria}
            </span>
          )}
        </div>
      </div>

      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: cor, flexShrink: 0 }}>
        {isEntrada ? '+' : '−'} R$ {formatarBR(transacao.valor)}
      </span>
    </button>
  )
}
