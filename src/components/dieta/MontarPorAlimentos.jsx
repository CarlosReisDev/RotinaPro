import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, X, Check, Settings, Lock, Hash, Bookmark, Clock, Edit3, Trash2, List } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import SafeInput from '../ui/SafeInput'
import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import AlimentoService from '../../services/AlimentoService'
import PratoFixoService from '../../services/PratoFixoService'
import RefeicaoService from '../../services/RefeicaoService'
import { COR_KCAL, COR_PROT, COR_CARB, COR_GORD } from '../../utils/cores'

// ─── Helpers ─────────────────────────────────────────────────

function macrosDeItem(alimento, qtdG) {
  const f = qtdG / 100
  return {
    kcal: alimento.calorias_kcal_100g * f,
    p:    alimento.proteina_g_100g    * f,
    c:    alimento.carboidrato_g_100g * f,
    g:    alimento.gordura_g_100g     * f,
  }
}

function MacrosBadges({ kcal, p, c, g, size = 11 }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: size }}>
      <span style={{ color: COR_KCAL, fontWeight: 700 }}>{Math.round(kcal)} kcal</span>
      <span style={{ color: COR_PROT, fontWeight: 600 }}>P {Number(p).toFixed(1)}g</span>
      <span style={{ color: COR_CARB, fontWeight: 600 }}>C {Number(c).toFixed(1)}g</span>
      <span style={{ color: COR_GORD, fontWeight: 600 }}>G {Number(g).toFixed(1)}g</span>
    </div>
  )
}

// ─── ItemMontagem (alimento com qtd editável) ─────────────────

