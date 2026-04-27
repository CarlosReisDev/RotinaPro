import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio, numeroFinito, uuid } from '../utils/validators'

const PratoFixoService = {
  // Retorna pratos do usuário com ingredientes aninhados (ordenados por ordem).
  async listar(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const data = await ApiClient.select(
        'prato_fixo',
        { usuario_id: userId },
        {
          select: 'id, nome, calorias_kcal, proteina_g, carboidrato_g, gordura_g, updated_at, prato_fixo_alimento(id, alimento_id, alimento_nome, qtd_g, calorias, proteina_g, carboidrato_g, gordura_g, ordem)',
          order: { col: 'nome', asc: true },
        },
      )
      return (data ?? []).map(p => ({
        ...p,
        prato_fixo_alimento: (p.prato_fixo_alimento ?? []).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
      }))
    } catch (error) {
      logErro('PratoFixoService.listar', error)
      throw new Error('Erro ao buscar pratos fixos.')
    }
  },

  // Cria ou atualiza um prato via RPC autoritativa.
  // Modo ingredientes: { userId, nome, itens: [{alimento_id, qtd_g}], id? }
  // Modo manual:       { userId, nome, calorias_kcal, proteina_g, carboidrato_g, gordura_g, id? }
  async salvar({ userId, nome, itens = null, calorias_kcal, proteina_g, carboidrato_g, gordura_g, id = null }) {
    try {
      uuid(userId, { campo: 'userId' })
      const nomeNorm = textoNaoVazio(nome, { min: 1, max: 100, campo: 'Nome do prato' })
      if (id) uuid(id, { campo: 'id' })

      const usarItens = Array.isArray(itens) && itens.length > 0

      let itensNorm = null
      if (usarItens) {
        if (itens.length > 50) throw new Error('Máximo 50 ingredientes por prato.')
        itensNorm = itens.map((it, i) => {
          uuid(it.alimento_id, { campo: `Alimento ${i + 1}` })
          const qtd = numeroFinito(it.qtd_g, { campo: `Quantidade do alimento ${i + 1}`, min: 0.1, max: 5000 })
          return { alimento_id: it.alimento_id, qtd_g: qtd }
        })
      }

      const resultado = await ApiClient.rpc('salvar_prato_fixo', {
        p_usuario_id:    userId,
        p_nome:          nomeNorm,
        p_itens:         itensNorm,
        p_calorias_kcal: usarItens ? null : numeroFinito(calorias_kcal ?? 0, { campo: 'Calorias',    min: 0, max: 5000 }),
        p_proteina_g:    usarItens ? null : numeroFinito(proteina_g    ?? 0, { campo: 'Proteína',    min: 0, max: 500  }),
        p_carboidrato_g: usarItens ? null : numeroFinito(carboidrato_g ?? 0, { campo: 'Carboidrato', min: 0, max: 1000 }),
        p_gordura_g:     usarItens ? null : numeroFinito(gordura_g     ?? 0, { campo: 'Gordura',     min: 0, max: 500  }),
        p_id:            id,
      })
      return resultado?.[0] ?? null
    } catch (error) {
      logErro('PratoFixoService.salvar', error)
      if (error.message?.match(/^(Nome|Calorias|Proteína|Carboidrato|Gordura|Máximo|Alimento|Quantidade)/)) throw error
      throw new Error('Erro ao salvar prato fixo.')
    }
  },

  async deletar(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('prato_fixo', id)
    } catch (error) {
      logErro('PratoFixoService.deletar', error)
      throw new Error('Erro ao deletar prato fixo.')
    }
  },
}

export default PratoFixoService
