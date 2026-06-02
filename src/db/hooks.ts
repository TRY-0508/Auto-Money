import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'
import type { Transaction, Category, Budget, Settings, ChatMessage, Project } from '@/types'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const addCategory = async (cat: Omit<Category, 'id'>) => {
    const id = crypto.randomUUID()
    await db.categories.add({ id, ...cat })
    return id
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    await db.categories.update(id, updates)
  }

  const deleteCategory = async (id: string) => {
    await db.categories.delete(id)
  }

  return { categories, addCategory, updateCategory, deleteCategory }
}

export function useTransactions(filter?: { type?: string; categoryId?: string; month?: string }) {
  const transactions = useLiveQuery(async () => {
    let collection = db.transactions.orderBy('date').reverse()

    if (filter?.type && filter.type !== 'all') {
      collection = collection.filter((t) => t.type === filter.type)
    }
    if (filter?.categoryId) {
      collection = collection.filter((t) => t.categoryId === filter.categoryId)
    }

    let results = await collection.toArray()

    if (filter?.month) {
      results = results.filter((t) => t.date.startsWith(filter.month!))
    }

    return results
  }, [filter?.type, filter?.categoryId, filter?.month]) ?? []

  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.transactions.add({ id, ...t, createdAt: now, updatedAt: now })
  }

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await db.transactions.update(id, { ...updates, updatedAt: Date.now() })
  }

  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id)
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction }
}

export function useBudgets() {
  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? []

  const addBudget = async (b: Omit<Budget, 'id'>) => {
    const id = crypto.randomUUID()
    await db.budgets.add({ id, ...b })
  }

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    await db.budgets.update(id, updates)
  }

  const deleteBudget = async (id: string) => {
    await db.budgets.delete(id)
  }

  return { budgets, addBudget, updateBudget, deleteBudget }
}

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get('default'))

  const updateSettings = async (updates: Partial<Settings>) => {
    await db.settings.update('default', updates)
  }

  return { settings, updateSettings }
}

export function useChatMessages() {
  const messages = useLiveQuery(() => db.chatMessages.orderBy('timestamp').toArray()) ?? []

  const addMessage = async (msg: Omit<ChatMessage, 'id'>) => {
    const id = crypto.randomUUID()
    await db.chatMessages.add({ id, ...msg })
  }

  const clearMessages = async () => {
    await db.chatMessages.clear()
  }

  return { messages, addMessage, clearMessages }
}

export function useProjects() {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []

  const addProject = async (p: Omit<Project, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID()
    await db.projects.add({ id, ...p, createdAt: Date.now() })
    return id
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    await db.projects.update(id, updates)
  }

  const deleteProject = async (id: string) => {
    await db.projects.delete(id)
    const txs = await db.transactions.where('projectId').equals(id).toArray()
    for (const t of txs) {
      await db.transactions.update(t.id, { projectId: undefined })
    }
  }

  return { projects, addProject, updateProject, deleteProject }
}
