import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Bike, Clock3, Dumbbell, Flame, Replace, Trash2, Waves, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Skeleton from '../ui/Skeleton'
import ModalConfirmacao from '../ui/ModalConfirmacao'
import SessaoService from '../../services/SessaoService'
import { COR_HORA, COR_KCAL } from '../../utils/cores'

const LABEL_INTENSIDADE = { leve: 'Leve', moderado: 'Moderada', intenso: 'Intensa' }

function corAtividade(nome = '') {
  const n = nome.toLowerCase()
  if (n.includes('nat')) return '#0891B2'
  if (n.includes('corr') || n.includes('caminh')) return '#2563EB'
  if (n.includes('cicl')) return '#16A34A'
  if (n.includes('funcional') || n.includes('cross')) return '#EA580C'
  return 'var(--color-accent)'
}

function IconeSessao({ sessao }) {
  if (sessao.tipo === 'musculacao') return <Dumbbell size={18} color="var(--color-accent)" aria-hidden />
  const nome = sessao.atividade_met?.nome ?? ''
  const cor = corAtividade(nome)
  const n = nome.toLowerCase()
  if (n.includes('nat')) return <Waves size={18} color={cor} aria-hidden />
  if (n.includes('cicl')) return <Bike size={18} color={cor} aria-hidden />
  return <Activity size={18} color={cor} aria-hidden />
}

function nomeSessao(sessao) {
  if (sessao.tipo === 'musculacao') return sessao.template_treino?.nome ?? 'Musculação'
  return sessao.atividade_met?.nome ?? 'Atividade livre'
}

function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function ModalDetalheSessao({ sessaoId, userId, onFechar }) {
  const qc = useQueryClient()
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const { data: sessao, isLoading } = useQuery({
    queryKey: ['sessao-detalhe', sessaoId],
    queryFn: () => SessaoService.obterDetalheSessao(sessaoId),
    enabled: !!sessaoId,
    staleTime: 1000 * 60 * 5,
  })

  const excluir = useMutation({
    mutationFn: () => SessaoService.descartarSessao(sessaoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['historico-treinos', userId] })
      qc.invalidateQueries({ queryKey: ['sessoes-hoje', userId] })
      qc.invalidateQueries({ queryKey: ['primeira-sessao-hoje', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Sessão excluída.')
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  const kcal = sessao
    ? Math.round(Number(sessao.calorias_gastas_manual ?? sessao.calorias_gastas_estimadas ?? 0))
    : 0
  const cor = sessao ? corAtividade(nomeSessao(sessao)) : 'var(--color-accent)'

  return createPortal(
    <>
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
          aria-label="Detalhes da sessão"
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
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: sessao?.tipo === 'musculacao' ? 'rgba(249,115,22,0.12)' : `${cor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {sessao && <IconeSessao sessao={sessao} />}
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isLoading ? 'Carregando…' : nomeSessao(sessao ?? {})}
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
                <Skeleton width="100%" height={72} radius={12} />
                <Skeleton width="100%" height={120} radius={12} />
              </>
            )}

            {!isLoading && sessao && (
              <>
                <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
                    <span style={{ color: COR_HORA, fontWeight: 700 }}>{formatarData(sessao.data)}</span>
                    {sessao.intensidade ? <> · {LABEL_INTENSIDADE[sessao.intensidade]}</> : null}
                  </p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: COR_KCAL, marginTop: 6 }}>
                    {kcal} <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600 }}>kcal</span>
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--color-text-2)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock3 size={12} aria-hidden /> {sessao.duracao_minutos} min
                    </span>
                    {kcal > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Flame size={12} aria-hidden /> {sessao.calorias_gastas_manual ? 'medidas' : 'estimadas'}
                      </span>
                    )}
                  </div>
                  {sessao.observacao && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{sessao.observacao}"
                    </p>
                  )}
                </section>

                {sessao.tipo === 'musculacao' && sessao.exercicio_realizado?.length > 0 && (
                  <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>EXERCÍCIOS</p>
                    {sessao.exercicio_realizado.map(ex => (
                      <div key={ex.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 12px' }}>
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                          {ex.nome}
                          {ex.substituido && (
                            <span style={{ fontSize: 10, color: 'var(--color-accent)', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <Replace size={10} aria-hidden /> sub
                            </span>
                          )}
                        </p>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {ex.serie_realizada.map(s => (
                            <span key={s.numero_serie} style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 6,
                              background: 'var(--color-bg)', color: 'var(--color-text-2)',
                              border: '1px solid var(--color-border)',
                            }}>
                              {s.numero_serie}: {s.carga_kg ? `${s.carga_kg}kg ×` : ''} {s.repeticoes}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {sessao.tipo === 'musculacao' && (!sessao.exercicio_realizado || sessao.exercicio_realizado.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: 8 }}>
                    Sem exercícios registrados.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmExcluir(true)}
                  disabled={excluir.isPending}
                  style={{
                    width: '100%', minHeight: 46, borderRadius: 12,
                    border: '1.5px dashed rgba(239,68,68,0.5)', background: 'transparent',
                    color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                    cursor: excluir.isPending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Trash2 size={16} aria-hidden /> {excluir.isPending ? 'Excluindo…' : 'Excluir sessão'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmExcluir && (
        <ModalConfirmacao
          titulo="Excluir sessão?"
          descricao="Esta sessão será removida permanentemente do histórico, junto com exercícios e séries registradas. Esta ação não pode ser desfeita."
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate()}
          onFechar={() => setConfirmExcluir(false)}
        />
      )}
    </>,
    document.body,
  )
}
