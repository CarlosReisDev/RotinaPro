export function textoNaoVazio(valor, { min = 1, max = 120, campo = 'campo' } = {}) {
  const trim = typeof valor === 'string' ? valor.trim() : ''
  if (trim.length < min) throw new Error(`${campo} deve ter ao menos ${min} caractere(s).`)
  if (trim.length > max) throw new Error(`${campo} deve ter no máximo ${max} caracteres.`)
  return trim
}

export function inteiroPositivo(valor, { campo = 'valor', min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(valor)
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${campo} deve ser inteiro.`)
  if (n < min) throw new Error(`${campo} deve ser ≥ ${min}.`)
  if (n > max) throw new Error(`${campo} deve ser ≤ ${max}.`)
  return n
}

export function numeroFinito(valor, { campo = 'valor', min, max, permitirNulo = false } = {}) {
  if (valor === null || valor === undefined || valor === '') {
    if (permitirNulo) return null
    throw new Error(`${campo} é obrigatório.`)
  }
  const n = Number(valor)
  if (!Number.isFinite(n)) throw new Error(`${campo} deve ser um número válido.`)
  if (min !== undefined && n < min) throw new Error(`${campo} deve ser ≥ ${min}.`)
  if (max !== undefined && n > max) throw new Error(`${campo} deve ser ≤ ${max}.`)
  return n
}

export function uuid(valor, { campo = 'id' } = {}) {
  if (typeof valor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) {
    throw new Error(`${campo} inválido.`)
  }
  return valor
}
