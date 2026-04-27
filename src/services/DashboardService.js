import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { uuid, numeroFinito, inteiroPositivo } from '../utils/validators'

const LABEL_ATIVIDADE_LIVRE = {
  natacao: 'Natação',
  corrida: 'Corrida',
  caminhada: 'Caminhada',
  ciclismo: 'Ciclismo',
  funcional: 'Funcional',
  outras: 'Atividade livre',
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

const DashboardService = {
  async getResumoDiario(data) {
    try {
      const resultado = await ApiClient.rpc('get_resumo_diario', { p_data: data })
      return resultado?.[0] ?? null
    } catch (error) {
      logErro('DashboardService.getResumoDiario', error)
      throw new Error('Erro ao buscar resumo do dia.')
    }
  },

  async getTreinoDoDia(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const diaSemana = DIAS_SEMANA[new Date().getDay()]
      const data = await ApiClient.select(
        'agenda_treino',
        { usuario_id: userId, dia_semana: diaSemana },
        { select: '*, template_treino(nome)' },
      )
      const treino = data?.[0] ?? null
      if (!treino) return null

      if (treino.tipo_atividade_livre) {
        return {
          ...treino,
          atividade_livre: {
            tipo: treino.tipo_atividade_livre,
            nome: treino.nome_atividade_livre || LABEL_ATIVIDADE_LIVRE[treino.tipo_atividade_livre] || 'Atividade livre',
          },
        }
      }

      return treino
    } catch (error) {
      logErro('DashboardService.getTreinoDoDia', error)
      throw new Error('Erro ao buscar treino do dia.')
    }
  },

  async getPrimeiraSessaoDoDia(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const hoje = new Date().toISOString().split('T')[0]
      const data = await ApiClient.select(
        'sessao_treino',
        [
          ['eq', 'usuario_id', userId],
          ['eq', 'data', hoje],
          ['eq', 'concluida', true],
        ],
        {
          select: 'tipo, intensidade, duracao_minutos, calorias_gastas_estimadas, calorias_gastas_manual, atividade_met(nome), template_treino(nome)',
          order: { col: 'criado_em', asc: true },
          limit: 1,
        },
      )
      return data?.[0] ?? null
    } catch (error) {
      logErro('DashboardService.getPrimeiraSessaoDoDia', error)
      throw new Error('Erro ao buscar sessão do dia.')
    }
  },

  async getSaldoMes(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
      const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]

      const data = await ApiClient.select(
        'transacao',
        [
          ['eq',  'usuario_id',   userId],
          ['is',  'deletado_em',  null],
          ['gte', 'data',         inicio],
          ['lte', 'data',         fim],
        ],
        { select: 'valor, tipo, modalidade' },
      )

      const somar = filtro => data.filter(filtro).reduce((s, t) => s + Number(t.valor), 0)
      const entradas = somar(t => t.tipo === 'entrada')
      const gastos   = somar(t => t.tipo === 'saida' && t.modalidade !== 'credito')
      const credito  = somar(t => t.tipo === 'saida' && t.modalidade === 'credito')
      return { entradas, gastos, credito, saldo: entradas - gastos - credito }
    } catch (error) {
      logErro('DashboardService.getSaldoMes', error)
      throw new Error('Erro ao buscar saldo do mês.')
    }
  },

  async atualizarMeta(userId, configId, { metaCalorica, metaVariavel, metaTreino, metaDescanso, metaAgua, metaProteina, metaCarbo, metaGordura }) {
    try {
      uuid(userId,   { campo: 'userId' })
      uuid(configId, { campo: 'configId' })
      await ApiClient.update('configuracao_dieta', configId, {
        meta_calorica_diaria:   numeroFinito(metaCalorica, { campo: 'Meta calórica', min: 500, max: 8000 }),
        meta_proteina_g:        numeroFinito(metaProteina, { campo: 'Meta proteína',    min: 0, max: 600 }),
        meta_carboidrato_g:     numeroFinito(metaCarbo,    { campo: 'Meta carboidrato', min: 0, max: 1000 }),
        meta_gordura_g:         numeroFinito(metaGordura,  { campo: 'Meta gordura',     min: 0, max: 400 }),
        meta_agua_ml:           inteiroPositivo(metaAgua,  { campo: 'Meta de água',  min: 500, max: 6000 }),
        meta_variavel:          !!metaVariavel,
        meta_calorica_treino:   metaVariavel ? numeroFinito(metaTreino,   { campo: 'Meta treino',   min: 500, max: 8000 }) : null,
        meta_calorica_descanso: metaVariavel ? numeroFinito(metaDescanso, { campo: 'Meta descanso', min: 500, max: 8000 }) : null,
      })
    } catch (error) {
      logErro('DashboardService.atualizarMeta', error)
      if (error.message?.match(/^(Meta|userId|configId)/)) throw error
      throw new Error('Erro ao salvar configurações.')
    }
  },

  async getMetaAtual(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const data = await ApiClient.select(
        'configuracao_dieta',
        { usuario_id: userId },
        { order: { col: 'vigente_desde', asc: false }, limit: 1 },
      )
      return data?.[0] ?? null
    } catch (error) {
      logErro('DashboardService.getMetaAtual', error)
      throw new Error('Erro ao buscar meta de calorias.')
    }
  },
}

export default DashboardService
