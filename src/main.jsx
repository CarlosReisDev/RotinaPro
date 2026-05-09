import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SessaoAtivaProvider } from './contexts/SessaoAtivaContext'
import CronometroDescanso from './components/treinos/CronometroDescanso'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessaoAtivaProvider>
          <App />
          <CronometroDescanso />
        </SessaoAtivaProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a1a',
              color: '#F1F5F9',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: "'Barlow', sans-serif",
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#1a1a1a' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#1a1a1a' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
