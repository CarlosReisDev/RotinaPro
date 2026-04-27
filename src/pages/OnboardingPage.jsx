import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Flame } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PerfilService from '../services/PerfilService'
import SafeInput from '../components/ui/SafeInput'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 5

const OBJETIVOS = [
  { value: 'emagrecer',   label: 'Perder peso',    desc: 'Déficit calórico controlado',    icon: '↓' },
  { value: 'manter',      label: 'Manter forma',   desc: 'Equilíbrio calórico',             icon: '=' },
  { value: 'ganharMassa', label: 'Ganhar massa',   desc: 'Superávit para hipertrofia',      icon: '↑' },
]

const NIVEIS = [
  { value: 'sedentario',       label: 'Sedentário',        desc: 'Pouco ou nenhum exercício' },
  { value: 'leveAtivo',        label: 'Levemente ativo',   desc: 'Exercício 1–3x por semana' },
  { value: 'moderadoAtivo',    label: 'Moderadamente ativo', desc: 'Exercício 3–5x por semana' },
  { value: 'muitoAtivo',       label: 'Muito ativo',       desc: 'Exercício intenso 6–7x por semana' },
]

const pressHandlers = {
  onMouseDown:  e => { e.currentTarget.style.transform = 'scale(0.97)' },
  onMouseUp:    e => { e.currentTarget.style.transform = 'scale(1)' },
  onTouchStart: e => { e.currentTarget.style.transform = 'scale(0.97)' },
  onTouchEnd:   e => { e.currentTarget.style.transform = 'scale(1)' },
}

function calcularIdade(dataNascimento) {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

// ─── Componentes de UI ──────────────────────────────────────

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 99,
          background: i < step ? 'var(--color-accent)' : 'var(--color-surface-2)',
          transition: 'background 300ms ease',
        }} />
      ))}
    </div>
  )
}

function StepHeader({ title, subtitle, onBack, step }) {
  return (
    <div style={{ padding: '12px 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {step > 1 && (
          <button type="button" onClick={onBack} aria-label="Voltar" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text)',
            transition: 'opacity var(--t-fast)',
          }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <span style={{ color: 'var(--color-text-3)', fontSize: 13, marginLeft: step === 1 ? 0 : 4 }}>
          Passo {step} de {TOTAL_STEPS}
        </span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--color-text-2)', fontSize: 15 }}>{subtitle}</p>}
    </div>
  )
}

function Input({ label, id, ...props }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={inputId} style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 500 }}>{label}</label>
      <SafeInput id={inputId} {...props} style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 16,
        color: 'var(--color-text)',
        width: '100%',
        outline: 'none',
        transition: 'border-color var(--t-fast)',
        fontFamily: 'var(--font-body)',
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
      />
    </div>
  )
}

function BtnPrimario({ children, onClick, disabled, loading }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
      style={{
        width: '100%', padding: '15px 20px',
        background: disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
        color: disabled ? 'var(--color-text-3)' : '#fff',
        border: 'none', borderRadius: 14,
        fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--t-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        minHeight: 52,
      }}>
      {loading
        ? <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : children}
    </button>
  )
}

// ─── Steps ──────────────────────────────────────────────────