function ItemMontagem({ item, alimento, onAlterar, onRemover }) {
  const podeUnidade = !!alimento?.unidade_padrao_g
  const macros = alimento ? macrosDeItem(alimento, item.qtd_g) : null

  function alternarModo() {
    if (!podeUnidade) return
    if (item.modo === 'un') {
      onAlterar({ ...item, modo: 'g', qtd_input: String(Math.round(item.qtd_g)) })
    } else {
      const un = item.qtd_g / alimento.unidade_padrao_g
      onAlterar({ ...item, modo: 'un', qtd_input: un % 1 === 0 ? String(un) : un.toFixed(2) })
    }
  }

  function alterarQtd(valorStr) {
    const n = Number(valorStr)
    const qtd_g = !Number.isFinite(n) || n <= 0
      ? 0
      : item.modo === 'un' ? n * (alimento?.unidade_padrao_g ?? 100) : n
    onAlterar({ ...item, qtd_input: valorStr, qtd_g })
  }

  // Alimento foi deletado depois de ser adicionado ao prato
  if (!alimento) {
    return (
      <div style={{
        background: 'var(--color-bg)', border: '1px dashed var(--color-border)',
        borderRadius: 12, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6,
      }}>
        <p style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)' }}>
          [alimento removido do catálogo]
        </p>
        <button type="button" onClick={onRemover} aria-label="Remover"
          style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={13} aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {alimento.nome}
        </p>
        <button type="button" onClick={onRemover} aria-label="Remover"
          style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={13} aria-hidden />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <SafeInput
          type="number" inputMode="decimal" min={0} max={5000} step={item.modo === 'un' ? 0.5 : 1}
          value={item.qtd_input} onChange={e => alterarQtd(e.target.value)} aria-label="Quantidade"
          style={{ width: 80, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
        />
        {podeUnidade ? (
          <button type="button" onClick={alternarModo}
            style={{ fontSize: 11, color: 'var(--color-text-2)', fontWeight: 600, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            title="Alternar entre gramas e unidade">
            <Hash size={11} aria-hidden />
            {item.modo === 'un' ? alimento.unidade_padrao_label : 'gramas'}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>gramas</span>
        )}
        <span style={{ flex: 1 }} />
        {macros && <span style={{ fontSize: 12, color: COR_KCAL, fontWeight: 700 }}>{Math.round(macros.kcal)} kcal</span>}
      </div>
      {macros && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
          <span style={{ color: COR_PROT, fontWeight: 600 }}>P {macros.p.toFixed(1)}g</span>
          <span style={{ color: COR_CARB, fontWeight: 600 }}>C {macros.c.toFixed(1)}g</span>
          <span style={{ color: COR_GORD, fontWeight: 600 }}>G {macros.g.toFixed(1)}g</span>
        </div>
      )}
    </div>
  )
}

// ─── Busca de alimentos (reutilizável) ────────────────────────

function BuscaAlimentos({ userId, itensIds, onAdicionar }) {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')

  const lista = useQuery({
    queryKey: ['alimentos', userId],
    queryFn: () => AlimentoService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return []
    return (lista.data ?? [])
      .filter(a => !itensIds.has(a.id) && a.nome.toLowerCase().includes(q))
      .slice(0, 8)
  }, [lista.data, busca, itensIds])

  function adicionar(alimento) {
    const usaUnidade = !!alimento.unidade_padrao_g
    onAdicionar({
      alimento_id: alimento.id,
      modo:        usaUnidade ? 'un' : 'g',
      qtd_input:   usaUnidade ? '1' : '100',
      qtd_g:       usaUnidade ? alimento.unidade_padrao_g : 100,
    })
    setBusca('')
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <Search size={14} color="var(--color-text-3)" aria-hidden style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <SafeInput
          type="search" maxLength={60} value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar alimento..."
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, minHeight: 38, padding: '8px 12px 8px 32px', fontSize: 14, color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {lista.isLoading && <Skeleton width="100%" height={36} radius={10} />}
      {lista.isError && <p style={{ fontSize: 12, color: '#EF4444' }}>{lista.error?.message}</p>}

      {resultados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
          {resultados.map(a => (
            <button key={a.id} type="button" onClick={() => adicionar(a)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' }}>
              <Plus size={14} color="var(--color-accent)" aria-hidden />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.nome} {AlimentoService.isPredefinido(a) && <Lock size={10} color="var(--color-text-3)" aria-hidden style={{ display: 'inline', marginLeft: 4 }} />}
                </p>
                <p style={{ fontSize: 10, color: 'var(--color-text-3)' }}>
                  {Math.round(a.calorias_kcal_100g)} kcal/100g{a.unidade_padrao_label ? ` · ${a.unidade_padrao_label}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {busca.trim() && !lista.isLoading && resultados.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
          Nenhum resultado.{' '}
          <button type="button" onClick={() => navigate('/dieta/alimentos')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 12 }}>
            Cadastrar?
          </button>
        </p>
      )}
    </>
  )
}

// ─── QuickConfirm ─────────────────────────────────────────────

function QuickConfirm({ titulo, macros, onSalvar, onCancelar, salvando, children }) {
  return (
    <div style={{
      background: 'rgba(249,115,22,0.06)', border: '1.5px solid rgba(249,115,22,0.3)',
      borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{titulo}</p>
      <MacrosBadges kcal={macros.kcal} p={macros.p} c={macros.c} g={macros.g} />
      {children}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancelar} disabled={salvando}
          style={{ flex: 1, minHeight: 40, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <X size={12} aria-hidden /> Cancelar
        </button>
        <button type="button" onClick={onSalvar} disabled={salvando}
          style={{ flex: 2, minHeight: 40, border: 'none', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Check size={12} aria-hidden /> {salvando ? 'Salvando...' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}

// ─── FormPrato: criar/editar prato fixo ──────────────────────

function FormPrato({ userId, valorInicial, onSalvar, onCancelar, salvando }) {
  const temIngredientes = (valorInicial?.prato_fixo_alimento ?? []).length > 0

  const [nome, setNome] = useState(valorInicial?.nome ?? '')
  const [modo, setModo] = useState(temIngredientes ? 'ingredientes' : 'ingredientes')

  // Ingredientes (pré-preenchidos ao editar — filtra itens com alimento_id nulo)
  const [itens, setItens] = useState(
    (valorInicial?.prato_fixo_alimento ?? [])
      .filter(pfa => pfa.alimento_id != null)
      .map(pfa => ({
        alimento_id: pfa.alimento_id,
        modo:        'g',
        qtd_input:   String(pfa.qtd_g),
        qtd_g:       pfa.qtd_g,
      }))
  )

  // Manual
  const [kcal, setKcal] = useState(!temIngredientes && valorInicial?.calorias_kcal != null ? String(valorInicial.calorias_kcal) : '')
  const [prot, setProt] = useState(!temIngredientes && valorInicial?.proteina_g    != null ? String(valorInicial.proteina_g)    : '')
  const [carb, setCarb] = useState(!temIngredientes && valorInicial?.carboidrato_g != null ? String(valorInicial.carboidrato_g) : '')
  const [gord, setGord] = useState(!temIngredientes && valorInicial?.gordura_g     != null ? String(valorInicial.gordura_g)     : '')

  const lista = useQuery({
    queryKey: ['alimentos', userId],
    queryFn: () => AlimentoService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const mapaPorId = useMemo(() => {
    const m = new Map()
    for (const a of (lista.data ?? [])) m.set(a.id, a)
    return m
  }, [lista.data])

  const idsUsados = useMemo(() => new Set(itens.map(i => i.alimento_id)), [itens])

  const totais = useMemo(() => {
    let cal = 0, p = 0, c = 0, g = 0
    for (const it of itens) {
      const al = mapaPorId.get(it.alimento_id)
      if (!al || it.qtd_g <= 0) continue
      const m = macrosDeItem(al, it.qtd_g)
      cal += m.kcal; p += m.p; c += m.c; g += m.g
    }
    return { kcal: cal, p, c, g }
  }, [itens, mapaPorId])

  function adicionarItem(novoItem) {
    setItens(prev => [...prev, novoItem])
  }

  function trocarModo(novoModo) {
    // Ao ir para manual, pré-preenche com os totais dos ingredientes
    if (novoModo === 'manual' && itens.length > 0) {
      setKcal(String(Math.round(totais.kcal)))
      setProt(String(Math.round(totais.p)))
      setCarb(String(Math.round(totais.c)))
      setGord(String(Math.round(totais.g)))
    }
    setModo(novoModo)
  }

  const nomeValido  = nome.trim().length >= 1
  const itensValidos = itens.length > 0 && itens.every(it => it.qtd_g > 0)
  const manualValido = kcal !== '' && prot !== '' && carb !== '' && gord !== ''
  const podeSalvar  = nomeValido && !salvando && (modo === 'ingredientes' ? itensValidos : manualValido)

  function submit() {
    if (!podeSalvar) return
    if (modo === 'ingredientes') {
      onSalvar({ nome: nome.trim(), itens: itens.map(it => ({ alimento_id: it.alimento_id, qtd_g: it.qtd_g })) })
    } else {
      onSalvar({ nome: nome.trim(), calorias_kcal: kcal, proteina_g: prot, carboidrato_g: carb, gordura_g: gord })
    }
  }

  const inputSt = {
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--color-text)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'var(--color-bg)', border: '1.5px solid rgba(249,115,22,0.3)',
      borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>
        {valorInicial ? 'EDITAR PRATO' : 'NOVO PRATO FIXO'}
      </p>

      {/* Nome */}
      <SafeInput
        type="text" maxLength={100} value={nome} onChange={e => setNome(e.target.value)}
        placeholder="Nome do prato *"
        style={{ ...inputSt, fontSize: 14, fontWeight: 600 }}
      />

      {/* Toggle de modo */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 8, padding: 2, gap: 2 }}>
        {[['ingredientes', 'Montar com alimentos'], ['manual', 'Valores manuais']].map(([m, label]) => {
          const ativo = modo === m
          return (
            <button key={m} type="button" onClick={() => trocarModo(m)}
              style={{
                flex: 1, minHeight: 30, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: ativo ? 700 : 500,
                background: ativo ? 'var(--color-bg)' : 'transparent',
                color: ativo ? 'var(--color-text)' : 'var(--color-text-3)',
                cursor: 'pointer', boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Modo: ingredientes */}
      {modo === 'ingredientes' && (
        <>
          <BuscaAlimentos userId={userId} itensIds={idsUsados} onAdicionar={adicionarItem} />

          {itens.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {itens.map((it, idx) => (
                <ItemMontagem
                  key={`${it.alimento_id}-${idx}`}
                  item={it}
                  alimento={mapaPorId.get(it.alimento_id)}
                  onAlterar={(novo) => setItens(prev => prev.map((x, i) => i === idx ? novo : x))}
                  onRemover={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          )}

          {itens.length > 0 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700 }}>TOTAL</span>
              <span style={{ fontSize: 15, color: COR_KCAL, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Math.round(totais.kcal)} kcal</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: COR_PROT, fontWeight: 600 }}>P {totais.p.toFixed(0)}g</span>
              <span style={{ fontSize: 10, color: COR_CARB, fontWeight: 600 }}>C {totais.c.toFixed(0)}g</span>
              <span style={{ fontSize: 10, color: COR_GORD, fontWeight: 600 }}>G {totais.g.toFixed(0)}g</span>
            </div>
          )}

          {itens.length === 0 && !lista.isLoading && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
              Busque e adicione alimentos acima.
            </p>
          )}
        </>
      )}

      {/* Modo: manual */}
      {modo === 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            ['KCAL', kcal, setKcal, 5000],
            ['PROT (g)', prot, setProt, 500],
            ['CARB (g)', carb, setCarb, 1000],
            ['GORD (g)', gord, setGord, 500],
          ].map(([label, val, set, max]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700 }}>{label}</span>
              <SafeInput type="number" inputMode="decimal" min={0} max={max} step={0.1} value={val} onChange={e => set(e.target.value)} style={inputSt} />
            </div>
          ))}
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={onCancelar} disabled={salvando}
          style={{ flex: 1, minHeight: 38, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={!podeSalvar}
          style={{ flex: 2, minHeight: 38, border: 'none', background: podeSalvar ? 'var(--color-accent)' : 'var(--color-surface-2)', color: podeSalvar ? '#fff' : 'var(--color-text-3)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
          {salvando ? 'Salvando...' : 'Salvar prato'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Alimentos ───────────────────────────────────────────

function AbaAlimentos({ userId, qc }) {
  const navigate = useNavigate()
  const [itens, setItens] = useState([])
  const [observacao, setObservacao] = useState('')

  const lista = useQuery({
    queryKey: ['alimentos', userId],
    queryFn: () => AlimentoService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const mapaPorId = useMemo(() => {
    const m = new Map()
    for (const a of (lista.data ?? [])) m.set(a.id, a)
    return m
  }, [lista.data])

  const idsUsados = useMemo(() => new Set(itens.map(i => i.alimento_id)), [itens])

  const totais = useMemo(() => {
    let kcal = 0, p = 0, c = 0, g = 0
    for (const it of itens) {
      const al = mapaPorId.get(it.alimento_id)
      if (!al || it.qtd_g <= 0) continue
      const m = macrosDeItem(al, it.qtd_g)
      kcal += m.kcal; p += m.p; c += m.c; g += m.g
    }
    return { kcal, p, c, g }
  }, [itens, mapaPorId])

  const salvar = useMutation({
    mutationFn: () => RefeicaoService.salvarPorAlimentos({
      userId,
      itens: itens.map(it => ({ alimento_id: it.alimento_id, qtd_g: it.qtd_g })),
      observacao: observacao.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refeicoes-dia', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      qc.invalidateQueries({ queryKey: ['recentes', userId] })
      toast.success('Refeição registrada!')
      setItens([]); setObservacao('')
    },
    onError: (e) => toast.error(e.message),
  })

  const podeSalvar = itens.length > 0 && itens.every(it => it.qtd_g > 0) && !salvar.isPending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <BuscaAlimentos userId={userId} itensIds={idsUsados} onAdicionar={(item) => setItens(prev => [...prev, item])} />
        </div>
        <button type="button" onClick={() => navigate('/dieta/alimentos')} aria-label="Catálogo" title="Gerenciar catálogo"
          style={{ width: 36, height: 38, border: '1px solid var(--color-border)', background: 'var(--color-bg)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-3)', alignSelf: 'flex-start' }}>
          <Settings size={14} aria-hidden />
        </button>
      </div>

      {itens.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((it, idx) => {
              const al = mapaPorId.get(it.alimento_id)
              if (!al) return null
              return (
                <ItemMontagem
                  key={`${it.alimento_id}-${idx}`}
                  item={it} alimento={al}
                  onAlterar={(novo) => setItens(prev => prev.map((x, i) => i === idx ? novo : x))}
                  onRemover={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                />
              )
            })}
          </div>

          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>TOTAL</span>
            <span style={{ fontSize: 16, color: COR_KCAL, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Math.round(totais.kcal)} kcal</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: COR_PROT, fontWeight: 600 }}>P {totais.p.toFixed(0)}g</span>
            <span style={{ fontSize: 11, color: COR_CARB, fontWeight: 600 }}>C {totais.c.toFixed(0)}g</span>
            <span style={{ fontSize: 11, color: COR_GORD, fontWeight: 600 }}>G {totais.g.toFixed(0)}g</span>
          </div>

          <SafeInput
            type="text" maxLength={200} value={observacao} onChange={e => setObservacao(e.target.value)}
            placeholder="Observação opcional (ex: almoço, sem sal)"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setItens([]); setObservacao('') }} disabled={salvar.isPending}
              style={{ flex: 1, minHeight: 42, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: salvar.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <X size={13} aria-hidden /> Limpar
            </button>
            <button type="button" onClick={() => salvar.mutate()} disabled={!podeSalvar}
              style={{ flex: 2, minHeight: 42, border: 'none', borderRadius: 10, background: podeSalvar ? 'var(--color-accent)' : 'var(--color-surface-2)', color: podeSalvar ? '#fff' : 'var(--color-text-3)', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: podeSalvar ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Check size={13} aria-hidden /> {salvar.isPending ? 'Salvando...' : 'Salvar refeição'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Recentes ────────────────────────────────────────────

function AbaRecentes({ userId, qc }) {
  const [selecionado, setSelecionado] = useState(null)

  const recentes = useQuery({
    queryKey: ['recentes', userId],
    queryFn: () => RefeicaoService.listarRecentes(userId, 10),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })

  const salvar = useMutation({
    mutationFn: (r) => RefeicaoService.salvar({
      userId,
      descricao: r.descricao_texto,
      calorias: r.calorias_confirmadas,
      proteina_g: r.proteina_g,
      carboidrato_g: r.carboidrato_g,
      gordura_g: r.gordura_g,
      classificacao: null,
      origem: 'recente',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refeicoes-dia', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Refeição registrada!')
      setSelecionado(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const salvarPrato = useMutation({
    mutationFn: (r) => PratoFixoService.salvar({
      userId,
      nome:          r.descricao_texto,
      calorias_kcal: r.calorias_confirmadas,
      proteina_g:    r.proteina_g,
      carboidrato_g: r.carboidrato_g,
      gordura_g:     r.gordura_g,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pratos-fixos', userId] })
      toast.success('Salvo como prato fixo!')
    },
    onError: (e) => toast.error(e.message),
  })

  if (recentes.isLoading) return <Skeleton width="100%" height={48} radius={12} />
  if (recentes.isError) return <p style={{ fontSize: 12, color: '#EF4444' }}>{recentes.error?.message}</p>
  if (!recentes.data?.length) return (
    <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '12px 0' }}>
      Nenhuma refeição nos últimos 30 dias.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {selecionado && (
        <QuickConfirm
          titulo={selecionado.descricao_texto}
          macros={{ kcal: selecionado.calorias_confirmadas, p: selecionado.proteina_g, c: selecionado.carboidrato_g, g: selecionado.gordura_g }}
          onSalvar={() => salvar.mutate(selecionado)}
          onCancelar={() => setSelecionado(null)}
          salvando={salvar.isPending}
        >
          <button type="button" onClick={() => salvarPrato.mutate(selecionado)} disabled={salvarPrato.isPending}
            style={{ fontSize: 11, color: 'var(--color-text-2)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Bookmark size={11} aria-hidden />
            {salvarPrato.isPending ? 'Salvando...' : 'Salvar como prato fixo'}
          </button>
        </QuickConfirm>
      )}
      {recentes.data.map(r => (
        <button key={r.id} type="button" onClick={() => setSelecionado(s => s?.id === r.id ? null : r)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
            background: selecionado?.id === r.id ? 'rgba(249,115,22,0.08)' : 'var(--color-bg)',
            border: `1px solid ${selecionado?.id === r.id ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'}`,
            borderRadius: 12, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {r.descricao_texto}
          </p>
          <MacrosBadges kcal={r.calorias_confirmadas} p={r.proteina_g} c={r.carboidrato_g} g={r.gordura_g} size={10} />
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Pratos fixos ────────────────────────────────────────

function AbaPratos({ userId, qc }) {
  const [selecionado, setSelecionado]         = useState(null)
  const [criando, setCriando]                 = useState(false)
  const [editando, setEditando]               = useState(null)
  const [expandido, setExpandido]             = useState(null)
  const [confirmandoDeletar, setConfirmando]  = useState(null) // id do prato

  const pratos = useQuery({
    queryKey: ['pratos-fixos', userId],
    queryFn: () => PratoFixoService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const salvarRefeicao = useMutation({
    mutationFn: (p) => RefeicaoService.salvarDePratoFixo(p.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refeicoes-dia', userId] })
      qc.invalidateQueries({ queryKey: ['resumo-diario'] })
      toast.success('Refeição registrada!')
      setSelecionado(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const criar = useMutation({
    mutationFn: (dados) => PratoFixoService.salvar({ userId, ...dados }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pratos-fixos', userId] })
      toast.success('Prato criado!')
      setCriando(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, dados }) => PratoFixoService.salvar({ userId, id, ...dados }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pratos-fixos', userId] })
      toast.success('Prato atualizado!')
      setEditando(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const deletar = useMutation({
    mutationFn: (id) => PratoFixoService.deletar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pratos-fixos', userId] })
      toast.success('Prato removido.')
      setSelecionado(null)
    },
    onError: (e) => toast.error(e.message),
  })

  if (pratos.isLoading) return <Skeleton width="100%" height={48} radius={12} />
  if (pratos.isError) return <p style={{ fontSize: 12, color: '#EF4444' }}>{pratos.error?.message}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* QuickConfirm ao selecionar */}
      {selecionado && !editando && (
        <QuickConfirm
          titulo={selecionado.nome}
          macros={{ kcal: selecionado.calorias_kcal, p: selecionado.proteina_g, c: selecionado.carboidrato_g, g: selecionado.gordura_g }}
          onSalvar={() => salvarRefeicao.mutate(selecionado)}
          onCancelar={() => setSelecionado(null)}
          salvando={salvarRefeicao.isPending}
        >
          {(selecionado.prato_fixo_alimento ?? []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
              {selecionado.prato_fixo_alimento.map(pfa => (
                <div key={pfa.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--color-text-2)' }}>{pfa.alimento_nome} <span style={{ color: 'var(--color-text-3)' }}>{pfa.qtd_g}g</span></span>
                  <span style={{ color: COR_KCAL, fontWeight: 600 }}>{Math.round(pfa.calorias)} kcal</span>
                </div>
              ))}
            </div>
          )}
        </QuickConfirm>
      )}

      {/* Form de criação */}
      {criando && (
        <FormPrato
          userId={userId}
          onSalvar={(dados) => criar.mutate(dados)}
          onCancelar={() => setCriando(false)}
          salvando={criar.isPending}
        />
      )}

      {/* Form de edição */}
      {editando && (
        <FormPrato
          userId={userId}
          valorInicial={editando}
          onSalvar={(dados) => atualizar.mutate({ id: editando.id, dados })}
          onCancelar={() => setEditando(null)}
          salvando={atualizar.isPending}
        />
      )}

      {/* Botão novo prato */}
      {!criando && (
        <button type="button"
          onClick={() => { setCriando(true); setSelecionado(null); setEditando(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--color-border)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, width: '100%' }}>
          <Plus size={14} color="var(--color-accent)" aria-hidden />
          Novo prato fixo
        </button>
      )}

      {(pratos.data ?? []).length === 0 && !criando && (
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '8px 0' }}>
          Nenhum prato fixo cadastrado.
        </p>
      )}

      {/* Lista de pratos */}
      {(pratos.data ?? []).map(p => {
        if (editando?.id === p.id) return null
        const sel  = selecionado?.id === p.id
        const temItens = (p.prato_fixo_alimento ?? []).length > 0
        const exp  = expandido === p.id

        return (
          <div key={p.id} style={{
            background: sel ? 'rgba(249,115,22,0.08)' : 'var(--color-bg)',
            border: `1px solid ${sel ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'}`,
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
              <button type="button"
                onClick={() => { setSelecionado(s => s?.id === p.id ? null : p); setEditando(null) }}
                style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{p.nome}</p>
                <MacrosBadges kcal={p.calorias_kcal} p={p.proteina_g} c={p.carboidrato_g} g={p.gordura_g} size={10} />
              </button>

              {temItens && (
                <button type="button"
                  onClick={() => setExpandido(v => v === p.id ? null : p.id)}
                  aria-label="Ver ingredientes"
                  style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                  <List size={12} aria-hidden />
                </button>
              )}

              <button type="button"
                onClick={() => { setEditando(p); setSelecionado(null); setCriando(false); setExpandido(null) }}
                aria-label="Editar"
                style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                <Edit3 size={13} aria-hidden />
              </button>

              {confirmandoDeletar === p.id ? (
                <>
                  <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Remover?</span>
                  <button type="button" onClick={() => setConfirmando(null)}
                    style={{ padding: '3px 8px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 11, cursor: 'pointer' }}>
                    Não
                  </button>
                  <button type="button" onClick={() => { setConfirmando(null); deletar.mutate(p.id) }}
                    style={{ padding: '3px 8px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Sim
                  </button>
                </>
              ) : (
                <button type="button"
                  onClick={() => setConfirmando(p.id)}
                  aria-label="Deletar"
                  style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                  <Trash2 size={13} aria-hidden />
                </button>
              )}
            </div>

            {/* Ingredientes expandíveis */}
            {temItens && exp && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.prato_fixo_alimento.map(pfa => (
                  <div key={pfa.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--color-text-2)' }}>{pfa.alimento_nome} <span style={{ color: 'var(--color-text-3)' }}>{pfa.qtd_g}g</span></span>
                    <span style={{ color: 'var(--color-text-3)' }}>{Math.round(pfa.calorias)} kcal · P {Math.round(pfa.proteina_g)}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

const ABAS = [
  { id: 'alimentos', label: 'Alimentos',    icon: Search   },
  { id: 'pratos',    label: 'Pratos fixos', icon: Bookmark },
  { id: 'recentes',  label: 'Recentes',     icon: Clock    },
]

export default function MontarPorAlimentos() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const qc = useQueryClient()
  const [aba, setAba] = useState('alimentos')

  return (
    <section style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>MONTAR POR ALIMENTOS</p>

      <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
        {ABAS.map(({ id, label, icon: Icon }) => {
          const ativo = aba === id
          return (
            <button key={id} type="button" onClick={() => setAba(id)}
              style={{
                flex: 1, minHeight: 34, border: 'none', borderRadius: 8,
                background: ativo ? 'var(--color-surface)' : 'transparent',
                color: ativo ? 'var(--color-text)' : 'var(--color-text-3)',
                fontFamily: ativo ? 'var(--font-heading)' : 'inherit',
                fontSize: 11, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              }}>
              <Icon size={11} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>

      {aba === 'alimentos' && <AbaAlimentos userId={userId} qc={qc} />}
      {aba === 'recentes'  && <AbaRecentes  userId={userId} qc={qc} />}
      {aba === 'pratos'    && <AbaPratos    userId={userId} qc={qc} />}
    </section>
  )
}
