import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Pencil, Trash2, CreditCard, Tag, Repeat, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import Skeleton from '../ui/Skeleton'
import ModalConfirmacao from '../ui/ModalConfirmacao'
import ModalCartao from './ModalCartao'
import ModalCategoria from './ModalCategoria'
import ModalRecorrente from './ModalRecorrente'
import CartaoService from '../../services/CartaoService'
import CategoriaService from '../../services/CategoriaService'
import RecorrenteService from '../../services/RecorrenteService'

function formatarBR(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function rotuloPeriodicidade(p, dia) {
  if (p === 'mensal') return `Todo dia ${dia} do mês`
  if (p === 'anual')  return `Anual (dia ${dia})`
  const dias = ['', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados', 'Domingos']
  return `Toda ${dias[dia] ?? 'semana'}`
}

export default function SecaoConfiguracoes({ userId }) {
  const [aberta, setAberta] = useState(false)

  return (
    <section style={{ padding: '0 20px 16px' }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setAberta(v => !v)}
          style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Settings size={13} color="var(--color-text-3)" aria-hidden />
          <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700, flex: 1, textAlign: 'left', letterSpacing: 0.4 }}>
            CONFIGURAÇÕES FINANCEIRAS
          </span>
          <ChevronDown size={16} color="var(--color-text-3)" aria-hidden
            style={{ transform: aberta ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>

        {aberta && (
          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SubsecaoCartoes userId={userId} />
            <SubsecaoCategorias userId={userId} />
            <SubsecaoRecorrentes userId={userId} />
          </div>
        )}
      </div>
    </section>
  )
}

function Bloco({ titulo, Icone, children, onAdicionar, tituloBotao }) {
  return (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
        <Icone size={14} color="var(--color-text-2)" aria-hidden />
        <p style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', letterSpacing: 0.3 }}>
          {titulo.toUpperCase()}
        </p>
        <button
          type="button"
          onClick={onAdicionar}
          aria-label={tituloBotao}
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-accent)',
          }}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
      <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function Item({ titulo, subtitulo, onEditar, onExcluir, opaco = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 10,
      opacity: opaco ? 0.55 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {titulo}
        </p>
        {subtitulo && (
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitulo}
          </p>
        )}
      </div>
      <button type="button" onClick={onEditar} aria-label="Editar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-2)', padding: 6, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Pencil size={14} aria-hidden />
      </button>
      <button type="button" onClick={onExcluir} aria-label="Excluir"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 6, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  )
}

function SubsecaoCartoes({ userId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // { cartao? } | null  | 'novo'
  const [confirm, setConfirm] = useState(null)

  const { data: cartoes = [], isLoading } = useQuery({
    queryKey: ['cartoes-config', userId],
    queryFn: () => CartaoService.listar(userId),
    enabled: !!userId,
  })

  const excluir = useMutation({
    mutationFn: (id) => CartaoService.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoes', userId] })
      qc.invalidateQueries({ queryKey: ['cartoes-config', userId] })
      toast.success('Cartão excluído.')
      setConfirm(null)
    },
    onError: (e) => { toast.error(e.message); setConfirm(null) },
  })

  return (
    <>
      <Bloco titulo="Cartões" Icone={CreditCard} tituloBotao="Novo cartão" onAdicionar={() => setModal('novo')}>
        {isLoading && <Skeleton width="100%" height={44} radius={10} />}
        {!isLoading && cartoes.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '8px 0' }}>
            Nenhum cartão cadastrado.
          </p>
        )}
        {!isLoading && cartoes.map(c => (
          <Item
            key={c.id}
            titulo={c.nome}
            subtitulo={`Vencimento dia ${c.dia_vencimento}${c.ativo ? '' : ' · inativo'}`}
            opaco={!c.ativo}
            onEditar={() => setModal({ cartao: c })}
            onExcluir={() => setConfirm(c)}
          />
        ))}
      </Bloco>

      {modal === 'novo' && (
        <ModalCartao userId={userId} onFechar={() => { setModal(null); qc.invalidateQueries({ queryKey: ['cartoes-config', userId] }) }} />
      )}
      {modal?.cartao && (
        <ModalCartao userId={userId} cartao={modal.cartao} onFechar={() => { setModal(null); qc.invalidateQueries({ queryKey: ['cartoes-config', userId] }) }} />
      )}
      {confirm && (
        <ModalConfirmacao
          titulo="Excluir cartão?"
          descricao={`"${confirm.nome}" será removido. Transações já vinculadas ficam sem cartão.`}
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirm.id)}
          onFechar={() => setConfirm(null)}
        />
      )}
    </>
  )
}

