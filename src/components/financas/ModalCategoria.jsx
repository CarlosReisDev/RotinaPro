import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import CategoriaService from '../../services/CategoriaService'

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

export default function ModalCategoria({ userId, categoria = null, onFechar }) {
  const qc = useQueryClient()
  const editando = !!categoria
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [orcamento, setOrcamento] = useState(categoria?.orcamento_mensal_reais ?? '')
  const [alertaAtivo, setAlertaAtivo] = useState(categoria?.alerta_ativo ?? false)

  const valido = nome.trim().length >= 1

  const salvar = useMutation({
    mutationFn: () => CategoriaService.salvar({
      id: categoria?.id,
      userId,
      nome: nome.trim(),
      orcamentoMensal: orcamento === '' ? null : Number(orcamento),
      alertaAtivo,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias', userId] })
      toast.success(editando ? 'Categoria atualizada.' : 'Categoria criada.')
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

      <div role="dialog" aria-modal="true" aria-label={editando ? 'Editar categoria' : 'Nova categoria'}
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
            {editando ? 'Editar categoria' : 'Nova categoria'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="cat-nome" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>NOME</label>
            <SafeInput id="cat-nome" type="text" maxLength={100}
              placeholder="Ex: Mercado, Transporte..."
              value={nome} onChange={e => setNome(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="cat-orc" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>ORÇAMENTO MENSAL (opcional)</label>
            <SafeInput id="cat-orc" type="number" inputMode="decimal" step="0.01"
              value={orcamento} min={0} max={1000000}
              placeholder="R$ 0,00"
              onChange={e => setOrcamento(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: orcamento ? 'pointer' : 'not-allowed', padding: '8px 0', opacity: orcamento ? 1 : 0.5 }}>
            <SafeInput
              type="checkbox"
              checked={alertaAtivo}
              disabled={!orcamento}
              onChange={e => setAlertaAtivo(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>
              Alertar ao atingir 80% e 100% do orçamento
            </span>
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
            {salvar.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Criar categoria'}
          </button>
        </div>
      </div>
    </>
  )
}
