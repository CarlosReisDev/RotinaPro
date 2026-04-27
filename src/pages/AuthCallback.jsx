import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthClient from '../api/auth'
import AllowlistService from '../services/AllowlistService'
import PerfilService from '../services/PerfilService'
import LoadingScreen from '../components/ui/LoadingScreen'
import { logErro } from '../utils/logger'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let handled = false

    async function processarSessao(session) {
      try {
        const autorizado = await AllowlistService.emailPermitido(session.user.email)
        if (!autorizado) {
          await AuthClient.logout()
          navigate('/login?erro=acesso_negado', { replace: true })
          return
        }
        const perfil = await PerfilService.obterPorId(session.user.id)
        navigate(perfil ? '/' : '/onboarding', { replace: true })
      } catch (error) {
        logErro('AuthCallback.processarSessao', error)
        toast.error('Erro na autenticação. Tente novamente.')
        navigate('/login', { replace: true })
      }
    }

    // Timeout: se a troca PKCE travar, redireciona para login após 15s
    const timer = setTimeout(() => {
      if (!handled) {
        handled = true
        subscription.unsubscribe()
        navigate('/login', { replace: true })
      }
    }, 15000)

    const { data: { subscription } } = AuthClient.onAuthStateChange(async (event, session) => {
      if (handled) return

      // SIGNED_IN: troca PKCE concluída com sucesso
      // INITIAL_SESSION com session: já havia sessão válida (ex: aba reaberta)
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        handled = true
        clearTimeout(timer)
        subscription.unsubscribe()
        await processarSessao(session)
        return
      }

      // INITIAL_SESSION sem session e sem code na URL: não há sessão
      if (event === 'INITIAL_SESSION' && !session && !window.location.search.includes('code=')) {
        handled = true
        clearTimeout(timer)
        subscription.unsubscribe()
        navigate('/login', { replace: true })
      }
    })

    return () => {
      handled = true
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate])

  return <LoadingScreen />
}
