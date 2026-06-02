export interface Transaction {
  id: string
  type: 'expense' | 'income'
  amount: number
  categoryId: string
  description: string
  date: string
  createdAt: number
  updatedAt: number
  aiParsed?: boolean
}

export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
  isSystem: boolean
}

export interface Budget {
  id: string
  categoryId: string | null
  amount: number
  period: 'monthly' | 'yearly'
  yearMonth: string
}

export interface Settings {
  id?: string
  apiKey: string
  apiBaseUrl: string
  model: string
  language: 'zh' | 'en'
  currency: string
  theme: 'light' | 'dark' | 'system'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ParsedTransaction {
  type: 'expense' | 'income'
  amount: number
  category: string
  date: string
  description: string
  confidence: number
}
