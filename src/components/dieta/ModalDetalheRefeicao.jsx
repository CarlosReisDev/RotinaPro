import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Sparkles } from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import RefeicaoService from '../../services/RefeicaoService'
import { COR_KCAL, COR_PROT, COR_CARB, COR_GORD, COR_HORA } from '../../utils/cores'

function formatarHora(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function rotuloOrigem(origem) {
  switch (origem) {
    case 'texto':     return 'Análise por texto'
    case 'foto':      return 'Análise por foto'
    case 'textoFoto': return 'Análise por foto + texto'
    case 'pratoFixo': return 'Prato fixo'
    case 'recente':   return 'Refeição recente'
    case 'alimento':  return 'Montada por alimentos'
    default:          return origem
  }
}

export default function ModalDetalheRefeicao({ refeicaoId, onFechar }) {
  const { data: refeicao, isLoading } = useQuery({
    queryKey: ['refeicao-detalhe', refeicaoId],
    queryFn: () => RefeicaoService.obterDetalhe(refeicaoId),
    enabled: !!refeicaoId,
    staleTime: 1000 * 60 * 5,
  })

  // ESC fecha o modal
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const componentes = refeicao?.refeicao_alimento ?? []
  const temComponentes = componentes.length > 0
  const kcal = Math.round(Number(refeicao?.calorias_confirmadas ?? 0))

  return createPortal(
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 16px env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--color-bg)', borderRadius: 20, overflow: 'hidden',
          width: '100%', maxWidth: 520, maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px 12px', borderBottom: '1px solid var(--color-border)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, flex: 1 }}>
            Detalhe da refeição
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--color-surface)', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div style={{ overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {isLoading && (
            <>
              <Skeleton width="100%" height={60} radius={12} />
              <Skeleton width="100%" height={120} radius={12} />
            </>
          )}

          {!isLoading && refeicao && (
            <>
              {/* Resumo */}
              <section style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 14, padding: '12px 14px',
              }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
                  <span style={{ color: COR_HORA, fontWeight: 700 }}>{formatarHora(refeicao.data_hora)}</span>
                  {' · '}{rotuloOrigem(refeicao.origem)}
                </p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: COR_KCAL, marginTop: 6 }}>
                  {kcal} <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>kcal</span>
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12 }}>
                  <span style={{ color: COR_PROT, fontWeight: 600 }}>P {Math.round(refeicao.proteina_g)}g</span>
                  <span style={{ color: COR_CARB, fontWeight: 600 }}>C {Math.round(refeicao.carboidrato_g)}g</span>
                  <span style={{ color: COR_GORD, fontWeight: 600 }}>G {Math.round(refeicao.gordura_g)}g</span>
                </div>
                {refeicao.descricao_texto && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 8, lineHeight: 1.4 }}>
                    {refeicao.descricao_texto}
                  </p>
                )}
                {refeicao.classificacao_ia && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 8, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={12} color="var(--color-accent)" aria-hidden />
                    {refeicao.classificacao_ia}
                  </p>
                )}
              </section>

              {/* Componentes (apenas para origem='alimento') */}
              {temComponentes && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>COMPOSIÇÃO</p>
                  {componentes.map(c => (
                    <div key={c.id} style={{
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 12, padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                          {c.alimento_nome}
                        </p>
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
                          {Number(c.qtd_g) % 1 === 0 ? c.qtd_g : Number(c.qtd_g).toFixed(1)}g
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, flexWrap: 'wrap' }}>
                        <span style={{ color: COR_KCAL, fontWeight: 700 }}>{Math.round(c.calorias)} kcal</span>
                        <span style={{ color: COR_PROT, fontWeight: 600 }}>P {Number(c.proteina_g).toFixed(1)}g</span>
                        <span style={{ color: COR_CARB, fontWeight: 600 }}>C {Number(c.carboidrato_g).toFixed(1)}g</span>
                        <span style={{ color: COR_GORD, fontWeight: 600 }}>G {Number(c.gordura_g).toFixed(1)}g</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {['alimento', 'pratoFixo'].includes(refeicao.origem) && !temComponentes && (
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '12px 0' }}>
                  Composição não disponível.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
