import { db } from '@/db'
import type { Category } from '@/types'

export async function exportAllData() {
  const [transactions, categories, budgets, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.settings.toArray(),
  ])

  return JSON.stringify({ transactions, categories, budgets, settings }, null, 2)
}

export async function importAllData(jsonStr: string) {
  const data = JSON.parse(jsonStr)

  if (data.transactions) {
    await db.transactions.bulkPut(data.transactions)
  }
  if (data.categories) {
    await db.categories.bulkPut(data.categories)
  }
  if (data.budgets) {
    await db.budgets.bulkPut(data.budgets)
  }
}

export function exportCSV(transactions: any[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]))
  const header = '日期,类型,分类,金额,描述'
  const rows = transactions.map((t) => {
    const type = t.type === 'expense' ? '支出' : '收入'
    const catName = catMap.get(t.categoryId) || '未分类'
    return `${t.date},${type},${catName},${t.amount},${t.description}`
  })
  return '\uFEFF' + [header, ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
