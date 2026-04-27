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
    // Timer longo: só para falha total de inicialização (rede caída, bug).
    // NÃO dispara para renovação lenta de token — INITIAL_SESSION limpa ele.
    const safetyTimer = setTimeout(() => { setSession(null); setLoading(false) }, 30000)

    const { data: { subscription } } = AuthClient.onAuthStateChange(async (event, s) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(safetyTimer)

        // Mobile fallback: se Supabase deu null mas localStorage tem refresh_token,
        // navigator.locks falhou em coordenar o refresh. Tenta manualmente.
        let sessao = s
        if (!sessao) {
          try { sessao = await AuthClient.refreshSession() } catch { /* sem sessão recuperável */ }
        }

        setSession(sessao ?? null)
        if (sessao) await carregarPerfil(sessao.user.id)
        else { setPerfil(null); setLoading(false) }
        return
      }

      if (s && event === 'SIGNED_IN') {
        try {
          const ok = await AllowlistService.emailPermitido(s.user.email)
          if (!ok) { await AuthClient.logout(); return }
        } catch { /* falha de rede: continua; trigger no banco é a defesa primária */ }
      }

      setSession(s ?? null)
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
