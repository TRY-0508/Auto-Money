import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Settings, ChatMessage, Project, JarGoal, CoolDownEvent } from '@/types'

class AutoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  budgets!: Table<Budget, string>
  settings!: Table<Settings, string>
  chatMessages!: Table<ChatMessage, string>
  projects!: Table<Project, string>
  jarGoals!: Table<JarGoal, string>
  coolDownEvents!: Table<CoolDownEvent, string>

  constructor() {
    super('AutoMoneyDB')
    this.version(4).stores({
      transactions: 'id, date, type, categoryId, projectId, mood',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
      projects: 'id',
      jarGoals: 'id',
      coolDownEvents: 'id, goalId, status, cooldownEndsAt, createdAt',
    })
  }
}

export const db = new AutoMoneyDB()
