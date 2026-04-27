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
    async function verificar() {
      try {
        const session = await AuthClient.getSession()
        if (!session) { navigate('/login'); return }

        const autorizado = await AllowlistService.emailPermitido(session.user.email)
        if (!autorizado) {
          await AuthClient.logout()
          navigate('/login?erro=acesso_negado')
          return
        }

        const perfil = await PerfilService.obterPorId(session.user.id)
        navigate(perfil ? '/' : '/onboarding')
      } catch (error) {
        logErro('AuthCallback.verificar', error)
        toast.error('Erro na autenticação. Tente novamente.')
        navigate('/login')
      }
    }
    verificar()
  }, [navigate])

  return <LoadingScreen />
}
