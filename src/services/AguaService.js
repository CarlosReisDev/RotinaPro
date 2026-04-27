import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, inteiroPositivo } from '../utils/validators'

const AguaService = {
  async registrar(userId, quantidadeMl) {
    try {
      uuid(userId, { campo: 'userId' })
      const qtd = inteiroPositivo(quantidadeMl, { campo: 'Quantidade', min: 1, max: 5000 })
      return await ApiClient.insert('registro_agua', {
        usuario_id: userId,
        quantidade_ml: qtd,
      })
    } catch (error) {
      logErro('AguaService.registrar', error)
      if (error.message?.startsWith('Quantidade')) throw error
      throw new Error('Erro ao registrar água.')
    }
  },
}

export default AguaService
