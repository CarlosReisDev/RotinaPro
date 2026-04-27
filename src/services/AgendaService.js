import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { textoNaoVazio, uuid } from '../utils/validators'

export const DIAS_SEMANA = [
  { valor: 'seg', label: 'Segunda' },
  { valor: 'ter', label: 'Terça'   },
  { valor: 'qua', label: 'Quarta'  },
  { valor: 'qui', label: 'Quinta'  },
  { valor: 'sex', label: 'Sexta'   },
  { valor: 'sab', label: 'Sábado'  },
  { valor: 'dom', label: 'Domingo' },
]

const VALIDOS = new Set(DIAS_SEMANA.map(d => d.valor))
const ATIVIDADE_TIPOS = ['natacao', 'corrida', 'caminhada', 'ciclismo', 'funcional', 'outras']
const TIPOS_VALIDOS = new Set(ATIVIDADE_TIPOS)

export const ATIVIDADES_LIVRES = [
  { valor: 'natacao', label: 'Natação' },
  { valor: 'corrida', label: 'Corrida' },
  { valor: 'caminhada', label: 'Caminhada' },
  { valor: 'ciclismo', label: 'Ciclismo' },
  { valor: 'funcional', label: 'Funcional' },
  { valor: 'outras', label: 'Outras' },
]

function normalizarAtividadeLivre(atividadeLivre) {
  if (!atividadeLivre || typeof atividadeLivre !== 'object') {
    throw new Error('Atividade livre inválida.')
  }
  const tipo = atividadeLivre.tipo
  if (!TIPOS_VALIDOS.has(tipo)) throw new Error('Tipo de atividade inválido.')

  if (tipo === 'outras') {
    const nome = textoNaoVazio(atividadeLivre.nome, { min: 2, max: 60, campo: 'Atividade' })
    return { tipo, nome }
  }

  return { tipo, nome: null }
}

function anexarAtividadeLivreDoBanco(agenda = []) {
  return agenda.map(item => {
    const tipo = item?.tipo_atividade_livre
    if (!tipo) return item
    const nome = item?.nome_atividade_livre
      || ATIVIDADES_LIVRES.find(a => a.valor === tipo)?.label
      || 'Atividade livre'

    return {
      ...item,
      atividade_livre: { tipo, nome },
    }
  })
}

const AgendaService = {
  async listar(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      const agenda = await ApiClient.select(
        'agenda_treino',
        { usuario_id: userId },
        { select: '*, template_treino(id, nome)' },
      )
      return anexarAtividadeLivreDoBanco(agenda)
    } catch (error) {
      logErro('AgendaService.listar', error)
      throw new Error('Erro ao buscar agenda.')
    }
  },

  async salvarDia({ userId, diaSemana, templateId = null, descanso = false, atividadeLivre = null }) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!VALIDOS.has(diaSemana)) throw new Error('Dia da semana inválido.')
      if (templateId && atividadeLivre) throw new Error('Escolha template ou atividade livre, não ambos.')
      if (templateId) uuid(templateId, { campo: 'templateId' })
      const atividadeNormalizada = atividadeLivre ? normalizarAtividadeLivre(atividadeLivre) : null
      if (!descanso && !templateId && !atividadeNormalizada) {
        throw new Error('Selecione um template, atividade livre ou marque como descanso.')
      }

      const agenda = await ApiClient.upsert(
        'agenda_treino',
        {
          usuario_id:         userId,
          dia_semana:         diaSemana,
          template_treino_id: descanso || atividadeNormalizada ? null : templateId,
          descanso,
          tipo_atividade_livre: atividadeNormalizada?.tipo ?? null,
          nome_atividade_livre: atividadeNormalizada?.nome ?? null,
        },
        { onConflict: 'usuario_id,dia_semana' },
      )

      return atividadeNormalizada ? { ...agenda, atividade_livre: atividadeNormalizada } : agenda
    } catch (error) {
      logErro('AgendaService.salvarDia', error)
      if (error.code === '42703') {
        throw new Error('Banco desatualizado para atividade livre na agenda. Execute a migração SQL da agenda.')
      }
      if (error.message?.match(/^(Dia|Selecione|Tipo|Atividade|Escolha)/)) throw error
      throw new Error('Erro ao salvar agenda.')
    }
  },

  async removerDia(userId, diaSemana) {
    try {
      uuid(userId, { campo: 'userId' })
      if (!VALIDOS.has(diaSemana)) throw new Error('Dia da semana inválido.')
      await ApiClient.delete('agenda_treino', [
        ['eq', 'usuario_id', userId],
        ['eq', 'dia_semana', diaSemana],
      ])
    } catch (error) {
      logErro('AgendaService.removerDia', error)
      throw new Error('Erro ao remover agendamento.')
    }
  },
}

export default AgendaService
