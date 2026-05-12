import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import RecorrenteService from '../../services/RecorrenteService'
import CategoriaService from '../../services/CategoriaService'

const INPUT_STYLE = {
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '11px 12px',
  fontSize: 15,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '100%',
}

const DIAS_SEMANA = [
  { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' }, { v: 7, l: 'Dom' },
]

export default function ModalRecorrente({ userId, recorrente = null, onFechar }) {
  const qc = useQueryClient()
  const editando = !!recorrente
  const tipoInicial = (recorrente?.valor ?? 0) >= 0 ? 'entrada' : 'saida'
  const [tipo, setTipo] = useState(tipoInicial)
  const [descricao, setDescricao] = useState(recorrente?.descricao ?? '')
  const [valor, setValor] = useState(recorrente ? Math.abs(Number(recorrente.valor)) : '')
  const [periodicidade, setPeriodicidade] = useState(recorrente?.periodicidade ?? 'mensal')
  const [diaLancamento, setDiaLancamento] = useState(recorrente?.dia_lancamento ?? 1)
  const [modalidade, setModalidade] = useState(recorrente?.modalidade ?? 'debito')
  const [categoriaId, setCategoriaId] = useState(recorrente?.categoria_id ?? '')
  const [ativa, setAtiva] = useState(recorrente?.ativa ?? true)

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', userId],
    queryFn: () => CategoriaService.listar(userId),
    enabled: !!userId,
  })

  const valorNum = Number(valor)
  const diaMax = periodicidade === 'semanal' ? 7 : 31
  const valido =
    descricao.trim().length >= 1
    && Number.isFinite(valorNum) && valorNum > 0
    && Number(diaLancamento) >= 1 && Number(diaLancamento) <= diaMax

  function alterarPeriodicidade(nova) {
    setPeriodicidade(nova)
    // Reseta dia para evitar inconsistência (ex: dia 15 + semanal)
    if (nova === 'semanal' && Number(diaLancamento) > 7) setDiaLancamento(1)
  }

  const salvar = useMutation({
    mutationFn: () => RecorrenteService.salvar({
      id: recorrente?.id,
      userId,
      descricao: descricao.trim(),
      valor: tipo === 'entrada' ? Math.abs(valorNum) : -Math.abs(valorNum),
      periodicidade,
      diaLancamento: Number(diaLancamento),
      modalidade,
      categoriaId: categoriaId || null,
      ativa,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recorrentes', userId] })
      toast.success(editando ? 'Recorrente atualizada.' : 'Recorrente criada.')
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <div onClick={onFechar} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} aria-hidden />

      <div role="dialog" aria-modal="true" aria-label={editando ? 'Editar recorrente' : 'Nova recorrente'}
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--color-surface)', borderRadius: '20px 20px 0 0',
          maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
          zIndex: 201,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>
            {editando ? 'Editar recorrente' : 'Nova recorrente'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--color-bg)', borderRadius: 12, padding: 4, border: '1px solid var(--color-border)' }}>
            {['entrada', 'saida'].map(t => {
              const ativo = tipo === t
              return (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: 'none',
                    background: ativo ? 'var(--color-accent)' : 'transparent',
                    color: ativo ? '#fff' : 'var(--color-text-2)',
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', minHeight: 40,
                  }}>
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="r-desc" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>DESCRIÇÃO</label>
            <SafeInput id="r-desc" type="text" maxLength={200}
              placeholder="Ex: Aluguel, Netflix, Salário..."
              value={descricao} onChange={e => setDescricao(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="r-valor" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>VALOR (R$)</label>
            <SafeInput id="r-valor" type="number" inputMode="decimal" step="0.01"
              value={valor} min={0.01} max={999999999}
              placeholder="0,00"
              onChange={e => setValor(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>PERIODICIDADE</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {['mensal', 'semanal', 'anual'].map(p => {
                const ativo = periodicidade === p
                return (
                  <button key={p} type="button" onClick={() => alterarPeriodicidade(p)}
                    style={{
                      padding: '10px 8px', borderRadius: 10,
                      border: ativo ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: ativo ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-bg)',
                      color: ativo ? 'var(--color-accent)' : 'var(--color-text-2)',
                      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', minHeight: 44, textTransform: 'capitalize',
                    }}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {periodicidade === 'semanal' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>DIA DA SEMANA</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {DIAS_SEMANA.map(d => {
                  const ativo = Number(diaLancamento) === d.v
                  return (
                    <button key={d.v} type="button" onClick={() => setDiaLancamento(d.v)}
                      style={{
                        padding: '10px 0', borderRadius: 8,
                        border: ativo ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: ativo ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-bg)',
                        color: ativo ? 'var(--color-accent)' : 'var(--color-text-2)',
                        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', minHeight: 40,
                      }}>
                      {d.l}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="r-dia" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>DIA DO MÊS</label>
              <SafeInput id="r-dia" type="number" inputMode="numeric"
                value={diaLancamento} min={1} max={31}
                onChange={e => setDiaLancamento(e.target.value)}
                style={INPUT_STYLE} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>MODALIDADE</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { v: 'debito',   l: 'Débito' },
                { v: 'credito',  l: 'Crédito' },
                { v: 'dinheiro', l: 'Dinheiro' },
              ].map(m => {
                const ativo = modalidade === m.v
                return (
                  <button key={m.v} type="button" onClick={() => setModalidade(m.v)}
                    style={{
                      padding: '10px 8px', borderRadius: 10,
                      border: ativo ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: ativo ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-bg)',
                      color: ativo ? 'var(--color-accent)' : 'var(--color-text-2)',
                      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', minHeight: 44,
                    }}>
                    {m.l}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="r-cat" style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>CATEGORIA (opcional)</label>
            <select id="r-cat" value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              style={INPUT_STYLE}>
              <option value="">Sem categoria</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
            <SafeInput
              type="checkbox"
              checked={ativa}
              onChange={e => setAtiva(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Ativa (recorrência rodando)</span>
          </label>

          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={() => salvar.mutate()}
            disabled={!valido || salvar.isPending}
            style={{
              width: '100%', padding: '14px 20px',
              background: !valido || salvar.isPending ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color: !valido || salvar.isPending ? 'var(--color-text-3)' : '#fff',
              border: 'none', borderRadius: 14,
              fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700,
              cursor: !valido || salvar.isPending ? 'not-allowed' : 'pointer',
              minHeight: 52,
            }}>
            {salvar.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Criar recorrente'}
          </button>
        </div>
      </div>
    </>
  )
}
