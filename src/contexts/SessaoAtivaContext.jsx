import { useEffect, useRef, useState } from 'react'
import { SessaoAtivaContext } from '../hooks/useSessaoAtiva'

// Estado do cronômetro de descanso da sessão de musculação.
// Vive acima do <App /> para sobreviver a navegação entre rotas.
// O fim é armazenado como timestamp absoluto — o tick atualiza só o "agora",
// evitando drift acumulado de setInterval.

export function SessaoAtivaProvider({ children }) {
  const [exercicio, setExercicio] = useState(null)
  const [fimEm, setFimEm] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const tickRef = useRef(null)

  useEffect(() => {
    if (!fimEm) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    tickRef.current = setInterval(() => {
      const t = Date.now()
      setAgora(t)
      if (t >= fimEm) {
        setFimEm(null)
        setExercicio(null)
      }
    }, 250)
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
  }, [fimEm])

  function iniciarDescanso(nomeExercicio, segundos) {
    if (!segundos || segundos <= 0) return
    setExercicio(nomeExercicio || 'Descanso')
    setAgora(Date.now())
    setFimEm(Date.now() + segundos * 1000)
  }

  function ajustarDescanso(deltaSegundos) {
    setFimEm(prev => {
      if (!prev) return prev
      const novo = prev + deltaSegundos * 1000
      return novo > Date.now() ? novo : null
    })
  }

  function cancelarDescanso() {
    setFimEm(null)
    setExercicio(null)
  }

  const ativo = !!fimEm
  const segundosRestantes = ativo ? Math.max(0, Math.ceil((fimEm - agora) / 1000)) : 0

  return (
    <SessaoAtivaContext.Provider value={{
      ativo,
      exercicio,
      segundosRestantes,
      iniciarDescanso,
      ajustarDescanso,
      cancelarDescanso,
    }}>
      {children}
    </SessaoAtivaContext.Provider>
  )
}
