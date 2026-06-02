export function generateId(): string {
  return crypto.randomUUID()
}

export function formatAmount(amount: number, currency = 'CNY'): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  return `${symbol}${amount.toFixed(2)}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().slice(0, 10)) return '今天'
  if (dateStr === yesterday.toISOString().slice(0, 10)) return '昨天'

  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

export function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  return { start, end }
}

export function getCurrentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
