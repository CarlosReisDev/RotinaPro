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

export default function ModalAgendaDia({
  dia,
  itemAtual,
  templates = [],
  onSelecionarTemplate,
  onSelecionarAtividadeLivre,
  onMarcarDescanso,
  onLimpar,
  onFechar,
  salvando,
}) {
  const templateAtualId = itemAtual?.template_treino?.id
  const descansoAtual   = !!itemAtual?.descanso
  const atividadeLivreAtual = itemAtual?.atividade_livre ?? null
  const [mostrarOutras, setMostrarOutras] = useState(atividadeLivreAtual?.tipo === 'outras')
  const [nomeOutras, setNomeOutras] = useState(atividadeLivreAtual?.tipo === 'outras' ? (atividadeLivreAtual.nome ?? '') : '')

  function renderIconeAtividade(tipo) {
    if (tipo === 'natacao') return <Waves size={16} color="#0891B2" aria-hidden />
    if (tipo === 'ciclismo') return <Bike size={16} color="#0891B2" aria-hidden />
    if (tipo === 'corrida' || tipo === 'caminhada') return <Activity size={16} color="#0891B2" aria-hidden />
    if (tipo === 'funcional') return <Dumbbell size={16} color="#0891B2" aria-hidden />
    return <Circle size={16} color="#0891B2" aria-hidden />
  }

  function selecionarAtividade(tipo) {
    if (tipo === 'outras') {
      setMostrarOutras(true)
      return
    }
    setMostrarOutras(false)
    setNomeOutras('')
    onSelecionarAtividadeLivre({ tipo })
  }

  function salvarOutras() {
    onSelecionarAtividadeLivre({ tipo: 'outras', nome: nomeOutras })
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

          <Botao onClick={onMarcarDescanso} disabled={salvando} ativo={descansoAtual} cor="#64748B">
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
            {descansoAtual && <Check size={18} color="#64748B" aria-hidden />}
          </Botao>

          <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 4 }}>
            ATIVIDADE LIVRE
          </p>
          {ATIVIDADES_LIVRES.map(atividade => {
            const ativo = atividadeLivreAtual?.tipo === atividade.valor || (atividade.valor === 'outras' && mostrarOutras)
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

          {mostrarOutras && (
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
                value={nomeOutras}
                onChange={e => setNomeOutras(e.target.value)}
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
              <button
                type="button"
                onClick={salvarOutras}
                disabled={salvando || nomeOutras.trim().length < 2}
                style={{
                  background: nomeOutras.trim().length >= 2 ? '#0891B2' : 'var(--color-surface-2)',
                  color: nomeOutras.trim().length >= 2 ? '#fff' : 'var(--color-text-3)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 700,
                  minHeight: 44,
                }}
              >
                Salvar atividade livre
              </button>
            </div>
          )}

          {templates.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 4 }}>
                ESCOLHA UM TEMPLATE
              </p>
              {templates.map(t => {
                const predefinido = !!t.predefinido
                const ativo = t.id === templateAtualId
                return (
                  <Botao key={t.id} onClick={() => onSelecionarTemplate(t.id)} disabled={salvando} ativo={ativo}>
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
      </div>
    </>
  )
}
