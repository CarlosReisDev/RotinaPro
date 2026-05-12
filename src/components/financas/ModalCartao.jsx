import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import CartaoService from '../../services/CartaoService'

const INPUT_STYLE = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '11px 12px',
  fontSize: 15,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '100%',
}

export default function ModalCartao({ userId, cartao = null, onFechar }) {
  const qc = useQueryClient()
  const editando = !!cartao
  const [nome, setNome] = useState(cartao?.nome ?? '')
  const [diaVencimento, setDiaVencimento] = useState(cartao?.dia_vencimento ?? '')
  const [ativo, setAtivo] = useState(cartao?.ativo ?? true)

  const valido = nome.trim().length >= 1 && Number(diaVencimento) >= 1 && Number(diaVencimento) <= 31

  const salvar = useMutation({
    mutationFn: () => CartaoService.salvar({
      id: cartao?.id,
      userId,
      nome: nome.trim(),
      diaVencimento: Number(diaVencimento),
      ativo,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoes', userId] })
      toast.success(editando ? 'Cartão atualizado.' : 'Cartão criado.')
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <div onClick={onFechar} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} aria-hidden />

      <div role="dialog" aria-modal="true" aria-label={editando ? 'Editar cartão' : 'Novo cartão'}
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
          maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
          zIndex: 201,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>
            {editando ? 'Editar cartão' : 'Novo cartão'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="c-nome" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>NOME</label>
            <SafeInput id="c-nome" type="text" maxLength={100}
              placeholder="Ex: Nubank, Visa..."
              value={nome} onChange={e => setNome(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="c-dia" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>DIA DE VENCIMENTO</label>
            <SafeInput id="c-dia" type="number" inputMode="numeric"
              value={diaVencimento} min={1} max={31}
              placeholder="1 a 31"
              onChange={e => setDiaVencimento(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
            <SafeInput
              type="checkbox"
              checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Cartão ativo</span>
          </label>

          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={() => salvar.mutate()}
            disabled={!valido || salvar.isPending}
            style={{
              width: '100%', padding: '14px 20px',
              background: !valido || salvar.isPending ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color: !valido || salvar.isPending ? 'var(--color-text-3)' : '#fff',
              border: 'none', borderRadius: 14,
              fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700,
              cursor: !valido || salvar.isPending ? 'not-allowed' : 'pointer',
              minHeight: 52,
            }}>
            {salvar.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Criar cartão'}
          </button>
        </div>
      </div>
    </>
  )
}
