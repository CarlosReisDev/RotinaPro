import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, ArrowDown, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import CartaoService from '../../services/CartaoService'
import CategoriaService from '../../services/CategoriaService'
import TransacaoService from '../../services/TransacaoService'
import { COR_SUCESSO, COR_ERRO } from '../../utils/cores'
import { calcularMesFatura, somarMeses, dataISO } from '../../utils/fatura'

function hojeISO() {
  const d = new Date()
  return dataISO(d)
}

function formatarMesAno(d) {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${meses[d.getMonth()]}/${d.getFullYear()}`
}

function round2(v) {
  return Math.round(Number(v) * 100) / 100
}

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: 0.3 }}>
      {children}
    </label>
  )
}

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

export default function ModalTransacao({ userId, anoMes, onFechar }) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState('saida')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [descricao, setDescricao] = useState('')
  const [modalidade, setModalidade] = useState('debito')
  const [categoriaId, setCategoriaId] = useState('')
  const [cartaoId, setCartaoId] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState(1)

  const { data: cartoes = [] } = useQuery({
    queryKey: ['cartoes', userId],
    queryFn: () => CartaoService.listar(userId, { apenasAtivos: true }),
    enabled: !!userId,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', userId],
    queryFn: () => CategoriaService.listar(userId),
    enabled: !!userId,
  })

  const cartaoSelecionado = cartoes.find(c => c.id === cartaoId) ?? null

  const valorNum = Number(valor)
  const parcelasNum = Math.max(1, Math.min(24, Number(numeroParcelas) || 1))
  const valido = Number.isFinite(valorNum) && valorNum > 0
    && descricao.trim().length >= 1
    && /^\d{4}-\d{2}-\d{2}$/.test(data)
    && (modalidade !== 'credito' || !!cartaoId)

  const preview = useMemo(() => {
    if (modalidade !== 'credito' || !valido || !cartaoSelecionado || parcelasNum <= 1) return null
    const porParcela = round2(valorNum / parcelasNum)
    const mes1 = calcularMesFatura(data, cartaoSelecionado.dia_vencimento)
    return { porParcela, mes1: formatarMesAno(mes1), parcelas: parcelasNum }
  }, [modalidade, valido, cartaoSelecionado, parcelasNum, valorNum, data])

  const categoriaSelecionada = categorias.find(c => c.id === categoriaId) ?? null

  async function verificarAlertaOrcamento() {
    if (tipo !== 'saida') return
    if (!categoriaSelecionada?.alerta_ativo) return
    const orcamento = Number(categoriaSelecionada.orcamento_mensal_reais ?? 0)
    if (orcamento <= 0) return
    try {
      const mesData = data.slice(0, 7) // YYYY-MM da transação
      const gasto = await TransacaoService.getGastoCategoriaMes(userId, categoriaId, mesData)
      const pct = (gasto / orcamento) * 100
      if (pct >= 100) {
        toast.error(`Orçamento de ${categoriaSelecionada.nome} ultrapassado (${pct.toFixed(0)}%).`)
      } else if (pct >= 80) {
        toast(`${categoriaSelecionada.nome}: ${pct.toFixed(0)}% do orçamento usado.`, { icon: '⚠️' })
      }
    } catch {
      // Alerta é best-effort — falha silenciosa não bloqueia o fluxo.
    }
  }

  const salvar = useMutation({
    mutationFn: () => TransacaoService.salvar({
      userId,
      tipo,
      valor: valorNum,
      data,
      descricao: descricao.trim(),
      modalidade,
      categoriaId: categoriaId || null,
      cartaoId: modalidade === 'credito' ? cartaoId : null,
      numeroParcelas: modalidade === 'credito' ? parcelasNum : 1,
      cartaoDiaVencimento: modalidade === 'credito' ? cartaoSelecionado?.dia_vencimento : null,
    }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['transacoes-mes', userId, anoMes] })
      qc.invalidateQueries({ queryKey: ['saldo-mes', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-financeiro', userId, anoMes] })
      // Crédito parcelado pode afetar meses futuros — invalida outros meses tb
      if (modalidade === 'credito' && parcelasNum > 1) {
        for (let k = 2; k <= parcelasNum; k++) {
          const dp = somarMeses(data, k - 1)
          const am = `${dp.getFullYear()}-${String(dp.getMonth() + 1).padStart(2, '0')}`
          qc.invalidateQueries({ queryKey: ['transacoes-mes', userId, am] })
        }
      }
      toast.success('Transação registrada.')
      await verificarAlertaOrcamento()
      onFechar()
    },
    onError: (e) => toast.error(e.message),
  })

  function onSubmit(e) {
    e.preventDefault()
    if (!valido || salvar.isPending) return
    salvar.mutate()
  }

  const corAcento = tipo === 'entrada' ? COR_SUCESSO : COR_ERRO
  const IconeTipo = tipo === 'entrada' ? ArrowDown : ArrowUp

  return (
    <>
      <div onClick={onFechar} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 200,
      }} aria-hidden />

      <div role="dialog" aria-modal="true" aria-label="Registrar transação"
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 16px', gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconeTipo size={20} color={corAcento} aria-hidden />
            Nova transação
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Toggle tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--color-bg)', borderRadius: 12, padding: 4, border: '1px solid var(--color-border)' }}>
            {['entrada', 'saida'].map(t => {
              const ativo = tipo === t
              const cor = t === 'entrada' ? COR_SUCESSO : COR_ERRO
              return (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: 'none',
                    background: ativo ? cor : 'transparent',
                    color: ativo ? '#fff' : 'var(--color-text-2)',
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', minHeight: 40,
                  }}>
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              )
            })}
          </div>

          {/* Valor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Label htmlFor="t-valor">VALOR (R$)</Label>
            <SafeInput id="t-valor" type="number" inputMode="decimal" step="0.01"
              placeholder="0,00" value={valor} min={0.01} max={999999999}
              onChange={e => setValor(e.target.value)}
              style={{ ...INPUT_STYLE, fontSize: 22, fontWeight: 700, color: corAcento, textAlign: 'right' }} />
          </div>

          {/* Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Label htmlFor="t-data">DATA</Label>
            <SafeInput id="t-data" type="date" value={data}
              onChange={e => setData(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          {/* Descrição */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Label htmlFor="t-desc">DESCRIÇÃO</Label>
            <SafeInput id="t-desc" type="text" maxLength={200}
              placeholder="Ex: Mercado, Salário, Uber..."
              value={descricao} onChange={e => setDescricao(e.target.value)}
              style={INPUT_STYLE} />
          </div>

          {/* Categoria */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Label htmlFor="t-cat">CATEGORIA (opcional)</Label>
            <select id="t-cat" value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              style={INPUT_STYLE}>
              <option value="">Sem categoria</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>MODALIDADE</Label>
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
                      padding: '11px 8px', borderRadius: 10,
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

          {/* Cartão e parcelas (só crédito) */}
          {modalidade === 'credito' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label htmlFor="t-cartao">CARTÃO</Label>
                <select id="t-cartao" value={cartaoId} onChange={e => setCartaoId(e.target.value)}
                  style={INPUT_STYLE}>
                  <option value="">Selecione...</option>
                  {cartoes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} (venc. dia {c.dia_vencimento})</option>
                  ))}
                </select>
                {cartoes.length === 0 && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                    Nenhum cartão cadastrado. Cadastre um em Configurações financeiras.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label htmlFor="t-parc">PARCELAS</Label>
                <SafeInput id="t-parc" type="number" inputMode="numeric"
                  value={numeroParcelas} min={1} max={24}
                  onChange={e => setNumeroParcelas(e.target.value)}
                  style={INPUT_STYLE} />
              </div>

              {preview && (
                <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--color-text-2)' }}>
                  <strong style={{ color: 'var(--color-text)' }}>
                    {preview.parcelas}x R$ {preview.porParcela.toFixed(2)}
                  </strong>
                  <span style={{ color: 'var(--color-text-3)' }}> · 1ª fatura: {preview.mes1}</span>
                </div>
              )}
            </>
          )}

          <div style={{ height: 8 }} />
        </form>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={onSubmit}
            disabled={!valido || salvar.isPending}
            style={{
              width: '100%', padding: '14px 20px',
              background: !valido || salvar.isPending ? 'var(--color-surface-2)' : corAcento,
              color: !valido || salvar.isPending ? 'var(--color-text-3)' : '#fff',
              border: 'none', borderRadius: 14,
              fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700,
              cursor: !valido || salvar.isPending ? 'not-allowed' : 'pointer',
              minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {salvar.isPending
              ? <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : 'Registrar'
            }
          </button>
        </div>
      </div>
    </>
  )
}
