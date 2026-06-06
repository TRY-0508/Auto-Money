import { db } from './index'
import { generateId } from '@/lib/utils'
import type { Category, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/constants'

const EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '必要消费', type: 'expense', icon: 'home', color: '#3b82f6', isSystem: true },
  { name: '价值消费', type: 'expense', icon: 'trending-up', color: '#10b981', isSystem: true },
  { name: '情绪消费', type: 'expense', icon: 'heart', color: '#f43f5e', isSystem: true },
  { name: '冲动消费', type: 'expense', icon: 'zap', color: '#f59e0b', isSystem: true },
  { name: '其他', type: 'expense', icon: 'more-horizontal', color: '#6b7280', isSystem: true },
]

const INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '工资', type: 'income', icon: 'banknote', color: '#22c55e', isSystem: true },
  { name: '兼职', type: 'income', icon: 'briefcase', color: '#14b8a6', isSystem: true },
  { name: '理财', type: 'income', icon: 'trending-up', color: '#3b82f6', isSystem: true },
  { name: '红包', type: 'income', icon: 'gift', color: '#ef4444', isSystem: true },
  { name: '其他', type: 'income', icon: 'more-horizontal', color: '#6b7280', isSystem: true },
]

export async function seedDatabase() {
  const catCount = await db.categories.count()
  if (catCount > 0) return

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  for (const cat of allCategories) {
    await db.categories.add({ id: generateId(), ...cat })
  }

  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    const settings: Settings = { id: 'default', ...DEFAULT_SETTINGS }
    await db.settings.add(settings)
  }
}