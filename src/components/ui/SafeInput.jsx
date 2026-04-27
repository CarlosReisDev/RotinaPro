// Único lugar do projeto onde `<input>` é permitido.
// ESLint bloqueia `<input>` direto em pages/components — sempre usar SafeInput.
// Protege contra:
//   - Colagem/digitação de strings infinitas (maxLength default 120 em texto)
//   - Valores numéricos fora de [min, max] (clamp na entrada)
//   - Perda de sincronia com formulário controlado (sempre chama onChange)

const TIPOS_TEXTO = new Set(['text', 'search', 'email', 'tel', 'url', 'password'])
const MAX_TEXTO_PADRAO = 120

function aplicarLimites({ valor, type, maxLength, min, max }) {
  let v = valor
  if (TIPOS_TEXTO.has(type) && maxLength) {
    v = v.slice(0, maxLength)
  }
  if (type === 'number' && v !== '' && v !== '-' && v !== '.') {
    const n = Number(v)
    if (Number.isFinite(n)) {
      if (max !== undefined && n > max) v = String(max)
      if (min !== undefined && n < min) v = String(min)
    }
  }
  return v
}

export default function SafeInput({
  type = 'text',
  maxLength,
  min,
  max,
  onChange,
  ...rest
}) {
  const limiteTexto = TIPOS_TEXTO.has(type) ? (maxLength ?? MAX_TEXTO_PADRAO) : maxLength

  function handleChange(e) {
    const limpo = aplicarLimites({ valor: e.target.value, type, maxLength: limiteTexto, min, max })
    if (limpo !== e.target.value) e.target.value = limpo
    onChange?.(e)
  }

  return (
    <input
      {...rest}
      type={type}
      maxLength={limiteTexto}
      min={min}
      max={max}
      onChange={handleChange}
    />
  )
}