function Step1({ dados, set, onNext }) {
  const valido = dados.nome.trim().length >= 2 && dados.sexo && dados.dataNascimento && dados.alturaCm && dados.pesoKg

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Seu nome" type="text" placeholder="Como você se chama?" value={dados.nome}
        maxLength={80}
        onChange={e => set('nome', e.target.value)} autoFocus />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 500 }}>Sexo biológico</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }].map(({ v, l }) => (
            <button type="button" key={v} onClick={() => set('sexo', v)} {...pressHandlers} style={{
              flex: 1, padding: '14px 10px',
              background: dados.sexo === v ? 'var(--color-accent)' : 'var(--color-surface)',
              border: `1px solid ${dados.sexo === v ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 12, color: dados.sexo === v ? '#fff' : 'var(--color-text-2)',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'all var(--t-fast)', minHeight: 48,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <Input label="Data de nascimento" type="date" value={dados.dataNascimento}
        onChange={e => set('dataNascimento', e.target.value)}
        style={{ colorScheme: 'dark' }} />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Input label="Altura (cm)" type="number" inputMode="numeric" placeholder="175"
            value={dados.alturaCm} onChange={e => set('alturaCm', e.target.value)} min={80} max={260} />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Peso (kg)" type="number" inputMode="decimal" placeholder="75"
            value={dados.pesoKg} onChange={e => set('pesoKg', e.target.value)} min={20} max={400} />
        </div>
      </div>

      <BtnPrimario onClick={onNext} disabled={!valido}>
        Continuar <ChevronRight size={18} />
      </BtnPrimario>
    </div>
  )
}

function Step2({ dados, set, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {OBJETIVOS.map(({ value, label, desc, icon }) => (
        <button type="button" key={value} onClick={() => { set('objetivo', value); onNext() }} {...pressHandlers} style={{
          background: dados.objetivo === value ? 'rgba(249,115,22,0.12)' : 'var(--color-surface)',
          border: `1.5px solid ${dados.objetivo === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', textAlign: 'left',
          transition: 'all var(--t-fast)', minHeight: 72,
        }}>
          <span style={{ fontSize: 24, lineHeight: 1, width: 36, textAlign: 'center', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{desc}</div>
          </div>
          {dados.objetivo === value && <Check size={18} color="var(--color-accent)" style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  )
}

function Step3({ dados, set, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {NIVEIS.map(({ value, label, desc }) => (
        <button type="button" key={value} onClick={() => { set('nivelAtividade', value); onNext() }} {...pressHandlers} style={{
          background: dados.nivelAtividade === value ? 'rgba(249,115,22,0.12)' : 'var(--color-surface)',
          border: `1.5px solid ${dados.nivelAtividade === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', textAlign: 'left',
          transition: 'all var(--t-fast)', minHeight: 64,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{desc}</div>
          </div>
          {dados.nivelAtividade === value && <Check size={18} color="var(--color-accent)" />}
        </button>
      ))}
    </div>
  )
}

function Step4({ dados, set, onNext }) {
  const valido = dados.diasTreino >= 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[1,2,3,4,5,6,7].map(n => (
          <button type="button" key={n} onClick={() => set('diasTreino', n)} {...pressHandlers} style={{
            width: 52, height: 52, borderRadius: 14,
            background: dados.diasTreino === n ? 'var(--color-accent)' : 'var(--color-surface)',
            border: `1.5px solid ${dados.diasTreino === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
            color: dados.diasTreino === n ? '#fff' : 'var(--color-text-2)',
            fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
            cursor: 'pointer', transition: 'all var(--t-fast)',
          }}>{n}</button>
        ))}
      </div>
      {dados.diasTreino > 0 && (
        <p style={{ color: 'var(--color-text-2)', fontSize: 14 }}>
          {dados.diasTreino === 1 ? '1 dia' : `${dados.diasTreino} dias`} de treino por semana
        </p>
      )}
      <BtnPrimario onClick={onNext} disabled={!valido}>
        Calcular minha meta <ChevronRight size={18} />
      </BtnPrimario>
    </div>
  )
}

function MacroInput({ label, campo, value, color, setMacro, max = 1000 }) {
  const inputId = `macro-${campo}`
  return (
    <div style={{ flex: 1, background: 'var(--color-surface)', border: `1.5px solid ${color}22`, borderRadius: 12, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <label htmlFor={inputId} style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <SafeInput
          id={inputId}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          min={0}
          max={max}
          onChange={e => setMacro(campo, e.target.value)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700,
            color, width: 60, textAlign: 'center', padding: 0,
          }}
          onFocus={e => e.target.select()}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>g</span>
      </div>
    </div>
  )
}

function Step5({ metaCalculada, macros, setMacro, onSalvar, loading }) {
  if (!metaCalculada) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <span style={{ width: 32, height: 32, border: '2px solid var(--color-border)', borderTop: '2px solid var(--color-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* TMB / TDEE */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'TMB',  value: Math.round(metaCalculada.tmb),  desc: 'Em repouso' },
          { label: 'TDEE', value: Math.round(metaCalculada.tdee), desc: 'Gasto total' },
        ].map(({ label, value, desc }) => (
          <div key={label} style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Meta calórica editável */}
      <div style={{ background: 'rgba(249,115,22,0.08)', border: '1.5px solid var(--color-accent)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <label htmlFor="macro-kcal" style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--color-accent)', display: 'block' }}>META CALÓRICA DIÁRIA</label>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Toque nos valores para ajustar</div>
          </div>
          <Flame size={20} color="var(--color-accent)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SafeInput
            id="macro-kcal"
            type="number"
            inputMode="numeric"
            value={macros.kcal ?? ''}
            min={800}
            max={8000}
            onChange={e => setMacro('kcal', e.target.value)}
            onFocus={e => e.target.select()}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 10, padding: '10px 14px', fontSize: 28,
              color: 'var(--color-text)', fontFamily: 'var(--font-heading)', fontWeight: 700,
              width: 130, outline: 'none',
            }}
          />
          <span style={{ color: 'var(--color-text-2)', fontSize: 15 }}>kcal/dia</span>
        </div>
      </div>

      {/* Macros editáveis */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>MACRONUTRIENTES</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <MacroInput label="Proteína" campo="proteina" value={macros.proteina} color="#3B82F6" setMacro={setMacro} max={600} />
          <MacroInput label="Carb"     campo="carb"     value={macros.carb}     color="#22C55E" setMacro={setMacro} max={1000} />
          <MacroInput label="Gordura"  campo="gordura"  value={macros.gordura}  color="#EAB308" setMacro={setMacro} max={400} />
        </div>
      </div>

      <BtnPrimario onClick={onSalvar} loading={loading}>
        <Check size={18} /> Começar
      </BtnPrimario>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────

export default function OnboardingPage() {
  const { session, setPerfil } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [metaCalculada, setMetaCalculada] = useState(null)
  const [macros, setMacros] = useState({ kcal: null, proteina: null, carb: null, gordura: null })

  function setMacro(campo, valor) {
    setMacros(prev => ({ ...prev, [campo]: valor === '' ? '' : Number(valor) }))
  }

  const [dados, setDados] = useState({
    nome: '', sexo: '', dataNascimento: '', alturaCm: '', pesoKg: '',
    objetivo: '', nivelAtividade: '', diasTreino: 0,
  })

  function set(campo, valor) {
    setDados(prev => ({ ...prev, [campo]: valor }))
  }

  async function proximoPasso() {
    if (step === 4) {
      // Ao avançar para o step 5, calcula a meta
      setStep(5)
      try {
        const idade = calcularIdade(dados.dataNascimento)
        const resultado = await PerfilService.calcularMeta({
          peso: Number(dados.pesoKg),
          altura: Number(dados.alturaCm),
          idade,
          sexo: dados.sexo,
          nivelAtividade: dados.nivelAtividade,
          objetivo: dados.objetivo,
        })
        setMetaCalculada(resultado)
        setMacros({
          kcal:     Math.round(resultado.meta_calorica),
          proteina: Math.round(resultado.meta_proteina_g),
          carb:     Math.round(resultado.meta_carboidrato_g),
          gordura:  Math.round(resultado.meta_gordura_g),
        })
      } catch {
        toast.error('Erro ao calcular meta. Tente novamente.')
        setStep(4)
      }
      return
    }
    setStep(s => s + 1)
  }

  function voltarPasso() {
    setStep(s => Math.max(1, s - 1))
  }

  async function salvar() {
    if (!session?.user) {
      toast.error('Sessão expirada. Faça login novamente.')
      navigate('/login')
      return
    }
    setLoading(true)
    try {
      const meta = {
        meta_calorica:      macros.kcal     ?? metaCalculada.meta_calorica,
        meta_proteina_g:    macros.proteina ?? metaCalculada.meta_proteina_g,
        meta_carboidrato_g: macros.carb     ?? metaCalculada.meta_carboidrato_g,
        meta_gordura_g:     macros.gordura  ?? metaCalculada.meta_gordura_g,
      }
      const usuario = await PerfilService.salvarPerfil({
        userId: session.user.id,
        email: session.user.email,
        nome: dados.nome,
        sexo: dados.sexo,
        dataNascimento: dados.dataNascimento,
        alturaCm: Number(dados.alturaCm),
        pesoKg: Number(dados.pesoKg),
        objetivo: dados.objetivo,
        nivelAtividade: dados.nivelAtividade,
        diasTreinoSemana: dados.diasTreino,
        meta,
      })
      setPerfil(usuario)
      toast.success('Perfil criado! Bem-vindo.')
      navigate('/')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const titulos = [
    { title: 'Dados pessoais',      subtitle: 'Precisamos conhecer você para calcular sua meta.' },
    { title: 'Qual seu objetivo?',  subtitle: 'Escolha o que melhor descreve sua meta atual.' },
    { title: 'Nível de atividade',  subtitle: 'Considere sua rotina fora dos treinos programados.' },
    { title: 'Dias de treino',      subtitle: 'Quantos dias por semana você pretende treinar?' },
    { title: 'Sua meta calórica',   subtitle: 'Calculada com base no seu perfil. Ajuste se quiser.' },
  ]

  const { title, subtitle } = titulos[step - 1]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressBar step={step} />
      <StepHeader title={title} subtitle={subtitle} onBack={voltarPasso} step={step} />

      <div style={{ padding: '0 24px', flex: 1 }}>
        {step === 1 && <Step1 dados={dados} set={set} onNext={proximoPasso} onBack={voltarPasso} />}
        {step === 2 && <Step2 dados={dados} set={set} onNext={proximoPasso} onBack={voltarPasso} />}
        {step === 3 && <Step3 dados={dados} set={set} onNext={proximoPasso} onBack={voltarPasso} />}
        {step === 4 && <Step4 dados={dados} set={set} onNext={proximoPasso} onBack={voltarPasso} />}
        {step === 5 && <Step5 metaCalculada={metaCalculada} macros={macros} setMacro={setMacro} onSalvar={salvar} loading={loading} />}
      </div>

      <div style={{ height: 'max(24px, env(safe-area-inset-bottom, 24px))' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
