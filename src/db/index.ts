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
    })
  }
}

export const db = new AutoMoneyDB()
