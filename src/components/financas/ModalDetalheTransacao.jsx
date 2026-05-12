import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, X, ArrowDown, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import Skeleton from '../ui/Skeleton'
import ModalConfirmacao from '../ui/ModalConfirmacao'
import TransacaoService from '../../services/TransacaoService'
import { COR_SUCESSO, COR_ERRO } from '../../utils/cores'

function formatarBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarData(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatarMesAno(iso) {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${meses[Number(m) - 1]}/${y}`
}

const LABEL_MODALIDADE = {
  debito:   'Débito',
  credito:  'Crédito',
  dinheiro: 'Dinheiro',
}

export default function ModalDetalheTransacao({ transacaoId, userId, anoMes, onFechar }) {
  const qc = useQueryClient()
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const { data: transacao, isLoading } = useQuery({
    queryKey: ['transacao-detalhe', transacaoId],
    queryFn: () => TransacaoService.obterPorId(transacaoId),
    enabled: !!transacaoId,
    staleTime: 1000 * 60 * 5,
  })

  const excluir = useMutation({
    mutationFn: () => TransacaoService.excluir(transacaoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-mes', userId, anoMes] })
      qc.invalidateQueries({ queryKey: ['saldo-mes', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-financeiro', userId, anoMes] })
      toast.success('Transação excluída.')
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const isEntrada = transacao?.tipo === 'entrada'
  const cor = isEntrada ? COR_SUCESSO : COR_ERRO
  const IconeTipo = isEntrada ? ArrowDown : ArrowUp
  const temParcela = transacao?.numero_parcelas && transacao.numero_parcelas > 1

  return createPortal(
    <>
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
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, flex: 1 }}>
              Detalhe da transação
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

          <div style={{ overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {isLoading && (
              <>
                <Skeleton width="100%" height={70} radius={12} />
                <Skeleton width="100%" height={110} radius={12} />
              </>
            )}

            {!isLoading && transacao && (
              <>
                <section style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 14, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <IconeTipo size={14} color={cor} aria-hidden />
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: 0.4 }}>
                      {isEntrada ? 'ENTRADA' : 'SAÍDA'} · {LABEL_MODALIDADE[transacao.modalidade]}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: cor }}>
                    {isEntrada ? '+' : '−'} R$ {formatarBR(transacao.valor)}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--color-text)', marginTop: 6, fontWeight: 600 }}>
                    {transacao.descricao}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {formatarData(transacao.data)}
                  </p>
                </section>

                <section style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 14, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {transacao.categoria?.nome && (
                    <Linha rotulo="Categoria" valor={transacao.categoria.nome} />
                  )}
                  {transacao.cartao?.nome && (
                    <Linha rotulo="Cartão" valor={transacao.cartao.nome} />
                  )}
                  {temParcela && (
                    <>
                      <Linha rotulo="Parcela" valor={`${transacao.parcela_atual} de ${transacao.numero_parcelas}`} />
                      {transacao.mes_vencimento_fatura && (
                        <Linha rotulo="Fatura" valor={formatarMesAno(transacao.mes_vencimento_fatura)} />
                      )}
                    </>
                  )}
                  {!temParcela && transacao.modalidade === 'credito' && transacao.mes_vencimento_fatura && (
                    <Linha rotulo="Fatura" valor={formatarMesAno(transacao.mes_vencimento_fatura)} />
                  )}
                </section>

                {temParcela && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                    Excluir apenas esta parcela. As demais permanecem.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmExcluir(true)}
                  disabled={excluir.isPending}
                  style={{
                    width: '100%', minHeight: 46, borderRadius: 12,
                    border: '1.5px dashed rgba(239,68,68,0.5)', background: 'transparent',
                    color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                    cursor: excluir.isPending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Trash2 size={16} aria-hidden /> {excluir.isPending ? 'Excluindo…' : 'Excluir transação'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmExcluir && (
        <ModalConfirmacao
          titulo="Excluir transação?"
          descricao={temParcela
            ? 'Apenas esta parcela será excluída. As demais permanecem ativas.'
            : 'A transação será removida do histórico. Esta ação não pode ser desfeita.'}
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmExcluir(false)}
        />
      )}
    </>,
    document.body
  )
}

function Linha({ rotulo, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>{rotulo}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600, textAlign: 'right' }}>{valor}</span>
    </div>
  )
}
