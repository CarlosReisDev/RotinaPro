// Logger leve: preserva causa técnica no console para diagnóstico sem vazar
// detalhes para a UI. Trocar por integração de telemetria quando necessário.
const devMode = import.meta.env.DEV

export function logErro(contexto, erro) {
  if (!devMode) return
  console.error(`[${contexto}]`, erro)
}
