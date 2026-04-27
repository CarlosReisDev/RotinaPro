import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, textoNaoVazio, numeroFinito, inteiroPositivo } from '../utils/validators'

const PerfilService = {
  async obterPorId(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const dados = await ApiClient.select('usuario', { id: userId })
      return dados?.[0] ?? null
    } catch (error) {
      logErro('PerfilService.obterPorId', error)
      throw new Error('Erro ao carregar perfil.')
    }
  },

  async calcularMeta({ peso, altura, idade, sexo, nivelAtividade, objetivo }) {
    try {
      const resultado = await ApiClient.rpc('calcular_meta_calorica', {
        p_peso:             numeroFinito(peso,   { campo: 'Peso',    min: 20,  max: 400 }),
        p_altura:           numeroFinito(altura, { campo: 'Altura',  min: 80,  max: 260 }),
        p_idade:            inteiroPositivo(idade, { campo: 'Idade', min: 10,  max: 120 }),
        p_sexo:             sexo,
        p_nivel_atividade:  nivelAtividade,
        p_objetivo:         objetivo,
      })
      return resultado[0]
    } catch (error) {
      logErro('PerfilService.calcularMeta', error)
      throw new Error(error.message?.match(/^(Peso|Altura|Idade)/) ? error.message : 'Erro ao calcular meta calórica.')
    }
  },

  async salvarPerfil({ userId, email, nome, sexo, dataNascimento, alturaCm, pesoKg, objetivo, nivelAtividade, diasTreinoSemana, meta }) {
    try {
      uuid(userId, { campo: 'userId' })
      const usuario = await ApiClient.insert('usuario', {
        id:                 userId,
        email,
        nome:               textoNaoVazio(nome, { min: 2, max: 80, campo: 'Nome' }),
        sexo,
        data_nascimento:    dataNascimento,
        altura_cm:          numeroFinito(alturaCm, { campo: 'Altura', min: 80, max: 260 }),
        peso_kg:            numeroFinito(pesoKg,   { campo: 'Peso',   min: 20, max: 400 }),
        objetivo,
        nivel_atividade:    nivelAtividade,
        dias_treino_semana: inteiroPositivo(diasTreinoSemana, { campo: 'Dias de treino', min: 1, max: 7 }),
      })

      await ApiClient.insert('configuracao_dieta', {
        usuario_id:           userId,
        meta_calorica_diaria: numeroFinito(meta.meta_calorica,      { campo: 'Meta calórica',   min: 800, max: 8000 }),
        meta_proteina_g:      numeroFinito(meta.meta_proteina_g,    { campo: 'Meta proteína',   min: 0,   max: 600 }),
        meta_carboidrato_g:   numeroFinito(meta.meta_carboidrato_g, { campo: 'Meta carboidrato', min: 0,  max: 1000 }),
        meta_gordura_g:       numeroFinito(meta.meta_gordura_g,     { campo: 'Meta gordura',    min: 0,   max: 400 }),
        meta_agua_ml:         Math.round(numeroFinito(pesoKg, { campo: 'Peso', min: 20, max: 400 }) * 35),
      })

      return usuario
    } catch (error) {
      logErro('PerfilService.salvarPerfil', error)
      if (error.code === '23505') throw new Error('Perfil já cadastrado.')
      if (error.message?.match(/^(Nome|Altura|Peso|Dias|Meta)/)) throw error
      throw new Error('Erro ao salvar perfil. Tente novamente.')
    }
  },
}

export default PerfilService
