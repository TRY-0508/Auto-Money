import { db } from './index'
import { generateId } from '@/lib/utils'
import type { Category, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/constants'
import { PRESET_ICONS } from '@/lib/icons'

const EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '餐饮', type: 'expense', icon: PRESET_ICONS['餐饮'], color: '#f97316', isSystem: true },
  { name: '交通', type: 'expense', icon: PRESET_ICONS['交通'], color: '#3b82f6', isSystem: true },
  { name: '购物', type: 'expense', icon: PRESET_ICONS['购物'], color: '#ec4899', isSystem: true },
  { name: '娱乐', type: 'expense', icon: PRESET_ICONS['娱乐'], color: '#a855f7', isSystem: true },
  { name: '住房', type: 'expense', icon: PRESET_ICONS['住房'], color: '#14b8a6', isSystem: true },
  { name: '医疗', type: 'expense', icon: PRESET_ICONS['医疗'], color: '#ef4444', isSystem: true },
  { name: '教育', type: 'expense', icon: PRESET_ICONS['教育'], color: '#6366f1', isSystem: true },
  { name: '通讯', type: 'expense', icon: PRESET_ICONS['通讯'], color: '#06b6d4', isSystem: true },
  { name: '日用', type: 'expense', icon: PRESET_ICONS['日用'], color: '#84cc16', isSystem: true },
  { name: '其他', type: 'expense', icon: PRESET_ICONS['其他'], color: '#6b7280', isSystem: true },
]

const INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '工资', type: 'income', icon: PRESET_ICONS['工资'], color: '#22c55e', isSystem: true },
  { name: '兼职', type: 'income', icon: PRESET_ICONS['兼职'], color: '#14b8a6', isSystem: true },
  { name: '理财', type: 'income', icon: PRESET_ICONS['理财'], color: '#3b82f6', isSystem: true },
  { name: '红包', type: 'income', icon: PRESET_ICONS['红包'], color: '#ef4444', isSystem: true },
  { name: '报销', type: 'income', icon: PRESET_ICONS['报销'], color: '#a855f7', isSystem: true },
  { name: '其他', type: 'income', icon: PRESET_ICONS['其他'], color: '#6b7280', isSystem: true },
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
    const settings: Settings = {
      id: 'default',
      ...DEFAULT_SETTINGS,
    }
    await db.settings.add(settings)
  }
}
