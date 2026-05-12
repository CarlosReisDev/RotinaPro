import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, textoNaoVazio, inteiroPositivo, numeroFinito } from '../utils/validators'

const PERIODICIDADES = new Set(['mensal', 'semanal', 'anual'])
const MODALIDADES    = new Set(['debito', 'credito', 'dinheiro'])

const RecorrenteService = {
  async listar(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'transacao_recorrente',
        [
          ['eq', 'usuario_id',  userId],
          ['is', 'deletado_em', null],
        ],
        {
          select: 'id, valor, descricao, periodicidade, dia_lancamento, modalidade, ativa, categoria_id, categoria:categoria_id(nome)',
          order: { col: 'descricao', asc: true },
        },
      )
    } catch (error) {
      logErro('RecorrenteService.listar', error)
      throw new Error('Erro ao buscar recorrentes.')
    }
  },

  async salvar({ id, userId, descricao, valor, periodicidade, diaLancamento, modalidade, categoriaId = null, ativa = true }) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!PERIODICIDADES.has(periodicidade)) throw new Error('Periodicidade inválida.')
      if (!MODALIDADES.has(modalidade)) throw new Error('Modalidade inválida.')
      const descNorm = textoNaoVazio(descricao, { campo: 'Descrição', min: 1, max: 200 })
      // Valor pode ser negativo (saída) ou positivo (entrada) — preserva sinal.
      const valorNum = numeroFinito(valor, { campo: 'Valor', min: -999999999, max: 999999999 })
      if (valorNum === 0) throw new Error('Valor não pode ser zero.')
      const diaMax = periodicidade === 'semanal' ? 7 : 31
      const dia = inteiroPositivo(diaLancamento, { campo: 'Dia', min: 1, max: diaMax })
      if (categoriaId) uuid(categoriaId, { campo: 'categoriaId' })

      const dados = {
        usuario_id:     userId,
        descricao:      descNorm,
        valor:          Math.round(valorNum * 100) / 100,
        periodicidade,
        dia_lancamento: dia,
        modalidade,
        categoria_id:   categoriaId,
        ativa:          !!ativa,
      }

      if (id) {
        uuid(id, { campo: 'id' })
        return await ApiClient.update('transacao_recorrente', id, dados)
      }
      return await ApiClient.insert('transacao_recorrente', dados)
    } catch (error) {
      logErro('RecorrenteService.salvar', error)
      if (error.code === '23505') throw new Error('Já existe recorrente igual.')
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42703') throw new Error('Banco desatualizado. Rode as migrations pendentes.')
      if (error.code === '23503') throw new Error('Referência inválida.')
      if (error.code === '23502') throw new Error('Campo obrigatório faltando.')
      if (error.message?.startsWith('Tempo de espera')) throw error
      if (error.message?.match(/^(Descrição|Valor|Periodicidade|Modalidade|Dia|userId|categoriaId|id)/)) throw error
      throw new Error('Erro ao salvar recorrente.')
    }
  },

  async excluir(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.rpc('deletar_transacao_recorrente', { p_id: id })
    } catch (error) {
      logErro('RecorrenteService.excluir', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      throw new Error('Erro ao excluir recorrente.')
    }
  },
}

export default RecorrenteService
