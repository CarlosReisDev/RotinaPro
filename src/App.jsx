import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { lazy, Suspense } from 'react'
import LoadingScreen from './components/ui/LoadingScreen'

const LoginPage      = lazy(() => import('./pages/LoginPage'))
const AuthCallback   = lazy(() => import('./pages/AuthCallback'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const TreinosPage    = lazy(() => import('./pages/TreinosPage'))
const SessaoTreinoPage = lazy(() => import('./pages/SessaoTreinoPage'))
const HistoricoTreinosPage = lazy(() => import('./pages/HistoricoTreinosPage'))
const DietaPage      = lazy(() => import('./pages/DietaPage'))
const AlimentosPage  = lazy(() => import('./pages/AlimentosPage'))
const FinancasPage   = lazy(() => import('./pages/FinancasPage'))
const PerfilPage     = lazy(() => import('./pages/PerfilPage'))

function RotaProtegida({ children }) {
  const { session, perfil, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!perfil)  return <Navigate to="/onboarding" replace />
  return children
}

function RotaPublica({ children }) {
  const { session, perfil, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session && perfil)  return <Navigate to="/" replace />
  if (session && !perfil) return <Navigate to="/onboarding" replace />
  return children
}

function RotaOnboarding({ children }) {
  const { session, perfil, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (perfil)   return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login"         element={<RotaPublica><LoginPage /></RotaPublica>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding"    element={<RotaOnboarding><OnboardingPage /></RotaOnboarding>} />
          <Route path="/"              element={<RotaProtegida><DashboardPage /></RotaProtegida>} />
          <Route path="/treinos"       element={<RotaProtegida><TreinosPage /></RotaProtegida>} />
          <Route path="/treinos/sessao" element={<RotaProtegida><SessaoTreinoPage /></RotaProtegida>} />
          <Route path="/treinos/historico" element={<RotaProtegida><HistoricoTreinosPage /></RotaProtegida>} />
          <Route path="/dieta"         element={<RotaProtegida><DietaPage /></RotaProtegida>} />
          <Route path="/dieta/alimentos" element={<RotaProtegida><AlimentosPage /></RotaProtegida>} />
          <Route path="/financas"      element={<RotaProtegida><FinancasPage /></RotaProtegida>} />
          <Route path="/perfil"        element={<RotaProtegida><PerfilPage /></RotaProtegida>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
