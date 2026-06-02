import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Settings, ChatMessage } from '@/types'

class AutoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  budgets!: Table<Budget, string>
  settings!: Table<Settings, string>
  chatMessages!: Table<ChatMessage, string>

  constructor() {
    super('AutoMoneyDB')
    this.version(1).stores({
      transactions: 'id, date, type, categoryId',
      categories: 'id, type',
      budgets: 'id, categoryId, yearMonth',
      settings: 'id',
      chatMessages: 'id, timestamp',
    })
  }
}

export const db = new AutoMoneyDB()
