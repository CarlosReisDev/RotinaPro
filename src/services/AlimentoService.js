import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio, numeroFinito, uuid } from '../utils/validators'

const SISTEMA_UUID = '00000000-0000-0000-0000-000000000000'

function normalizar(dados) {
  return {
    nome: textoNaoVazio(dados.nome, { min: 1, max: 100, campo: 'Nome do alimento' }),
    calorias_kcal_100g: numeroFinito(dados.calorias_kcal_100g, { campo: 'Calorias/100g',    min: 0, max: 999.9 }),
    proteina_g_100g:    numeroFinito(dados.proteina_g_100g,    { campo: 'Proteína/100g',    min: 0, max: 100 }),
    carboidrato_g_100g: numeroFinito(dados.carboidrato_g_100g, { campo: 'Carboidrato/100g', min: 0, max: 100 }),
    gordura_g_100g:     numeroFinito(dados.gordura_g_100g,     { campo: 'Gordura/100g',     min: 0, max: 100 }),
    unidade_padrao_g:     numeroFinito(dados.unidade_padrao_g, { campo: 'Unidade padrão (g)', min: 0.1, max: 9999, permitirNulo: true }),
    unidade_padrao_label: dados.unidade_padrao_label?.trim()
      ? textoNaoVazio(dados.unidade_padrao_label, { min: 1, max: 40, campo: 'Rótulo da unidade' })
      : null,
  }
}

const AlimentoService = {
  // Lista próprios + predefinidos. RLS faz o filtro: auth.uid() OR predefinido=true.
  // Sem filtro explícito — evita conflito com a policy e garante compatibilidade.
  async listar(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'alimento',
        null,
        {
          order: [
            { col: 'predefinido', asc: true },
            { col: 'nome',        asc: true },
          ],
        },
      )
    } catch (error) {
      logErro('AlimentoService.listar', error)
      throw new Error('Erro ao buscar alimentos.')
    }
  },

  async criar(userId, dados) {
    try {
      uuid(userId, { campo: 'userId' })
      const norm = normalizar(dados)
      // Coerência: se um lado da unidade está preenchido, o outro também
      if ((norm.unidade_padrao_g === null) !== (norm.unidade_padrao_label === null)) {
        throw new Error('Unidade padrão precisa de gramas E rótulo (ou nenhum dos dois).')
      }
      return await ApiClient.insert('alimento', {
        usuario_id: userId,
        predefinido: false,
        ...norm,
      })
    } catch (error) {
      logErro('AlimentoService.criar', error)
      if (error.message?.match(/^(Nome|Calorias|Proteína|Carboidrato|Gordura|Unidade|Rótulo)/)) throw error
      throw new Error('Erro ao criar alimento.')
    }
  },

  async atualizar(id, dados) {
    try {
      uuid(id, { campo: 'id' })
      const norm = normalizar(dados)
      if ((norm.unidade_padrao_g === null) !== (norm.unidade_padrao_label === null)) {
        throw new Error('Unidade padrão precisa de gramas E rótulo (ou nenhum dos dois).')
      }
      return await ApiClient.update('alimento', id, norm)
    } catch (error) {
      logErro('AlimentoService.atualizar', error)
      if (error.message?.match(/^(Nome|Calorias|Proteína|Carboidrato|Gordura|Unidade|Rótulo)/)) throw error
      throw new Error('Erro ao atualizar alimento.')
    }
  },

  async deletar(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('alimento', id)
    } catch (error) {
      logErro('AlimentoService.deletar', error)
      throw new Error('Erro ao deletar alimento.')
    }
  },

  isPredefinido: (alimento) => alimento.predefinido || alimento.usuario_id === SISTEMA_UUID,
}

export default AlimentoService
