// Retorna o primeiro dia (Date) do mês de vencimento da fatura de cartão.
// Regra: se a compra cai no dia >= dia_vencimento, a fatura é do mês seguinte;
// caso contrário, é do próprio mês.
//
// Exemplo: cartão fecha dia 10. Compra em 05/jan → fatura jan (vencimento 10/jan).
//          Compra em 12/jan → fatura fev (vencimento 10/fev).
export function calcularMesFatura(dataCompra, diaVencimento) {
  const data = dataCompra instanceof Date ? new Date(dataCompra) : new Date(dataCompra + 'T00:00:00')
  if (!Number.isFinite(data.getTime())) throw new Error('Data inválida para cálculo de fatura.')
  const dia = Number(diaVencimento)
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error('Dia de vencimento inválido.')
  }
  const ano = data.getFullYear()
  const mes = data.getMonth()
  const offset = data.getDate() >= dia ? 1 : 0
  return new Date(ano, mes + offset, 1)
}

// Soma N meses calendário a uma data; mantém o dia ou cai para último dia válido.
export function somarMeses(dataBase, n) {
  const d = dataBase instanceof Date ? new Date(dataBase) : new Date(dataBase + 'T00:00:00')
  if (!Number.isFinite(d.getTime())) throw new Error('Data inválida.')
  const ano = d.getFullYear()
  const mes = d.getMonth() + n
  const dia = d.getDate()
  // Último dia do mês alvo (dia 0 do próximo mês = último dia do mês atual)
  const ultimoDiaAlvo = new Date(ano, mes + 1, 0).getDate()
  return new Date(ano, mes, Math.min(dia, ultimoDiaAlvo))
}

// Formata Date → 'YYYY-MM-DD' (data local, sem deslocamento de fuso)
export function dataISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}
