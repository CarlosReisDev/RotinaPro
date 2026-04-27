import { createContext, useContext } from 'react'

export const SessaoAtivaContext = createContext(null)

export function useSessaoAtiva() {
  const ctx = useContext(SessaoAtivaContext)
  if (!ctx) throw new Error('useSessaoAtiva precisa estar dentro de SessaoAtivaProvider.')
  return ctx
}
