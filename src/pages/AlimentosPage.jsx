import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Search, Lock, Trash2, Edit3, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import BottomNav from '../components/ui/BottomNav'
import Skeleton from '../components/ui/Skeleton'
import SafeInput from '../components/ui/SafeInput'
import { useAuth } from '../contexts/AuthContext'
import AlimentoService from '../services/AlimentoService'

const NAV_H = 65

function FormAlimento({ valorInicial, onSalvar, onCancelar, salvando }) {
  const [v, setV] = useState(() => ({
    nome:                 valorInicial?.nome ?? '',
    calorias_kcal_100g:   valorInicial?.calorias_kcal_100g != null ? String(valorInicial.calorias_kcal_100g) : '',
    proteina_g_100g:      valorInicial?.proteina_g_100g    != null ? String(valorInicial.proteina_g_100g)    : '',
    carboidrato_g_100g:   valorInicial?.carboidrato_g_100g != null ? String(valorInicial.carboidrato_g_100g) : '',
    gordura_g_100g:       valorInicial?.gordura_g_100g     != null ? String(valorInicial.gordura_g_100g)     : '',
    unidade_padrao_g:     valorInicial?.unidade_padrao_g   != null ? String(valorInicial.unidade_padrao_g)   : '',
    unidade_padrao_label: valorInicial?.unidade_padrao_label ?? '',
  }))

  function set(campo, valor) { setV(prev => ({ ...prev, [campo]: valor })) }

  function submit(e) {
    e.preventDefault()
    onSalvar({
      nome: v.nome,
      calorias_kcal_100g: v.calorias_kcal_100g,
      proteina_g_100g: v.proteina_g_100g,
      carboidrato_g_100g: v.carboidrato_g_100g,
      gordura_g_100g: v.gordura_g_100g,
      unidade_padrao_g: v.unidade_padrao_g === '' ? null : v.unidade_padrao_g,
      unidade_padrao_label: v.unidade_padrao_label.trim() || null,
    })
  }

  const inputBase = {
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 10, padding: '10px 12px', fontSize: 14,
    color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const labelBase = { fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="al-nome" style={labelBase}>NOME</label>
        <SafeInput
          id="al-nome"
          type="text"
          maxLength={100}
          value={v.nome}
          onChange={e => set('nome', e.target.value)}
          placeholder="Ex: Arroz integral cozido"
          style={inputBase}
          required
        />
      </div>

      <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 4 }}>
        VALORES POR 100g
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Campo label="KCAL"   id="al-kcal" value={v.calorias_kcal_100g} onChange={x => set('calorias_kcal_100g', x)} max={999.9} step={0.1} />
        <Campo label="PROT (g)" id="al-prot" value={v.proteina_g_100g}    onChange={x => set('proteina_g_100g',    x)} max={100}   step={0.1} />
        <Campo label="CARB (g)" id="al-carb" value={v.carboidrato_g_100g} onChange={x => set('carboidrato_g_100g', x)} max={100}   step={0.1} />
        <Campo label="GORD (g)" id="al-gord" value={v.gordura_g_100g}     onChange={x => set('gordura_g_100g',     x)} max={100}   step={0.1} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 4 }}>
        UNIDADE PRÁTICA (OPCIONAL)
      </p>
      <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: -8 }}>
        Ex: 1 ovo = 50g. Permite registrar em unidades em vez de gramas.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
        <Campo label="GRAMAS" id="al-up-g" value={v.unidade_padrao_g} onChange={x => set('unidade_padrao_g', x)} max={9999} step={0.1} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="al-up-label" style={labelBase}>RÓTULO</label>
          <SafeInput
            id="al-up-label"
            type="text"
            maxLength={40}
            value={v.unidade_padrao_label}
            onChange={e => set('unidade_padrao_label', e.target.value)}
            placeholder="1 unidade (50g)"
            style={inputBase}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          style={{
            flex: 1, minHeight: 46, border: '1px solid var(--color-border)',
            background: 'var(--color-bg)', color: 'var(--color-text-2)',
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: salvando ? 'not-allowed' : 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          style={{
            flex: 2, minHeight: 46, border: 'none',
            background: 'var(--color-accent)', color: '#fff',
            borderRadius: 12, fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
            cursor: salvando ? 'not-allowed' : 'pointer',
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar alimento'}
        </button>
      </div>
    </form>
  )
}

function Campo({ label, id, value, onChange, max, step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>{label}</label>
      <SafeInput
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 10, padding: '10px 12px', fontSize: 14,
          color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function CardAlimento({ alimento, onEditar, onDeletar }) {
  const ehPredef = AlimentoService.isPredefinido(alimento)
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {alimento.nome}
          </p>
          {ehPredef && <Lock size={11} color="var(--color-text-3)" aria-label="Predefinido (somente leitura)" />}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
          {Math.round(alimento.calorias_kcal_100g)} kcal/100g · P {alimento.proteina_g_100g}g · C {alimento.carboidrato_g_100g}g · G {alimento.gordura_g_100g}g
        </p>
        {alimento.unidade_padrao_label && (
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2, fontStyle: 'italic' }}>
            {alimento.unidade_padrao_label}
          </p>
        )}
      </div>
      {!ehPredef && (
        confirmando ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginRight: 4 }}>Remover?</span>
            <button type="button" onClick={() => setConfirmando(false)}
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 12, cursor: 'pointer' }}>
              Não
            </button>
            <button type="button" onClick={() => { setConfirmando(false); onDeletar(alimento) }}
              style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Sim
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => onEditar(alimento)}
              aria-label="Editar"
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Edit3 size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label="Deletar"
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        )
      )}
    </div>
  )
}

