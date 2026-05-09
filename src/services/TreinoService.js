import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio, inteiroPositivo, numeroFinito, uuid } from '../utils/validators'

const SISTEMA_UUID = '00000000-0000-0000-0000-000000000000'

const TreinoService = {
  // ─── Templates ──────────────────────────────────────────────

  async listarTemplates(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'template_treino',
        [['or', `usuario_id.eq.${userId},predefinido.eq.true`]],
        {
          select: '*, exercicio_template(count)',
          order: [
            { col: 'predefinido', asc: true },
            { col: 'criado_em',   asc: false },
          ],
        },
      )
    } catch (error) {
      logErro('TreinoService.listarTemplates', error)
      throw new Error('Erro ao buscar templates.')
    }
  },

  async criarTemplate(userId, nome) {
    try {
      uuid(userId, { campo: 'userId' })
      const nomeValido = textoNaoVazio(nome, { min: 2, max: 60, campo: 'Nome do template' })
      return await ApiClient.insert('template_treino', { usuario_id: userId, nome: nomeValido })
    } catch (error) {
      logErro('TreinoService.criarTemplate', error)
      throw new Error(error.message?.startsWith('Nome') ? error.message : 'Erro ao criar template.')
    }
  },

  async atualizarTemplate(id, nome) {
    try {
      uuid(id, { campo: 'id' })
      const nomeValido = textoNaoVazio(nome, { min: 2, max: 60, campo: 'Nome do template' })
      return await ApiClient.update('template_treino', id, { nome: nomeValido })
    } catch (error) {
      logErro('TreinoService.atualizarTemplate', error)
      throw new Error(error.message?.startsWith('Nome') ? error.message : 'Erro ao atualizar template.')
    }
  },

  async deletarTemplate(id) {
    try {
      uuid(id, { campo: 'id' })
      await ApiClient.delete('template_treino', id)
    } catch (error) {
      logErro('TreinoService.deletarTemplate', error)
      if (error.code === '42501') throw new Error('Template protegido pelo sistema. Não pode ser excluído.')
      throw new Error('Erro ao deletar template.')
    }
  },

  // ─── Exercícios ──────────────────────────────────────────────

  async listarExercicios(templateId) {
    try {
      uuid(templateId, { campo: 'templateId' })
      return await ApiClient.select(
        'exercicio_template',
        { template_treino_id: templateId },
        { order: { col: 'ordem', asc: true } },
      )
    } catch (error) {
      logErro('TreinoService.listarExercicios', error)
      throw new Error('Erro ao buscar exercícios.')
    }
  },

  async salvarExercicios(templateId, exercicios) {
    try {
      uuid(templateId, { campo: 'templateId' })
      if (!Array.isArray(exercicios)) throw new Error('Lista de exercícios inválida.')

      const normalizados = exercicios.map((ex, i) => ({
        template_treino_id:      templateId,
        nome:                    textoNaoVazio(ex.nome, { min: 1, max: 80, campo: `Exercício ${i + 1}` }),
        ordem:                   i + 1,
        series:                  inteiroPositivo(ex.series,     { campo: `Séries (exercício ${i + 1})`, min: 1, max: 20 }),
        repeticoes:              inteiroPositivo(ex.repeticoes, { campo: `Reps (exercício ${i + 1})`,   min: 1, max: 200 }),
        carga_inicial_kg:        numeroFinito(ex.carga_inicial_kg,        { campo: `Carga (exercício ${i + 1})`,    min: 0, max: 1000, permitirNulo: true }),
        tempo_descanso_segundos: numeroFinito(ex.tempo_descanso_segundos, { campo: `Descanso (exercício ${i + 1})`, min: 0, max: 3600, permitirNulo: true }),
      }))

      // Deleta todos e reinicia — mais simples que diff individual para mobile
      await ApiClient.delete('exercicio_template', { template_treino_id: templateId })
      if (normalizados.length === 0) return []
      return await ApiClient.insert('exercicio_template', normalizados)
    } catch (error) {
      logErro('TreinoService.salvarExercicios', error)
      if (error.message?.match(/^(Nome|Séries|Reps|Carga|Descanso|Exercício)/)) throw error
      throw new Error('Erro ao salvar exercícios.')
    }
  },

  isPredefinido: (template) => template.predefinido || template.usuario_id === SISTEMA_UUID,

  // ─── Configuração de progressão ──────────────────────────────

  async getConfigProgressao(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const data = await ApiClient.select('configuracao_progressao', { usuario_id: userId }, { limit: 1 })
      return data?.[0] ?? null
    } catch (error) {
      logErro('TreinoService.getConfigProgressao', error)
      throw new Error('Erro ao buscar configuração de progressão.')
    }
  },

  async sugerirProgressao(userId, exercicioNome, templateId) {
    try {
      uuid(userId, { campo: 'userId' })
      uuid(templateId, { campo: 'templateId' })
      textoNaoVazio(exercicioNome, { campo: 'Nome do exercício', max: 100 })
      const data = await ApiClient.rpc('sugerir_progressao', {
        p_usuario_id: userId,
        p_exercicio_nome: exercicioNome,
        p_template_treino_id: templateId,
      })
      return data?.[0] ?? null
    } catch (error) {
      logErro('TreinoService.sugerirProgressao', error)
      throw new Error('Erro ao buscar sugestão de progressão.')
    }
  },

  async salvarConfigProgressao(userId, cfg) {
    try {
      uuid(userId, { campo: 'userId' })
      const sessoes = inteiroPositivo(cfg.sessoes_para_sugerir, { campo: 'Sessões para sugerir', min: 1, max: 20 })
      const tipos = ['carga', 'repeticoes', 'series']
      if (!tipos.includes(cfg.tipo_progressao)) throw new Error('Tipo de progressão inválido.')
      const incrementoCarga = numeroFinito(cfg.incremento_carga, { campo: 'Incremento de carga', min: 0.5, max: 50 })
      const incrementoReps  = inteiroPositivo(cfg.incremento_repeticoes, { campo: 'Incremento de repetições', min: 1, max: 10 })
      return await ApiClient.upsert('configuracao_progressao', {
        usuario_id: userId,
        sessoes_para_sugerir: sessoes,
        tipo_progressao: cfg.tipo_progressao,
        incremento_carga: incrementoCarga,
        incremento_repeticoes: incrementoReps,
      }, { onConflict: 'usuario_id' })
    } catch (error) {
      logErro('TreinoService.salvarConfigProgressao', error)
      if (error.message?.match(/^(Sessões|Incremento|Tipo)/)) throw error
      throw new Error('Erro ao salvar configuração de progressão.')
    }
  },
}

export default TreinoService
