import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Settings, ChatMessage, Project } from '@/types'

class AutoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  budgets!: Table<Budget, string>
  settings!: Table<Settings, string>
  chatMessages!: Table<ChatMessage, string>
  projects!: Table<Project, string>

  constructor() {
    super('AutoMoneyDB')
    this.version(3).stores({
      transactions: 'id, date, type, categoryId, projectId, mood',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
      projects: 'id',
    })
  }
}

export const db = new AutoMoneyDB()
