import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Settings, ChatMessage, Project, JarGoal, CoolDownEvent, Deficit } from '@/types'

class AutoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  budgets!: Table<Budget, string>
  settings!: Table<Settings, string>
  chatMessages!: Table<ChatMessage, string>
  projects!: Table<Project, string>
  jarGoals!: Table<JarGoal, string>
  coolDownEvents!: Table<CoolDownEvent, string>
  deficits!: Table<Deficit, string>

  constructor() {
    super('AutoMoneyDB')
    this.version(5).stores({
      transactions: 'id, date, type, categoryId, projectId, mood',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
      projects: 'id',
      jarGoals: 'id',
      coolDownEvents: 'id, goalId, status, cooldownEndsAt, createdAt',
      deficits: 'id, yearMonth, status',
    }).upgrade(async tx => {
      // Remove old traditional expense categories that aren't the 5 psychological ones
      const OLD_TRADITIONAL = [
        '餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '日用',
        '饮食', '咖啡', '美食', '汽车', '公交', '火车', '飞机', '游戏',
        '宠物', '摄影', '音乐', '健身', '服饰', '美妆', '聚会', '灵感',
        '健康', '维修', '工作', '礼物', '报销', '数码',
      ]
      const allCats = await tx.table('categories').toArray()
      for (const cat of allCats) {
        if (OLD_TRADITIONAL.includes(cat.name) && cat.isSystem !== false) {
          await tx.table('categories').delete(cat.id)
        }
      }
    })
    this.version(7).stores({
      transactions: 'id, date, type, categoryId, projectId, mood',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
      projects: 'id',
      jarGoals: 'id',
      coolDownEvents: 'id, goalId, status, cooldownEndsAt, createdAt',
      deficits: 'id, yearMonth, status',
    }).upgrade(async tx => {
      // Force-clean: delete ALL categories, then re-seed with psychology-only model
      const VALID_EXPENSE = ['必要消费', '价值消费', '情绪消费', '冲动消费', '意外消费']
      const VALID_INCOME = ['工资', '兼职', '理财', '红包', '其他']
      const VALID = [...VALID_EXPENSE, ...VALID_INCOME]
      const allCats = await tx.table('categories').toArray()
      for (const cat of allCats) {
        if (!VALID.includes(cat.name) && cat.isSystem !== false) {
          await tx.table('categories').delete(cat.id)
        }
      }
    })
    this.version(8).stores({
      transactions: 'id, date, type, categoryId, projectId, mood',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
      projects: 'id',
      jarGoals: 'id',
      coolDownEvents: 'id, goalId, status, cooldownEndsAt, createdAt',
      deficits: 'id, yearMonth, status',
    }).upgrade(async tx => {
      const OLD_PSYCH_INCOME = ['劳动收入', '增值收入', '馈赠收入', '惊喜收入', '回流收入']
      const allCats = await tx.table('categories').toArray()
      for (const cat of allCats) {
        if (OLD_PSYCH_INCOME.includes(cat.name) && cat.type === 'income' && cat.isSystem !== false) {
          await tx.table('categories').delete(cat.id)
        }
      }
    })
  }
}

export const db = new AutoMoneyDB()
