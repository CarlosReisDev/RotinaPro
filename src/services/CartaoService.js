import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, textoNaoVazio, inteiroPositivo } from '../utils/validators'

const CartaoService = {
  async listar(userId, { apenasAtivos = false } = {}) {
    try {
      uuid(userId, { campo: 'userId' })
      const filtros = apenasAtivos
        ? [['eq', 'usuario_id', userId], ['eq', 'ativo', true]]
        : [['eq', 'usuario_id', userId]]
      return await ApiClient.select(
        'cartao',
        filtros,
        { select: 'id, nome, dia_vencimento, ativo', order: { col: 'nome', asc: true } },
      )
    } catch (error) {
      logErro('CartaoService.listar', error)
      throw new Error('Erro ao buscar cartões.')
    }
  },

  async obterPorId(id) {
    try {
      uuid(id, { campo: 'id' })
      const rows = await ApiClient.select('cartao', { id }, { limit: 1 })
      return rows?.[0] ?? null
    } catch (error) {
      logErro('CartaoService.obterPorId', error)
      throw new Error('Erro ao buscar cartão.')
    }
  },

  async salvar({ id, userId, nome, diaVencimento, ativo = true }) {
    try {
      uuid(userId, { campo: 'userId' })
      const nomeNorm = textoNaoVazio(nome, { campo: 'Nome', min: 1, max: 100 })
      const dia = inteiroPositivo(diaVencimento, { campo: 'Dia de vencimento', min: 1, max: 31 })
      const dados = {
        usuario_id: userId,
        nome: nomeNorm,
        dia_vencimento: dia,
        ativo: !!ativo,
      }
      if (id) {
        uuid(id, { campo: 'id' })
        return await ApiClient.update('cartao', id, dados)
      }
      return await ApiClient.insert('cartao', dados)
    } catch (error) {
      logErro('CartaoService.salvar', error)
      if (error.code === '23505') throw new Error('Já existe cartão com esse nome.')
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42703') throw new Error('Banco desatualizado. Rode as migrations pendentes.')
      if (error.code === '23503') throw new Error('Referência inválida.')
      if (error.code === '23502') throw new Error('Campo obrigatório faltando.')
      if (error.message?.startsWith('Tempo de espera')) throw error
      if (error.message?.match(/^(Nome|Dia|userId|id)/)) throw error
      throw new Error('Erro ao salvar cartão.')
    }
  },

  async excluir(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('cartao', id)
    } catch (error) {
      logErro('CartaoService.excluir', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      throw new Error('Erro ao excluir cartão.')
    }
  },
}

export default CartaoService
