import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'
import type { Transaction, Category, Budget, Settings, ChatMessage, Project, JarGoal, CoolDownEvent, Deficit } from '@/types'

export function useCategories() {
  const categories = useLiveQuery(async () => {
    const cats = await db.categories.toArray()
    // Sort: system categories first, then custom; "其他" always last
    return cats.sort((a, b) => {
      if (a.name === '其他') return 1
      if (b.name === '其他') return -1
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
      return 0
    })
  }) ?? []

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

export function useJarGoals() {
  const goals = useLiveQuery(() => db.jarGoals.toArray()) ?? []

  const addGoal = async (g: Omit<JarGoal, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.jarGoals.add({ id, ...g, createdAt: now })
    return id
  }

  const updateGoal = async (id: string, updates: Partial<JarGoal>) => {
    await db.jarGoals.update(id, updates)
  }

  const deleteGoal = async (id: string) => {
    await db.jarGoals.delete(id)
  }

  return { goals, addGoal, updateGoal, deleteGoal }
}

export function useCoolDownEvents() {
  const events = useLiveQuery(() => db.coolDownEvents.orderBy('createdAt').reverse().toArray()) ?? []

  const addEvent = async (e: Omit<CoolDownEvent, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.coolDownEvents.add({ id, ...e, createdAt: now })
    return id
  }

  const updateEvent = async (id: string, updates: Partial<CoolDownEvent>) => {
    await db.coolDownEvents.update(id, updates)
  }

  const deleteEvent = async (id: string) => {
    await db.coolDownEvents.delete(id)
  }

  return { events, addEvent, updateEvent, deleteEvent }
}

export function useDeficits() {
  const deficits = useLiveQuery(() => db.deficits.orderBy('createdAt').reverse().toArray()) ?? []

  const addDeficit = async (d: Omit<Deficit, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID()
    await db.deficits.add({ id, ...d, createdAt: Date.now() })
    return id
  }

  const updateDeficit = async (id: string, updates: Partial<Deficit>) => {
    await db.deficits.update(id, updates)
  }

  const deleteDeficit = async (id: string) => {
    await db.deficits.delete(id)
  }

  return { deficits, addDeficit, updateDeficit, deleteDeficit }
}
