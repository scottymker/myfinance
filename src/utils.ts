export function normalizeMerchant(raw: string): string {
  if (!raw) return 'Unknown'
  let m = raw.trim()
  m = m.replace(/\*|#|POS\s*\d+|PAYMENT|AUTH|PENDING/gi, '')
  m = m.replace(/\s{2,}/g, ' ').trim()
  return m[0].toUpperCase() + m.slice(1).toLowerCase()
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth()+1, 0)
}

export function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function daysInMonth(d = new Date()): number {
  return endOfMonth(d).getDate()
}

export function todayDayOfMonth(): number {
  return new Date().getDate()
}
