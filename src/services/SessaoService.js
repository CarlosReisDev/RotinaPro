import ApiClient from '../api/client'
import { logErro } from '../utils/logger'
import { inteiroPositivo, numeroFinito, textoNaoVazio, uuid } from '../utils/validators'

function hojeISO() {
  return new Date().toISOString().split('T')[0]
}

const SessaoService = {
  async listarAtividadesMet() {
    try {
      const atividades = await ApiClient.select(
        'atividade_met',
        null,
        { order: { col: 'nome', asc: true } },
      )
      return atividades.filter(a => !String(a.nome).toLowerCase().includes('muscula'))
    } catch (error) {
      logErro('SessaoService.listarAtividadesMet', error)
      throw new Error('Erro ao buscar atividades.')
    }
  },

  async obterSessaoEmAndamento(userId) {
    try {
      uuid(userId, { campo: 'userId' })

      const sessoes = await ApiClient.select(
        'sessao_treino',
        [
          ['eq', 'usuario_id', userId],
          ['eq', 'concluida', false],
        ],
        {
          select: '*, atividade_met(id, nome, met), template_treino(id, nome)',
          order: { col: 'criado_em', asc: false },
          limit: 1,
        },
      )

      return sessoes?.[0] ?? null
    } catch (error) {
      logErro('SessaoService.obterSessaoEmAndamento', error)
      throw new Error('Erro ao buscar sessão em andamento.')
    }
  },

  async iniciarAtividadeLivre({ userId, atividadeMetId, duracaoMinutos, observacao = null, intensidade = 'moderado' }) {
    try {
      uuid(userId, { campo: 'userId' })
      uuid(atividadeMetId, { campo: 'atividadeMetId' })

      if (!['leve', 'moderado', 'intenso'].includes(intensidade)) {
        throw new Error('Intensidade inválida.')
      }

      const duracao = inteiroPositivo(duracaoMinutos, {
        campo: 'Duração',
        min: 5,
        max: 720,
      })

      const observacaoNormalizada = observacao?.trim()
        ? textoNaoVazio(observacao, { campo: 'Observação', min: 2, max: 500 })
        : null

      const usuario = await ApiClient.select('usuario', { id: userId }, { select: 'id, peso_kg' })
      const peso = usuario?.[0]?.peso_kg
      if (!peso) throw new Error('Peso do usuário não encontrado para cálculo de calorias.')

      // MET por intensidade resolvido no backend — evita lógica de cálculo no frontend
      const caloriasEstimadas = await ApiClient.rpc('calcular_calorias_atividade', {
        p_atividade_met_id: atividadeMetId,
        p_intensidade: intensidade,
        p_peso_kg: peso,
        p_duracao_minutos: duracao,
      })

      return await ApiClient.insert('sessao_treino', {
        usuario_id: userId,
        atividade_met_id: atividadeMetId,
        data: hojeISO(),
        tipo: 'atividadeLivre',
        intensidade,
        duracao_minutos: duracao,
        observacao: observacaoNormalizada,
        calorias_gastas_estimadas: caloriasEstimadas,
        concluida: false,
      })
    } catch (error) {
      logErro('SessaoService.iniciarAtividadeLivre', error)
      if (error.message?.match(/^(Duração|Observação|Intensidade|Peso|userId|atividadeMetId)/)) throw error
      throw new Error('Erro ao iniciar atividade livre.')
    }
  },

  async listarSessoesDoDia(userId) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'sessao_treino',
        [
          ['eq', 'usuario_id', userId],
          ['eq', 'data', hojeISO()],
          ['eq', 'concluida', true],
        ],
        {
          select: 'id, tipo, intensidade, duracao_minutos, calorias_gastas_estimadas, calorias_gastas_manual, atividade_met_id, atividade_met(nome), template_treino(nome)',
          order: { col: 'criado_em', asc: true },
        },
      )
    } catch (error) {
      logErro('SessaoService.listarSessoesDoDia', error)
      throw new Error('Erro ao buscar sessões do dia.')
    }
  },

  async listarHistorico(userId, { limit = 20, offset = 0 } = {}) {
    try {
      uuid(userId, { campo: 'userId' })
      return await ApiClient.select(
        'sessao_treino',
        [
          ['eq', 'usuario_id', userId],
          ['eq', 'concluida', true],
        ],
        {
          select: 'id, data, tipo, intensidade, duracao_minutos, calorias_gastas_estimadas, calorias_gastas_manual, atividade_met(nome), template_treino(nome)',
          order: [{ col: 'data', asc: false }, { col: 'criado_em', asc: false }],
          limit,
          offset,
        },
      )
    } catch (error) {
      logErro('SessaoService.listarHistorico', error)
      throw new Error('Erro ao buscar histórico.')
    }
  },

  async obterDetalheSessao(sessaoId) {
    try {
      uuid(sessaoId, { campo: 'sessaoId' })
      const sessoes = await ApiClient.select(
        'sessao_treino',
        { id: sessaoId },
        {
          select: '*, atividade_met(nome, met), template_treino(nome), exercicio_realizado(id, nome, ordem, substituido, serie_realizada(numero_serie, repeticoes, carga_kg))',
          limit: 1,
        },
      )
      const sessao = sessoes?.[0]
      if (!sessao) return null

      // Ordena exercícios por ordem e séries por numero_serie
      sessao.exercicio_realizado = (sessao.exercicio_realizado ?? [])
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map(ex => ({
          ...ex,
          serie_realizada: (ex.serie_realizada ?? []).slice().sort((a, b) => a.numero_serie - b.numero_serie),
        }))

      return sessao
    } catch (error) {
      logErro('SessaoService.obterDetalheSessao', error)
      throw new Error('Erro ao buscar detalhes da sessão.')
    }
  },

  async iniciarSessaoTemplate({ userId, templateId }) {
    try {
      uuid(userId, { campo: 'userId' })
      uuid(templateId, { campo: 'templateId' })

      // duracao_minutos é NOT NULL — placeholder mínimo, atualizado em concluirSessaoMusculacao.
      return await ApiClient.insert('sessao_treino', {
        usuario_id: userId,
        template_treino_id: templateId,
        data: hojeISO(),
        tipo: 'musculacao',
        duracao_minutos: 1,
        concluida: false,
      })
    } catch (error) {
      logErro('SessaoService.iniciarSessaoTemplate', error)
      if (error.message?.match(/^(userId|templateId)/)) throw error
      throw new Error('Erro ao iniciar sessão de musculação.')
    }
  },

  async concluirSessaoMusculacao({ sessaoId, duracaoMinutos, observacao = null, caloriasManual = null, exerciciosRealizados = [] }) {
    try {
      uuid(sessaoId, { campo: 'sessaoId' })

      const duracao = inteiroPositivo(duracaoMinutos, { campo: 'Duração', min: 1, max: 720 })

      const observacaoNormalizada = observacao?.trim()
        ? textoNaoVazio(observacao, { campo: 'Observação', min: 2, max: 500 })
        : null

      const caloriasManualNorm = (caloriasManual === null || caloriasManual === undefined || caloriasManual === '')
        ? null
        : numeroFinito(caloriasManual, { campo: 'Calorias manuais', min: 0, max: 5000 })

      if (!Array.isArray(exerciciosRealizados) || exerciciosRealizados.length === 0) {
        throw new Error('Nenhum exercício foi realizado.')
      }

      // 1) Insere todos os exercicio_realizado de uma vez (retorna lista com IDs)
      const linhasExercicios = exerciciosRealizados.map(ex => ({
        sessao_id: sessaoId,
        nome: textoNaoVazio(ex.nome, { campo: 'Nome do exercício', max: 100 }),
        ordem: inteiroPositivo(ex.ordem, { campo: 'Ordem', min: 1, max: 100 }),
        substituido: !!ex.substituido,
      }))
      const exerciciosInseridos = await ApiClient.insert('exercicio_realizado', linhasExercicios)

      // 2) Compõe e insere todas as series_realizada referenciando os IDs retornados
      const linhasSeries = []
      exerciciosInseridos.forEach((exInserido, idx) => {
        const origem = exerciciosRealizados[idx]
        ;(origem.series ?? []).forEach(s => {
          linhasSeries.push({
            exercicio_real_id: exInserido.id,
            numero_serie: inteiroPositivo(s.numero_serie, { campo: 'Número da série', min: 1, max: 50 }),
            repeticoes: inteiroPositivo(s.repeticoes, { campo: 'Repetições', min: 1, max: 200 }),
            carga_kg: numeroFinito(s.carga_kg, { campo: 'Carga', min: 0, max: 1000, permitirNulo: true }),
          })
        })
      })
      if (linhasSeries.length > 0) await ApiClient.insert('serie_realizada', linhasSeries)

      // 3) Atualiza a sessão (duração real, calorias, observação, concluida=true)
      return await ApiClient.update('sessao_treino', sessaoId, {
        duracao_minutos: duracao,
        observacao: observacaoNormalizada,
        calorias_gastas_manual: caloriasManualNorm,
        concluida: true,
      })
    } catch (error) {
      logErro('SessaoService.concluirSessaoMusculacao', error)
      if (error.message?.match(/^(Duração|Observação|Calorias|Nome|Ordem|Número|Repetições|Carga|Nenhum)/)) throw error
      throw new Error('Erro ao concluir sessão de musculação.')
    }
  },

  async concluirSessao({ sessaoId, caloriasManual = null }) {
    try {
      uuid(sessaoId, { campo: 'sessaoId' })

      const caloriasManualNormalizada = (caloriasManual === null || caloriasManual === undefined || caloriasManual === '')
        ? null
        : numeroFinito(caloriasManual, {
            campo: 'Calorias manuais',
            min: 0,
            max: 5000,
          })

      return await ApiClient.update('sessao_treino', sessaoId, {
        calorias_gastas_manual: caloriasManualNormalizada,
        concluida: true,
      })
    } catch (error) {
      logErro('SessaoService.concluirSessao', error)
      if (error.message?.startsWith('Calorias')) throw error
      throw new Error('Erro ao concluir sessão.')
    }
  },
}

export default SessaoService
