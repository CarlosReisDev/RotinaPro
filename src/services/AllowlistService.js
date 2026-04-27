import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio } from '../utils/validators'

const AllowlistService = {
  async emailPermitido(email) {
    try {
      const limpo = textoNaoVazio(email, { min: 3, max: 254, campo: 'Email' })
      return await ApiClient.rpc('is_email_permitido', { p_email: limpo })
    } catch (error) {
      logErro('AllowlistService.emailPermitido', error)
      throw new Error('Não foi possível verificar autorização.')
    }
  },
}

export default AllowlistService
