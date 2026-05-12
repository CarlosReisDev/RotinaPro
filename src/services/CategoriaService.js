import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, textoNaoVazio, numeroFinito } from '../utils/validators'

const CategoriaService = {
  async listar(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'categoria_financeira',
        { usuario_id: userId },
        { select: 'id, nome, orcamento_mensal_reais, alerta_ativo', order: { col: 'nome', asc: true } },
      )
    } catch (error) {
      logErro('CategoriaService.listar', error)
      throw new Error('Erro ao buscar categorias.')
    }
  },

  async obterPorId(id) {
    try {
      uuid(id, { campo: 'id' })
      const rows = await ApiClient.select('categoria_financeira', { id }, { limit: 1 })
      return rows?.[0] ?? null
    } catch (error) {
      logErro('CategoriaService.obterPorId', error)
      throw new Error('Erro ao buscar categoria.')
    }
  },

  async salvar({ id, userId, nome, orcamentoMensal, alertaAtivo }) {
    try {
      uuid(userId, { campo: 'userId' })
      const nomeNorm = textoNaoVazio(nome, { campo: 'Nome', min: 1, max: 100 })
      const orcamento = (orcamentoMensal === null || orcamentoMensal === undefined || orcamentoMensal === '')
        ? null
        : numeroFinito(orcamentoMensal, { campo: 'Orçamento', min: 0, max: 1000000 })
      const dados = {
        usuario_id: userId,
        nome: nomeNorm,
        orcamento_mensal_reais: orcamento,
        alerta_ativo: !!alertaAtivo,
      }
      if (id) {
        uuid(id, { campo: 'id' })
        return await ApiClient.update('categoria_financeira', id, dados)
      }
      return await ApiClient.insert('categoria_financeira', dados)
    } catch (error) {
      logErro('CategoriaService.salvar', error)
      if (error.code === '23505') throw new Error('Já existe categoria com esse nome.')
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42703') throw new Error('Banco desatualizado. Rode as migrations pendentes.')
      if (error.code === '23503') throw new Error('Referência inválida.')
      if (error.code === '23502') throw new Error('Campo obrigatório faltando.')
      if (error.message?.startsWith('Tempo de espera')) throw error
      if (error.message?.match(/^(Nome|Orçamento|userId|id)/)) throw error
      throw new Error('Erro ao salvar categoria.')
    }
  },

  async excluir(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('categoria_financeira', id)
    } catch (error) {
      logErro('CategoriaService.excluir', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      throw new Error('Erro ao excluir categoria.')
    }
  },
}

export default CategoriaService
