import { useState } from 'react'
import { Activity, BedDouble, Bike, Check, Circle, Dumbbell, Lock, Trash2, Waves, X } from 'lucide-react'
import SafeInput from '../ui/SafeInput'
import { ATIVIDADES_LIVRES } from '../../services/AgendaService'

function Botao({ onClick, disabled, ativo, children, cor = 'var(--color-accent)' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)' }}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)' }}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
      style={{
        width: '100%',
        background: ativo ? `${cor}22` : 'var(--color-bg)',
        border: `1.5px solid ${ativo ? cor : 'var(--color-border)'}`,
        borderRadius: 12, padding: '12px 14px', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', transition: 'transform var(--t-fast)',
        display: 'flex', alignItems: 'center', gap: 12,
        opacity: disabled ? 0.6 : 1, minHeight: 52,
      }}>
      {children}
    </button>
  )
}

function estadoInicial(itemAtual) {
  if (itemAtual?.descanso) return { tipo: 'descanso' }
  if (itemAtual?.template_treino?.id) return { tipo: 'template', templateId: itemAtual.template_treino.id }
  const liv = itemAtual?.atividade_livre
  if (liv?.tipo) return { tipo: 'livre', livreTipo: liv.tipo, livreNome: liv.nome ?? '' }
  return { tipo: null }
}

export default function ModalAgendaDia({
  dia,
  itemAtual,
  templates = [],
  onSalvar,
  onLimpar,
  onFechar,
  salvando,
}) {
  const [selecao, setSelecao] = useState(() => estadoInicial(itemAtual))

  function renderIconeAtividade(tipo) {
    if (tipo === 'natacao') return <Waves size={16} color="#0891B2" aria-hidden />
    if (tipo === 'ciclismo') return <Bike size={16} color="#0891B2" aria-hidden />
    if (tipo === 'corrida' || tipo === 'caminhada') return <Activity size={16} color="#0891B2" aria-hidden />
    if (tipo === 'funcional') return <Dumbbell size={16} color="#0891B2" aria-hidden />
    return <Circle size={16} color="#0891B2" aria-hidden />
  }

  function selecionarAtividade(valor) {
    setSelecao({ tipo: 'livre', livreTipo: valor, livreNome: valor === 'outras' ? (selecao.livreNome ?? '') : '' })
  }

  function selecionarTemplate(templateId) {
    setSelecao({ tipo: 'template', templateId })
  }

  function selecionarDescanso() {
    setSelecao({ tipo: 'descanso' })
  }

  const podeSalvar = (() => {
    if (salvando) return false
    if (selecao.tipo === 'descanso') return true
    if (selecao.tipo === 'template') return !!selecao.templateId
    if (selecao.tipo === 'livre') {
      if (!selecao.livreTipo) return false
      if (selecao.livreTipo === 'outras') return (selecao.livreNome ?? '').trim().length >= 2
      return true
    }
    return false
  })()

  function handleSalvar() {
    if (!podeSalvar) return
    if (selecao.tipo === 'descanso') return onSalvar({ descanso: true })
    if (selecao.tipo === 'template') return onSalvar({ templateId: selecao.templateId })
    if (selecao.tipo === 'livre') {
      const atividadeLivre = selecao.livreTipo === 'outras'
        ? { tipo: 'outras', nome: selecao.livreNome.trim() }
        : { tipo: selecao.livreTipo }
      return onSalvar({ atividadeLivre })
    }
  }

  return (
    <>
      <div onClick={onFechar} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} aria-hidden />

      <div role="dialog" aria-modal="true" aria-label={`Agendar ${dia.label}`}
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
          maxHeight: '82dvh', display: 'flex', flexDirection: 'column', zIndex: 201,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 12px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
            {dia.label}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          <Botao onClick={selecionarDescanso} disabled={salvando} ativo={selecao.tipo === 'descanso'} cor="#64748B">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(71,85,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BedDouble size={18} color="var(--color-text-2)" aria-hidden />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                Dia de descanso
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                Sem treino programado
              </p>
            </div>
            {selecao.tipo === 'descanso' && <Check size={18} color="#64748B" aria-hidden />}
          </Botao>

          <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 4 }}>
            ATIVIDADE LIVRE
          </p>
          {ATIVIDADES_LIVRES.map(atividade => {
            const ativo = selecao.tipo === 'livre' && selecao.livreTipo === atividade.valor
            return (
              <Botao
                key={atividade.valor}
                onClick={() => selecionarAtividade(atividade.valor)}
                disabled={salvando}
                ativo={ativo}
                cor="#0891B2"
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(8,145,178,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderIconeAtividade(atividade.valor)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                    {atividade.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                    {atividade.valor === 'outras' ? 'Defina o nome da atividade' : 'Agendar como atividade livre'}
                  </p>
                </div>
                {ativo && <Check size={18} color="#0891B2" aria-hidden />}
              </Botao>
            )
          })}

          {selecao.tipo === 'livre' && selecao.livreTipo === 'outras' && (
            <div style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <label htmlFor="atividade-livre-outras" style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
                Nome da atividade
              </label>
              <SafeInput
                id="atividade-livre-outras"
                type="text"
                value={selecao.livreNome ?? ''}
                onChange={e => setSelecao(s => ({ ...s, livreNome: e.target.value }))}
                maxLength={60}
                placeholder="Ex.: Yoga, Pilates, Skate"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#0891B2' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
              />
            </div>
          )}

          {templates.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 4 }}>
                ESCOLHA UM TEMPLATE
              </p>
              {templates.map(t => {
                const predefinido = !!t.predefinido
                const ativo = selecao.tipo === 'template' && selecao.templateId === t.id
                return (
                  <Botao key={t.id} onClick={() => selecionarTemplate(t.id)} disabled={salvando} ativo={ativo}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: predefinido ? 'rgba(71,85,105,0.2)' : 'rgba(249,115,22,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {predefinido
                        ? <Lock size={16} color="var(--color-text-3)" aria-hidden />
                        : <Dumbbell size={16} color="var(--color-accent)" aria-hidden />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.nome}
                      </p>
                      {predefinido && (
                        <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                          Predefinido
                        </p>
                      )}
                    </div>
                    {ativo && <Check size={18} color="var(--color-accent)" aria-hidden />}
                  </Botao>
                )
              })}
            </>
          )}

          {itemAtual && (
            <button type="button" onClick={onLimpar} disabled={salvando}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'none', border: '1.5px dashed var(--color-border)',
                borderRadius: 12, padding: '12px 14px', cursor: salvando ? 'not-allowed' : 'pointer',
                color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                marginTop: 4, minHeight: 48,
              }}>
              <Trash2 size={16} aria-hidden /> Limpar agendamento
            </button>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 10,
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            style={{
              flex: 1, minHeight: 48, border: 'none', borderRadius: 12,
              background: 'var(--color-surface-2)', color: 'var(--color-text)',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              cursor: salvando ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!podeSalvar}
            style={{
              flex: 1, minHeight: 48, border: 'none', borderRadius: 12,
              background: podeSalvar ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: podeSalvar ? '#fff' : 'var(--color-text-3)',
              fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
              cursor: podeSalvar ? 'pointer' : 'not-allowed',
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  )
}
