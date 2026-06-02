import type { Transaction, Category } from '@/types'

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amount: number
  percentage: number
}

export interface DailyTrend {
  date: string
  expense: number
  income: number
}

export function getMonthlyStats(transactions: Transaction[], yearMonth: string) {
  const monthTransactions = transactions.filter((t) => t.date.startsWith(yearMonth))
  const totalExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  return { totalExpense, totalIncome, balance: totalIncome - totalExpense, count: monthTransactions.length }
}

export function getCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'expense' | 'income',
  yearMonth: string
): CategoryBreakdown[] {
  const monthTransactions = transactions.filter((t) => t.date.startsWith(yearMonth) && t.type === type)
  const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0)

  const categoryMap = new Map<string, number>()
  for (const t of monthTransactions) {
    categoryMap.set(t.categoryId, (categoryMap.get(t.categoryId) || 0) + t.amount)
  }

  const catMap = new Map(categories.map((c) => [c.id, c]))

  return Array.from(categoryMap.entries())
    .map(([catId, amount]) => {
      const cat = catMap.get(catId)
      return {
        categoryId: catId,
        categoryName: cat?.name || '未分类',
        categoryIcon: cat?.icon || '📦',
        categoryColor: cat?.color || '#6b7280',
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function getDailyTrend(transactions: Transaction[], days: number): DailyTrend[] {
  const result: DailyTrend[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTransactions = transactions.filter((t) => t.date === dateStr)

    result.push({
      date: dateStr.slice(5),
      expense: dayTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      income: dayTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    })
  }

  return result
}

export function getPreviousMonthComparison(
  transactions: Transaction[],
  currentYearMonth: string
): { expenseChange: number; incomeChange: number } {
  const [year, month] = currentYearMonth.split('-').map(Number)
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear--
  }
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  const currentStats = getMonthlyStats(transactions, currentYearMonth)
  const prevStats = getMonthlyStats(transactions, prevYearMonth)

  const expenseChange = prevStats.totalExpense > 0
    ? Math.round(((currentStats.totalExpense - prevStats.totalExpense) / prevStats.totalExpense) * 100)
    : 0

  const incomeChange = prevStats.totalIncome > 0
    ? Math.round(((currentStats.totalIncome - prevStats.totalIncome) / prevStats.totalIncome) * 100)
    : 0

  return { expenseChange, incomeChange }
}
