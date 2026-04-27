import { Activity, BedDouble, Bike, ChevronRight, Circle, Dumbbell, Minus, Waves } from 'lucide-react'
import { DIAS_SEMANA } from '../../services/AgendaService'
import Skeleton from '../ui/Skeleton'

function itemEstilo() {
  return {
    width: '100%', background: 'var(--color-surface)',
    border: '1px solid var(--color-border)', borderRadius: 12,
    padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 12,
    transition: 'transform var(--t-fast)', minHeight: 56,
  }
}

function IconeDoDia({ item }) {
  if (item?.descanso) return <BedDouble size={18} color="var(--color-text-3)" aria-hidden />
  if (item?.atividade_livre?.tipo) {
    const tipo = item.atividade_livre.tipo
    if (tipo === 'natacao') return <Waves size={18} color="#0891B2" aria-hidden />
    if (tipo === 'ciclismo') return <Bike size={18} color="#0891B2" aria-hidden />
    if (tipo === 'corrida' || tipo === 'caminhada') return <Activity size={18} color="#0891B2" aria-hidden />
    if (tipo === 'funcional') return <Dumbbell size={18} color="#0891B2" aria-hidden />
    return <Circle size={18} color="#0891B2" aria-hidden />
  }
  if (item?.template_treino) return <Dumbbell size={18} color="var(--color-accent)" aria-hidden />
  return <Minus size={18} color="var(--color-text-3)" aria-hidden />
}

function legenda(item) {
  if (!item) return 'Sem agendamento'
  if (item.descanso) return 'Dia de descanso'
  if (item.atividade_livre) return item.atividade_livre.nome ?? 'Atividade livre'
  return item.template_treino?.nome ?? 'Template removido'
}

export default function AgendaSemanal({ agenda = [], loading, onAbrirDia }) {
  const indice = new Map(agenda.map(a => [a.dia_semana, a]))

  return (
    <section aria-label="Agenda semanal">
      <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 10 }}>
        AGENDA SEMANAL
      </p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DIAS_SEMANA.map(d => (
            <div key={d.valor} style={{ ...itemEstilo(), cursor: 'default' }}>
              <Skeleton width={28} height={28} radius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton width={80} height={14} />
                <Skeleton width={140} height={12} style={{ marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DIAS_SEMANA.map(d => {
            const item = indice.get(d.valor) ?? null
            const ativo = !!item
            return (
              <button key={d.valor} type="button" onClick={() => onAbrirDia(d, item)}
                aria-label={`Agendar ${d.label}`}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                style={itemEstilo()}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: ativo
                    ? item.descanso
                      ? 'rgba(71,85,105,0.2)'
                      : item.atividade_livre
                        ? 'rgba(8,145,178,0.16)'
                        : 'rgba(249,115,22,0.12)'
                    : 'var(--color-surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconeDoDia item={item} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                    {d.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {legenda(item)}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--color-text-3)" aria-hidden />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
