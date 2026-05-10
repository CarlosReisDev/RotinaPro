// Único lugar do projeto onde `<input>` é permitido.
// ESLint bloqueia `<input>` direto em pages/components — sempre usar SafeInput.
// Protege contra:
//   - Colagem/digitação de strings infinitas (maxLength default 120 em texto)
//   - Valores numéricos acima do max (clamp na entrada)
//   - Valores numéricos abaixo do min (clamp só no blur — durante typing,
//     o usuário precisa passar por valores intermediários < min para
//     chegar em "175" digitando "1", "17", "175")

const TIPOS_TEXTO = new Set(['text', 'search', 'email', 'tel', 'url', 'password'])
const MAX_TEXTO_PADRAO = 120

function clampMax(valor, max) {
  if (max === undefined || valor === '' || valor === '-' || valor === '.') return valor
  const n = Number(valor)
  if (Number.isFinite(n) && n > max) return String(max)
  return valor
}

function clampMinMax(valor, min, max) {
  if (valor === '' || valor === '-' || valor === '.') return valor
  const n = Number(valor)
  if (!Number.isFinite(n)) return valor
  if (max !== undefined && n > max) return String(max)
  if (min !== undefined && n < min) return String(min)
  return valor
}

export default function SafeInput({
  type = 'text',
  maxLength,
  min,
  max,
  onChange,
  onBlur,
  ...rest
}) {
  const limiteTexto = TIPOS_TEXTO.has(type) ? (maxLength ?? MAX_TEXTO_PADRAO) : maxLength

  function handleChange(e) {
    let limpo = e.target.value
    if (TIPOS_TEXTO.has(type) && limiteTexto) limpo = limpo.slice(0, limiteTexto)
    if (type === 'number') limpo = clampMax(limpo, max)
    if (limpo !== e.target.value) e.target.value = limpo
    onChange?.(e)
  }

  function handleBlur(e) {
    if (type === 'number') {
      const limpo = clampMinMax(e.target.value, min, max)
      if (limpo !== e.target.value) {
        e.target.value = limpo
        onChange?.(e)
      }
    }
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      type={type}
      maxLength={limiteTexto}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
