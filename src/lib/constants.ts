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
  totalStars: 0,
}

export const CATEGORY_DESCRIPTIONS: Record<string, { desc: string; theory: string }> = {
  '必要消费': { desc: '维持生存和基本运转的支出', theory: 'System 2 理性决策 · 马斯洛底层需求' },
  '价值消费': { desc: '对齐长期目标、促进自我成长的支出', theory: 'System 2 理性决策 · 自我实现需求' },
  '情绪消费': { desc: '由情绪状态驱动的消费，正向庆祝或负向补偿', theory: 'System 1 直觉驱动 · 情绪调节理论' },
  '冲动消费': { desc: '无计划即时决策，事后常后悔', theory: 'System 1 突发驱动 · 即时满足偏差' },
  '意外消费': { desc: '突发意外不得不支出的消费', theory: '外部事件触发 · 不可控支出' },
  '工资': { desc: '固定劳动报酬', theory: '常规性收入来源' },
  '兼职': { desc: '额外劳动所得', theory: '补充性收入来源' },
  '理财': { desc: '资产产生的被动收益', theory: '投资性收入来源' },
  '红包': { desc: '他人赠送的收入', theory: '赠送性收入来源' },
  '其他': { desc: '其他来源的收入', theory: '兜底分类' },
}