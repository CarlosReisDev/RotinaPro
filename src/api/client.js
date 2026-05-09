import { createClient } from '@supabase/supabase-js'

// Lock em memória substituindo o navigator.locks padrão do Supabase v2.
// navigator.locks tem implementação instável no Firefox (sobretudo mobile):
// o lock fica "preso" entre page loads e trava o refresh do token na atualização.
// Como o app é single-tab por sessão, lock em memória é suficiente e seguro.
const lockMap = new Map()
async function memLock(name, _timeout, fn) {
  while (lockMap.has(name)) {
    try { await lockMap.get(name) } catch { /* continua mesmo se anterior rejeitou */ }
  }
  let liberar
  const espera = new Promise(r => { liberar = r })
  lockMap.set(name, espera)
  try {
    return await fn()
  } finally {
    lockMap.delete(name)
    liberar()
  }
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { lock: memLock } },
)

// Rede de segurança: requisições que pendurem por mais de TIMEOUT_MS viram erro
// tratado, evitando que React Query fique em loading infinito por token refresh
// travado, Service Worker do PWA cacheado em estado ruim ou rede mobile oscilando.
const TIMEOUT_MS = 20000
function comTimeout(promise, ms = TIMEOUT_MS) {
  let timer
  const espera = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tempo de espera excedido. Verifique sua conexão e tente novamente.')), ms)
  })
  return Promise.race([promise, espera]).finally(() => clearTimeout(timer))
}

// Operadores suportados em filtros-array: ['eq'|'neq'|'is'|'gte'|'gt'|'lte'|'lt'|'in'|'or', coluna, valor]
const OPERADORES = new Set(['eq', 'neq', 'is', 'gte', 'gt', 'lte', 'lt', 'in'])

function aplicarFiltros(query, filtros) {
  if (!filtros) return query
  if (Array.isArray(filtros)) {
    for (const [op, col, val] of filtros) {
      if (op === 'or')            query = query.or(col)
      else if (OPERADORES.has(op)) query = query[op](col, val)
      else throw new Error(`Operador não suportado: ${op}`)
    }
  } else {
    for (const [col, val] of Object.entries(filtros)) query = query.eq(col, val)
  }
  return query
}

function aplicarOrder(query, order) {
  if (!order) return query
  const lista = Array.isArray(order) ? order : [order]
  for (const o of lista) query = query.order(o.col, { ascending: o.asc ?? false })
  return query
}

const ApiClient = {
  async select(tabela, filtros = null, opcoes = {}) {
    let query = supabase.from(tabela).select(opcoes.select || '*')
    query = aplicarFiltros(query, filtros)
    query = aplicarOrder(query, opcoes.order)
    if (opcoes.offset != null && opcoes.limit) {
      query = query.range(opcoes.offset, opcoes.offset + opcoes.limit - 1)
    } else if (opcoes.limit) {
      query = query.limit(opcoes.limit)
    }
    const { data, error } = await comTimeout(query)
    if (error) throw error
    return data
  },

  async insert(tabela, dados) {
    const q = supabase.from(tabela).insert(dados).select()
    const { data, error } = await comTimeout(Array.isArray(dados) ? q : q.single())
    if (error) throw error
    return data
  },

  async upsert(tabela, dados, opcoes = {}) {
    const q = supabase.from(tabela).upsert(dados, { onConflict: opcoes.onConflict }).select()
    const { data, error } = await comTimeout(Array.isArray(dados) ? q : q.single())
    if (error) throw error
    return data
  },

  async update(tabela, id, dados) {
    const { data, error } = await comTimeout(supabase.from(tabela).update(dados).eq('id', id).select().single())
    if (error) throw error
    return data
  },

  async delete(tabela, filtros) {
    let query = supabase.from(tabela).delete()
    query = typeof filtros === 'object' && filtros !== null
      ? aplicarFiltros(query, filtros)
      : query.eq('id', filtros)
    const { error } = await comTimeout(query)
    if (error) throw error
  },

  async rpc(funcao, params = {}) {
    const { data, error } = await comTimeout(supabase.rpc(funcao, params))
    if (error) throw error
    return data
  },

  // Invoca Edge Function. JWT da sessão é injetado automaticamente.
  // Em erro HTTP, supabase-js retorna FunctionsHttpError com .context (Response).
  async invocar(funcao, body = {}) {
    // Edge Function (Gemini) pode demorar — uso timeout maior
    const { data, error } = await comTimeout(supabase.functions.invoke(funcao, { body }), 45000)
    if (error) {
      // Tenta extrair body JSON da Response para preservar a mensagem real do servidor
      try {
        const bodyTxt = await error.context?.text?.()
        if (bodyTxt) {
          const parsed = JSON.parse(bodyTxt)
          const e = new Error(parsed.erro || error.message)
          e.status = error.context?.status
          e.motivo = parsed.motivo
          throw e
        }
      } catch (parseErr) {
        if (parseErr.status) throw parseErr
      }
      throw error
    }
    return data
  },

  async uploadFoto(bucket, path, file) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
  },

  // Handle do cliente Supabase para USO EXCLUSIVO de src/api/ (AuthClient).
  // ESLint bloqueia qualquer referência a `_supabaseInterno` fora de src/api/**.
  // NÃO importar em services/pages/components/contexts.
  _supabaseInterno: supabase,
}

export default ApiClient