export default function AlimentosPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session?.user?.id
  const qc = useQueryClient()

  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)  // null | 'novo' | objeto alimento
  const ehNovo = editando === 'novo'

  const lista = useQuery({
    queryKey: ['alimentos', userId],
    queryFn: () => AlimentoService.listar(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista.data ?? []
    return (lista.data ?? []).filter(a => a.nome.toLowerCase().includes(q))
  }, [lista.data, busca])

  const proprios = filtrados.filter(a => !AlimentoService.isPredefinido(a))
  const predefs  = filtrados.filter(a =>  AlimentoService.isPredefinido(a))

  const criar = useMutation({
    mutationFn: (dados) => AlimentoService.criar(userId, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alimentos', userId] })
      toast.success('Alimento criado!')
      setEditando(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, dados }) => AlimentoService.atualizar(id, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alimentos', userId] })
      toast.success('Alimento atualizado!')
      setEditando(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const deletar = useMutation({
    mutationFn: (id) => AlimentoService.deletar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alimentos', userId] })
      toast.success('Alimento removido.')
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSalvar(dados) {
    if (ehNovo) criar.mutate(dados)
    else atualizar.mutate({ id: editando.id, dados })
  }

  function handleDeletar(alimento) {
    deletar.mutate(alimento.id)
  }

  const salvando = criar.isPending || atualizar.isPending

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: NAV_H + 16 }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 16px',
      }}>
        <button
          type="button"
          onClick={() => navigate('/dieta')}
          aria-label="Voltar"
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, flex: 1 }}>Alimentos</h1>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando('novo')}
            aria-label="Novo alimento"
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} aria-hidden />
          </button>
        )}
      </header>

      <main style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {editando ? (
          <section style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1 }}>
                {ehNovo ? 'NOVO ALIMENTO' : 'EDITAR ALIMENTO'}
              </p>
              <button
                type="button"
                onClick={() => setEditando(null)}
                aria-label="Fechar"
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <FormAlimento
              valorInicial={ehNovo ? null : editando}
              onSalvar={handleSalvar}
              onCancelar={() => setEditando(null)}
              salvando={salvando}
            />
          </section>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--color-text-3)" aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <SafeInput
                type="search"
                maxLength={60}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar alimento..."
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 12, minHeight: 44, padding: '10px 12px 10px 36px', fontSize: 14,
                  color: 'var(--color-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>

            {lista.isLoading && (
              <>
                <Skeleton width="100%" height={62} radius={14} />
                <Skeleton width="100%" height={62} radius={14} />
                <Skeleton width="100%" height={62} radius={14} />
              </>
            )}

            {lista.isError && (
              <div style={{ background: 'var(--color-surface)', border: '1px solid #EF444440', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#EF4444' }}>{lista.error?.message || 'Erro ao carregar alimentos.'}</p>
              </div>
            )}

            {!lista.isLoading && proprios.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>MEUS ALIMENTOS</p>
                {proprios.map(a => (
                  <CardAlimento key={a.id} alimento={a} onEditar={setEditando} onDeletar={handleDeletar} />
                ))}
              </section>
            )}

            {!lista.isLoading && predefs.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>PREDEFINIDOS</p>
                {predefs.map(a => (
                  <CardAlimento key={a.id} alimento={a} onEditar={setEditando} onDeletar={handleDeletar} />
                ))}
              </section>
            )}

            {!lista.isLoading && filtrados.length === 0 && (
              <div style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
                  {busca ? 'Nenhum alimento encontrado.' : 'Nenhum alimento cadastrado.'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