function SubsecaoCategorias({ userId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-config', userId],
    queryFn: () => CategoriaService.listar(userId),
    enabled: !!userId,
  })

  const excluir = useMutation({
    mutationFn: (id) => CategoriaService.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias', userId] })
      qc.invalidateQueries({ queryKey: ['categorias-config', userId] })
      toast.success('Categoria excluída.')
      setConfirm(null)
    },
    onError: (e) => { toast.error(e.message); setConfirm(null) },
  })

  return (
    <>
      <Bloco titulo="Categorias" Icone={Tag} tituloBotao="Nova categoria" onAdicionar={() => setModal('novo')}>
        {isLoading && <Skeleton width="100%" height={44} radius={10} />}
        {!isLoading && categorias.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '8px 0' }}>
            Nenhuma categoria cadastrada.
          </p>
        )}
        {!isLoading && categorias.map(c => {
          const subtitulo = c.orcamento_mensal_reais
            ? `Orçamento R$ ${formatarBR(c.orcamento_mensal_reais)}${c.alerta_ativo ? ' · alerta ativo' : ''}`
            : 'Sem orçamento'
          return (
            <Item
              key={c.id}
              titulo={c.nome}
              subtitulo={subtitulo}
              onEditar={() => setModal({ categoria: c })}
              onExcluir={() => setConfirm(c)}
            />
          )
        })}
      </Bloco>

      {modal === 'novo' && (
        <ModalCategoria userId={userId} onFechar={() => { setModal(null); qc.invalidateQueries({ queryKey: ['categorias-config', userId] }) }} />
      )}
      {modal?.categoria && (
        <ModalCategoria userId={userId} categoria={modal.categoria} onFechar={() => { setModal(null); qc.invalidateQueries({ queryKey: ['categorias-config', userId] }) }} />
      )}
      {confirm && (
        <ModalConfirmacao
          titulo="Excluir categoria?"
          descricao={`"${confirm.nome}" será removida. Transações já vinculadas ficam sem categoria.`}
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirm.id)}
          onFechar={() => setConfirm(null)}
        />
      )}
    </>
  )
}

function SubsecaoRecorrentes({ userId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const { data: recorrentes = [], isLoading } = useQuery({
    queryKey: ['recorrentes', userId],
    queryFn: () => RecorrenteService.listar(userId),
    enabled: !!userId,
  })

  const excluir = useMutation({
    mutationFn: (id) => RecorrenteService.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recorrentes', userId] })
      toast.success('Recorrente excluída.')
      setConfirm(null)
    },
    onError: (e) => { toast.error(e.message); setConfirm(null) },
  })

  return (
    <>
      <Bloco titulo="Recorrentes" Icone={Repeat} tituloBotao="Nova recorrente" onAdicionar={() => setModal('novo')}>
        {isLoading && <Skeleton width="100%" height={44} radius={10} />}
        {!isLoading && recorrentes.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '8px 0' }}>
            Nenhuma recorrência cadastrada.
          </p>
        )}
        {!isLoading && recorrentes.map(r => {
          const sinal = Number(r.valor) >= 0 ? '+' : '−'
          const titulo = `${sinal} R$ ${formatarBR(Math.abs(Number(r.valor)))} — ${r.descricao}`
          const subtitulo = `${rotuloPeriodicidade(r.periodicidade, r.dia_lancamento)}${r.ativa ? '' : ' · pausada'}`
          return (
            <Item
              key={r.id}
              titulo={titulo}
              subtitulo={subtitulo}
              opaco={!r.ativa}
              onEditar={() => setModal({ recorrente: r })}
              onExcluir={() => setConfirm(r)}
            />
          )
        })}
      </Bloco>

      {modal === 'novo' && (
        <ModalRecorrente userId={userId} onFechar={() => setModal(null)} />
      )}
      {modal?.recorrente && (
        <ModalRecorrente userId={userId} recorrente={modal.recorrente} onFechar={() => setModal(null)} />
      )}
      {confirm && (
        <ModalConfirmacao
          titulo="Excluir recorrente?"
          descricao={`"${confirm.descricao}" será cancelada. Transações já lançadas permanecem.`}
          confirmar="Excluir"
          salvando={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirm.id)}
          onFechar={() => setConfirm(null)}
        />
      )}
    </>
  )
}
