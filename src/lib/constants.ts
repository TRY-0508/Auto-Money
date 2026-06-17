import type { Settings } from '@/types'

export const MOODS = [
  { emoji: '😊', label: '开心', value: 'happy' },
  { emoji: '😌', label: '平静', value: 'calm' },
  { emoji: '😐', label: '一般', value: 'neutral' },
  { emoji: '😢', label: '难过', value: 'sad' },
  { emoji: '😰', label: '焦虑', value: 'anxious' },
  { emoji: '😡', label: '愤怒', value: 'angry' },
  { emoji: '🤩', label: '兴奋', value: 'excited' },
  { emoji: '😴', label: '疲惫', value: 'tired' },
]

export const CATEGORY_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  teal: '#14b8a6',
  lime: '#84cc16',
  amber: '#f59e0b',
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  apiBaseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  language: 'zh',
  currency: 'CNY',
  theme: 'system',
  speechApiKey: '',
  speechSecretKey: '',
  speechProvider: 'none',
  colorScheme: 'most-frequent',
  themeMode: 'dynamic',
  fixedTheme: 'warm-amber',
}