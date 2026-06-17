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
  projectId?: string
  mood?: string       // emoji: 😊😐😢😡🤩😰😴
  moodNote?: string   // 心情备注
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

export interface Project {
  id: string
  name: string
  icon: string
  color: string
  createdAt: number
}

export interface Settings {
  id?: string
  apiKey: string
  apiBaseUrl: string
  model: string
  language: 'zh' | 'en'
  currency: string
  theme: 'light' | 'dark' | 'system'
  speechApiKey: string
  speechSecretKey: string
  speechProvider: 'baidu' | 'none'
  colorScheme: 'most-frequent' | 'latest' | 'neutral' | 'adaptive'
  themeMode: 'dynamic' | 'fixed'
  fixedTheme: string
}

export interface Deficit {
  id: string
  amount: number
  yearMonth: string
  remainingAmount: number
  status: 'active' | 'filled'
  createdAt: number
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
  mood?: string | null
}

export interface JarGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  starCount: number
  description: string
  color: string
  createdAt: number
}

export interface CoolDownEvent {
  id: string
  goalId?: string
  description: string
  amount: number
  desireLevel: number
  necessityLevel: number
  emotionalState: string
  impulseType: 'emotional' | 'impulsive' | 'uncertain'
  reason: string
  cooldownHours: number
  cooldownStartedAt: number
  cooldownEndsAt: number
  status: 'cooling' | 'pending_review' | 'resisted' | 'failed' | 'purchased'
  reEvaluationNote?: string
  reEvaluationDesire?: number
  reEvaluationAt?: number
  earnedStar?: boolean
  earnedAt?: number
  boughtAt?: number
  createdAt: number
  aiAnalysis?: CoolDownAIAnalysis
}

export interface CoolDownAIAnalysis {
  impulseType: 'emotional' | 'impulsive' | 'uncertain'
  confidence: number
  suggestedDesire: number
  suggestedNecessity: number
  riskFactors: string[]
  suggestedCooldown: number
  reflectionQuestions: string[]
  summary: string
}
