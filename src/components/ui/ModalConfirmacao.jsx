export default function ModalConfirmacao({
  titulo,
  descricao,
  confirmar = 'Confirmar',
  cancelar = 'Voltar',
  salvando = false,
  destrutivo = true,
  onConfirmar,
  onFechar,
}) {
  return (
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300 }} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-label={titulo}
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, background: 'var(--color-surface)',
          borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 301,
          paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {titulo}
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 24 }}>
          {descricao}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onFechar} disabled={salvando}
            style={{
              flex: 1, padding: '13px', background: 'var(--color-surface-2)', border: 'none',
              borderRadius: 12, color: 'var(--color-text)',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              cursor: salvando ? 'not-allowed' : 'pointer', minHeight: 48,
            }}>
            {cancelar}
          </button>
          <button type="button" onClick={onConfirmar} disabled={salvando}
            style={{
              flex: 1, padding: '13px',
              background: destrutivo ? '#EF4444' : 'var(--color-accent)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              cursor: salvando ? 'not-allowed' : 'pointer', minHeight: 48,
            }}>
            {salvando ? 'Aguarde…' : confirmar}
          </button>
        </div>
      </div>
    </>
  )
}
