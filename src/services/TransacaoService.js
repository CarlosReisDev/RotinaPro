import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, textoNaoVazio, inteiroPositivo, numeroFinito } from '../utils/validators'
import { calcularMesFatura, somarMeses, dataISO } from '../utils/fatura'

const TIPOS = new Set(['entrada', 'saida'])
const MODALIDADES = new Set(['debito', 'credito', 'dinheiro'])

function round2(v) {
  return Math.round(Number(v) * 100) / 100
}

const TransacaoService = {
  async listarPorMes(userId, anoMes) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(anoMes))) {
        throw new Error('Mês inválido (use YYYY-MM).')
      }
      const [ano, mes] = anoMes.split('-').map(Number)
      const inicio = dataISO(new Date(ano, mes - 1, 1))
      const fim    = dataISO(new Date(ano, mes, 0))
      return await ApiClient.select(
        'transacao',
        [
          ['eq',  'usuario_id',  userId],
          ['is',  'deletado_em', null],
          ['gte', 'data',        inicio],
          ['lte', 'data',        fim],
        ],
        {
          select: 'id, valor, data, descricao, tipo, modalidade, numero_parcelas, parcela_atual, mes_vencimento_fatura, cartao_id, categoria_id, transacao_original_id, cartao:cartao_id(nome, dia_vencimento), categoria:categoria_id(nome)',
          order: [{ col: 'data', asc: false }, { col: 'updated_at', asc: false }],
        },
      )
    } catch (error) {
      logErro('TransacaoService.listarPorMes', error)
      if (error.message?.startsWith('Mês') || error.message?.startsWith('userId')) throw error
      throw new Error('Erro ao buscar transações do mês.')
    }
  },

  async obterPorId(id) {
    try {
      uuid(id, { campo: 'id' })
      const rows = await ApiClient.select(
        'transacao',
        [['eq', 'id', id], ['is', 'deletado_em', null]],
        {
          select: 'id, valor, data, descricao, tipo, modalidade, numero_parcelas, parcela_atual, mes_vencimento_fatura, cartao_id, categoria_id, transacao_original_id, cartao:cartao_id(nome, dia_vencimento), categoria:categoria_id(nome)',
          limit: 1,
        },
      )
      return rows?.[0] ?? null
    } catch (error) {
      logErro('TransacaoService.obterPorId', error)
      throw new Error('Erro ao buscar transação.')
    }
  },

  async salvar({ userId, tipo, valor, data, descricao, modalidade, categoriaId = null, cartaoId = null, numeroParcelas = 1, cartaoDiaVencimento = null }) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!TIPOS.has(tipo)) throw new Error('Tipo inválido.')
      if (!MODALIDADES.has(modalidade)) throw new Error('Modalidade inválida.')
      const valorNum = round2(numeroFinito(valor, { campo: 'Valor', min: 0.01, max: 999999999 }))
      const dataNorm = textoNaoVazio(data, { campo: 'Data', min: 10, max: 10 })
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNorm)) throw new Error('Data inválida.')
      const descNorm = textoNaoVazio(descricao, { campo: 'Descrição', min: 1, max: 200 })
      if (categoriaId) uuid(categoriaId, { campo: 'categoriaId' })

      // Validação de crédito + parcelas
      let parcelas = 1
      if (modalidade === 'credito') {
        if (!cartaoId) throw new Error('Cartão é obrigatório para crédito.')
        uuid(cartaoId, { campo: 'cartaoId' })
        parcelas = inteiroPositivo(numeroParcelas ?? 1, { campo: 'Parcelas', min: 1, max: 24 })
        if (!cartaoDiaVencimento) throw new Error('Dia de vencimento do cartão é obrigatório.')
      }

      // Saída sem parcelamento (débito, dinheiro, crédito à vista)
      if (parcelas === 1) {
        const linha = {
          usuario_id: userId,
          tipo,
          valor: valorNum,
          data: dataNorm,
          descricao: descNorm,
          modalidade,
          categoria_id: categoriaId,
          cartao_id: modalidade === 'credito' ? cartaoId : null,
          numero_parcelas: null,
          parcela_atual: null,
          mes_vencimento_fatura: modalidade === 'credito'
            ? dataISO(calcularMesFatura(dataNorm, cartaoDiaVencimento))
            : null,
        }
        return await ApiClient.insert('transacao', linha)
      }

      // Crédito parcelado: gera N rows. A 1ª referencia a si mesma após insert.
      const valorParcela = round2(valorNum / parcelas)
      const somaPrimeiras = round2(valorParcela * (parcelas - 1))
      const valorUltima = round2(valorNum - somaPrimeiras)

      const primeira = {
        usuario_id: userId,
        tipo,
        valor: valorParcela,
        data: dataNorm,
        descricao: descNorm,
        modalidade,
        categoria_id: categoriaId,
        cartao_id: cartaoId,
        numero_parcelas: parcelas,
        parcela_atual: 1,
        mes_vencimento_fatura: dataISO(calcularMesFatura(dataNorm, cartaoDiaVencimento)),
        transacao_original_id: null,
      }
      const original = await ApiClient.insert('transacao', primeira)

      // Gera linhas 2..N usando transacao_original_id = id da primeira
      const demais = []
      for (let k = 2; k <= parcelas; k++) {
        const dataParcela = dataISO(somarMeses(dataNorm, k - 1))
        demais.push({
          usuario_id: userId,
          tipo,
          valor: k === parcelas ? valorUltima : valorParcela,
          data: dataParcela,
          descricao: descNorm,
          modalidade,
          categoria_id: categoriaId,
          cartao_id: cartaoId,
          numero_parcelas: parcelas,
          parcela_atual: k,
          mes_vencimento_fatura: dataISO(calcularMesFatura(dataParcela, cartaoDiaVencimento)),
          transacao_original_id: original.id,
        })
      }
      if (demais.length > 0) await ApiClient.insert('transacao', demais)

      return original
    } catch (error) {
      logErro('TransacaoService.salvar', error)
      if (error.code === '23505') throw new Error('Já existe transação igual.')
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42703') throw new Error('Banco desatualizado. Rode as migrations pendentes.')
      if (error.code === '23503') throw new Error('Referência inválida (cartão ou categoria).')
      if (error.code === '23502') throw new Error('Campo obrigatório faltando.')
      if (error.message?.startsWith('Tempo de espera')) throw error
      if (error.message?.match(/^(Tipo|Modalidade|Valor|Data|Descrição|Cartão|Dia|Parcelas|categoriaId|cartaoId|userId)/)) throw error
      throw new Error('Erro ao salvar transação.')
    }
  },

  async excluir(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.rpc('deletar_transacao', { p_id: id })
    } catch (error) {
      logErro('TransacaoService.excluir', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      throw new Error('Erro ao excluir transação.')
    }
  },

  async getFatura(cartaoId, mesVencimento) {
    try {
      uuid(cartaoId, { campo: 'cartaoId' })
      // mesVencimento aceita Date ou 'YYYY-MM-DD'. RPC espera DATE.
      const iso = mesVencimento instanceof Date
        ? mesVencimento.toISOString().slice(0, 10)
        : String(mesVencimento)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        throw new Error('Mês de vencimento inválido.')
      }
      const linhas = await ApiClient.rpc('fatura_cartao', {
        p_cartao_id:      cartaoId,
        p_mes_vencimento: iso,
      })
      const total = linhas?.[0]?.total_fatura ?? 0
      const itens = (linhas ?? []).map(l => ({
        id:             l.id,
        data:           l.data,
        descricao:      l.descricao,
        valor:          Number(l.valor),
        parcelaAtual:   l.parcela_atual,
        numeroParcelas: l.numero_parcelas,
        categoriaNome:  l.categoria_nome,
      }))
      return { itens, total: Number(total) }
    } catch (error) {
      logErro('TransacaoService.getFatura', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42883') throw new Error('Banco desatualizado. Rode 4_3_fatura_cartao.sql.')
      if (error.message?.startsWith('Mês') || error.message?.startsWith('cartaoId')) throw error
      throw new Error('Erro ao buscar fatura.')
    }
  },

  async getGastoCategoriaMes(userId, categoriaId, anoMes) {
    try {
      uuid(userId, { campo: 'userId' })
      uuid(categoriaId, { campo: 'categoriaId' })
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(anoMes))) {
        throw new Error('Mês inválido (use YYYY-MM).')
      }
      const total = await ApiClient.rpc('gasto_categoria_mes', {
        p_usuario_id:   userId,
        p_categoria_id: categoriaId,
        p_ano_mes:      anoMes,
      })
      return Number(total ?? 0)
    } catch (error) {
      logErro('TransacaoService.getGastoCategoriaMes', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42883') throw new Error('Banco desatualizado. Rode 4_4a_gasto_categoria.sql.')
      if (error.message?.startsWith('Mês') || error.message?.match(/^(userId|categoriaId)/)) throw error
      throw new Error('Erro ao buscar gasto da categoria.')
    }
  },

  async getResumoMes(userId, anoMes) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(anoMes))) {
        throw new Error('Mês inválido (use YYYY-MM).')
      }
      const linhas = await ApiClient.rpc('resumo_financeiro_mes', {
        p_usuario_id: userId,
        p_ano_mes:    anoMes,
      })
      const r = linhas?.[0] ?? null
      return r ? {
        entradas:         Number(r.entradas ?? 0),
        saidasDebito:     Number(r.saidas_debito ?? 0),
        saidasCredito:    Number(r.saidas_credito ?? 0),
        saidasDinheiro:   Number(r.saidas_dinheiro ?? 0),
        saldo:            Number(r.saldo ?? 0),
      } : {
        entradas: 0, saidasDebito: 0, saidasCredito: 0, saidasDinheiro: 0, saldo: 0,
      }
    } catch (error) {
      logErro('TransacaoService.getResumoMes', error)
      if (error.code === '42501') throw new Error('Sem permissão. Sua sessão pode ter expirado.')
      if (error.code === '42883') throw new Error('Banco desatualizado. Rode 4_2_resumo_financeiro_mes.sql.')
      if (error.message?.startsWith('Mês') || error.message?.startsWith('userId')) throw error
      throw new Error('Erro ao buscar resumo do mês.')
    }
  },
}

export default TransacaoService
