import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio, numeroFinito, uuid } from '../utils/validators'

const ORIGENS_VALIDAS = ['texto', 'foto', 'textoFoto', 'pratoFixo', 'recente', 'alimento']

function inicioFimDoDiaISO(data) {
  const d = data ? new Date(data + 'T00:00:00') : new Date()
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const fim    = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0)
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

const RefeicaoService = {
  // Chama Edge Function `analisar-refeicao` com texto. Retorna macros estimados.
  // Erros possíveis: status=429 (rate-limit), status=502 (Gemini), genéricos.
  async analisarPorTexto({ descricao, objetivoUsuario }) {
    try {
      const desc = textoNaoVazio(descricao, { min: 2, max: 1000, campo: 'Descrição' })
      const data = await ApiClient.invocar('analisar-refeicao', {
        descricao: desc,
        objetivoUsuario: objetivoUsuario ?? null,
      })
      return data
    } catch (error) {
      logErro('RefeicaoService.analisarPorTexto', error)
      if (error.message?.startsWith('Descrição')) throw error
      if (error.status === 429) throw new Error(error.message || 'Limite diário de análise atingido.')
      throw new Error(error.message || 'Erro ao analisar refeição.')
    }
  },

  // Aceita imagem já em base64 (com ou sem prefixo data:...) e descrição opcional.
  // Caller deve comprimir a imagem ANTES (utils/imagem.js → comprimirImagem).
  async analisarPorFoto({ imagemBase64, descricao = '', objetivoUsuario }) {
    try {
      if (!imagemBase64 || typeof imagemBase64 !== 'string') {
        throw new Error('Imagem inválida.')
      }
      const desc = descricao?.trim()
        ? textoNaoVazio(descricao, { min: 2, max: 1000, campo: 'Descrição' })
        : null
      const data = await ApiClient.invocar('analisar-refeicao', {
        descricao: desc,
        imagemBase64,
        objetivoUsuario: objetivoUsuario ?? null,
      })
      return data
    } catch (error) {
      logErro('RefeicaoService.analisarPorFoto', error)
      if (error.message?.startsWith('Descrição') || error.message === 'Imagem inválida.') throw error
      if (error.status === 429) throw new Error(error.message || 'Limite diário de análise atingido.')
      throw new Error(error.message || 'Erro ao analisar foto.')
    }
  },

  async salvar({ userId, descricao, calorias, proteina_g, carboidrato_g, gordura_g, classificacao, origem }) {
    try {
      uuid(userId, { campo: 'userId' })

      if (!ORIGENS_VALIDAS.includes(origem)) throw new Error('Origem inválida.')

      const descNorm = descricao?.trim()
        ? textoNaoVazio(descricao, { min: 1, max: 1000, campo: 'Descrição' })
        : null

      const dados = {
        usuario_id: userId,
        descricao_texto: descNorm,
        calorias_estimadas: calorias != null ? numeroFinito(calorias, { campo: 'Calorias estimadas', min: 0, max: 5000 }) : null,
        calorias_confirmadas: numeroFinito(calorias, { campo: 'Calorias', min: 0, max: 5000 }),
        proteina_g:    numeroFinito(proteina_g,    { campo: 'Proteína',     min: 0, max: 500 }),
        carboidrato_g: numeroFinito(carboidrato_g, { campo: 'Carboidrato',  min: 0, max: 1000 }),
        gordura_g:     numeroFinito(gordura_g,     { campo: 'Gordura',      min: 0, max: 500 }),
        classificacao_ia: classificacao?.trim() ? String(classificacao).slice(0, 200) : null,
        origem,
      }

      return await ApiClient.insert('registro_refeicao', dados)
    } catch (error) {
      logErro('RefeicaoService.salvar', error)
      if (error.message?.match(/^(Descrição|Calorias|Proteína|Carboidrato|Gordura|Origem|userId)/)) throw error
      throw new Error('Erro ao salvar refeição.')
    }
  },

  async listarDoDia(userId, dataISO = null) {
    try {
      uuid(userId, { campo: 'userId' })
      const { inicio, fim } = inicioFimDoDiaISO(dataISO)
      return await ApiClient.select(
        'registro_refeicao',
        [
          ['eq',  'usuario_id', userId],
          ['gte', 'data_hora',  inicio],
          ['lt',  'data_hora',  fim],
        ],
        {
          select: 'id, data_hora, descricao_texto, calorias_confirmadas, proteina_g, carboidrato_g, gordura_g, classificacao_ia, origem',
          order: { col: 'data_hora', asc: false },
        },
      )
    } catch (error) {
      logErro('RefeicaoService.listarDoDia', error)
      throw new Error('Erro ao buscar refeições do dia.')
    }
  },

  async deletar(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('registro_refeicao', id)
    } catch (error) {
      logErro('RefeicaoService.deletar', error)
      throw new Error('Erro ao deletar refeição.')
    }
  },

  // Últimas N refeições únicas dos últimos 30 dias (deduplica por descricao_texto).
  async listarRecentes(userId, limit = 10) {
    try {
      uuid(userId, { campo: 'userId' })
      const limite_data = new Date()
      limite_data.setDate(limite_data.getDate() - 30)
      const todas = await ApiClient.select(
        'registro_refeicao',
        [
          ['eq',  'usuario_id', userId],
          ['gte', 'data_hora',  limite_data.toISOString()],
        ],
        {
          select: 'id, descricao_texto, calorias_confirmadas, proteina_g, carboidrato_g, gordura_g, data_hora',
          order:  { col: 'data_hora', asc: false },
          limit:  limit * 4,
        },
      )
      // Deduplica client-side mantendo só a ocorrência mais recente de cada descrição
      const vistas = new Set()
      const unicas = []
      for (const r of (todas ?? [])) {
        if (!r.descricao_texto) continue
        const key = r.descricao_texto.toLowerCase().trim()
        if (vistas.has(key)) continue
        vistas.add(key)
        unicas.push(r)
        if (unicas.length >= limit) break
      }
      return unicas
    } catch (error) {
      logErro('RefeicaoService.listarRecentes', error)
      throw new Error('Erro ao buscar refeições recentes.')
    }
  },

  // Salva refeição composta por alimentos via RPC autoritativo (recalcula no servidor).
  // itens: [{ alimento_id, qtd_g }, ...]  (1..50)
  async salvarPorAlimentos({ userId, itens, observacao = null }) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!Array.isArray(itens) || itens.length === 0) {
        throw new Error('Adicione pelo menos um alimento.')
      }
      if (itens.length > 50) {
        throw new Error('Máximo 50 alimentos por refeição.')
      }
      const itensNorm = itens.map((it, i) => {
        uuid(it.alimento_id, { campo: `Alimento ${i + 1}` })
        const qtd = numeroFinito(it.qtd_g, { campo: `Quantidade do alimento ${i + 1}`, min: 0.1, max: 5000 })
        return { alimento_id: it.alimento_id, qtd_g: qtd }
      })
      const obs = observacao?.trim()
        ? textoNaoVazio(observacao, { min: 1, max: 200, campo: 'Observação' })
        : null
      return await ApiClient.rpc('salvar_refeicao_alimentos', {
        p_usuario_id: userId,
        p_itens: itensNorm,
        p_observacao: obs,
      })
    } catch (error) {
      logErro('RefeicaoService.salvarPorAlimentos', error)
      if (error.message?.match(/^(Adicione|Máximo|Alimento|Quantidade|Observação|userId)/)) throw error
      throw new Error('Erro ao salvar refeição por alimentos.')
    }
  },

  // Salva prato fixo como refeição e copia ingredientes para refeicao_alimento (snapshot).
  // Pratos sem ingredientes (modo manual) geram refeição sem composição — normal.
  async salvarDePratoFixo(pratoFixoId) {
    try {
      uuid(pratoFixoId, { campo: 'pratoFixoId' })
      return await ApiClient.rpc('salvar_refeicao_prato_fixo', {
        p_prato_fixo_id: pratoFixoId,
      })
    } catch (error) {
      logErro('RefeicaoService.salvarDePratoFixo', error)
      if (error.message?.startsWith('Prato fixo')) throw error
      throw new Error('Erro ao registrar prato fixo.')
    }
  },

  // Detalhe da refeição. Vem com array de componentes (snapshot) quando origem='alimento' ou 'pratoFixo' com ingredientes.
  async obterDetalhe(id) {
    try {
      uuid(id, { campo: 'id' })
      const dados = await ApiClient.select(
        'registro_refeicao',
        { id },
        {
          select: 'id, data_hora, descricao_texto, calorias_confirmadas, proteina_g, carboidrato_g, gordura_g, classificacao_ia, origem, refeicao_alimento(id, alimento_nome, qtd_g, calorias, proteina_g, carboidrato_g, gordura_g, ordem)',
          limit: 1,
        },
      )
      const refeicao = dados?.[0]
      if (!refeicao) return null
      // Ordena componentes por `ordem` (Supabase não ordena nested por padrão)
      if (Array.isArray(refeicao.refeicao_alimento)) {
        refeicao.refeicao_alimento.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      }
      return refeicao
    } catch (error) {
      logErro('RefeicaoService.obterDetalhe', error)
      throw new Error('Erro ao buscar detalhe da refeição.')
    }
  },
}

export default RefeicaoService
