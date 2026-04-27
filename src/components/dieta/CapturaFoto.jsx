import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import SafeInput from '../ui/SafeInput'
import { comprimirImagem } from '../../utils/imagem'

// Captura foto da câmera traseira no mobile (capture="environment") com
// fallback para galeria/desktop. Comprime no cliente antes de devolver.
//
// Contrato:
//   valor: null | { base64: string, tamanhoKB: number }
//   onChange(novoValor)
//
// Não persiste nada — quem decide o que fazer com a base64 é o caller.
// Padrão label+input escondido para evitar ref (SafeInput não usa forwardRef).
export default function CapturaFoto({ valor, onChange, disabled = false }) {
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  async function handleArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro('')
    setProcessando(true)
    try {
      const resultado = await comprimirImagem(file, { maxLado: 1024, qualidade: 0.7 })
      onChange(resultado)
    } catch (err) {
      setErro(err.message || 'Falha ao processar imagem.')
    } finally {
      setProcessando(false)
      // limpa para permitir selecionar a MESMA foto de novo se quiser
      e.target.value = ''
    }
  }

  if (valor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ position: 'relative' }}>
          <img
            src={valor.base64}
            alt="Pré-visualização da refeição"
            style={{
              width: '100%', borderRadius: 12,
              maxHeight: 220, objectFit: 'cover',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remover foto"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'right' }}>
          {valor.tamanhoKB} KB · pronto para análise
        </p>
      </div>
    )
  }

  return (
    <div>
      <label
        htmlFor="captura-foto-input"
        aria-disabled={disabled || processando}
        style={{
          width: '100%', minHeight: 46,
          border: '1px dashed var(--color-border)', borderRadius: 12,
          background: 'var(--color-bg)', color: 'var(--color-text-2)',
          cursor: (disabled || processando) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 14, fontWeight: 600,
          opacity: (disabled || processando) ? 0.6 : 1,
          padding: '10px 12px', boxSizing: 'border-box',
        }}
      >
        <Camera size={16} aria-hidden />
        {processando ? 'Processando imagem...' : 'Adicionar foto'}
      </label>
      <SafeInput
        id="captura-foto-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleArquivo}
        disabled={disabled || processando}
        style={{ display: 'none' }}
      />
      {erro && (
        <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{erro}</p>
      )}
    </div>
  )
}
