import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import AuthClient from '../api/auth'
import AllowlistService from '../services/AllowlistService'
import PerfilService from '../services/PerfilService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  const carregarPerfil = useCallback(async (userId) => {
    try {
      setPerfil(await PerfilService.obterPorId(userId))
    } catch {
      setPerfil(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Timeout de segurança: garante que loading nunca fica true para sempre
    // se a troca PKCE ou qualquer rede travar em produção
    const safetyTimer = setTimeout(() => setLoading(false), 10000)

    const { data: { subscription } } = AuthClient.onAuthStateChange(async (event, s) => {
      clearTimeout(safetyTimer)

      if (s && event === 'SIGNED_IN') {
        try {
          const ok = await AllowlistService.emailPermitido(s.user.email)
          if (!ok) { await AuthClient.logout(); return }
        } catch { /* falha de rede: continua; trigger no banco é a defesa primária */ }
      }

      setSession(s)
      if (s) await carregarPerfil(s.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [carregarPerfil])

  return (
    <AuthContext.Provider value={{ session, perfil, loading, setPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
