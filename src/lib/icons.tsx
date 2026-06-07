// ── Lucide icon map: all visual elements use these ──
import {
  UtensilsCrossed, Car, ShoppingBag, Gamepad2, Home, Pill, BookOpen,
  Smartphone, Package, MoreHorizontal, Banknote, Briefcase, TrendingUp,
  Gift, FileText, Coffee, Cat, Plane, Dumbbell, Music, Shirt,
  SprayCan as MakeupIcon, Beer, Stethoscope, Lightbulb, Camera, Wrench, Bus, Train, Pizza,
  // Mood icons
  Smile, Meh, Frown, Angry, AlertTriangle, Star, Moon, Heart, Zap,
  // Nav & UI icons
  LayoutDashboard, Brain, Settings, Plus, Mic, Pencil, Search,
  Calendar, PiggyBank, MessageCircle, BarChart3, PieChart, List,
  Trash2, Edit3, ArrowLeft, ArrowRight, X, Menu, Send, Download, Upload,
  Copy, Tag, Target, FolderOpen, Database, Check,
  // Cool-down & Jar icons
  Timer, Clock, ShieldCheck, ShieldX, Thermometer, Flame, Hourglass,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type IconKey = string

// ── Category Icons ──
export const CATEGORY_ICON_MAP: Record<IconKey, LucideIcon> = {
  utensils: UtensilsCrossed, car: Car, 'shopping-bag': ShoppingBag,
  'gamepad-2': Gamepad2, home: Home, pill: Pill, 'book-open': BookOpen,
  smartphone: Smartphone, package: Package, 'more-horizontal': MoreHorizontal,
  banknote: Banknote, briefcase: Briefcase, 'trending-up': TrendingUp,
  gift: Gift, 'file-text': FileText, coffee: Coffee, cat: Cat, plane: Plane,
  dumbbell: Dumbbell, music: Music, shirt: Shirt, makeup: MakeupIcon,
  beer: Beer, stethoscope: Stethoscope, lightbulb: Lightbulb, camera: Camera,
  wrench: Wrench, bus: Bus, train: Train, pizza: Pizza,
  heart: Heart, zap: Zap,
}

export const PRESET_CAT_ICONS: Record<string, IconKey> = {
  '餐饮': 'utensils', '交通': 'car', '购物': 'shopping-bag', '娱乐': 'gamepad-2',
  '住房': 'home', '医疗': 'pill', '教育': 'book-open', '通讯': 'smartphone',
  '日用': 'package', '其他': 'more-horizontal',
  '工资': 'banknote', '兼职': 'briefcase', '理财': 'trending-up',
  '红包': 'gift', '报销': 'file-text',
}

export const CAT_ICON_OPTIONS: { key: IconKey; label: string; Icon: LucideIcon }[] = Object.entries({
  utensils: '餐饮', coffee: '咖啡', pizza: '美食', car: '汽车', bus: '公交',
  train: '火车', plane: '飞机', 'shopping-bag': '购物', 'gamepad-2': '游戏',
  home: '住房', pill: '医疗', 'book-open': '教育', smartphone: '通讯',
  package: '日用', briefcase: '工作', gift: '礼物', cat: '宠物', camera: '摄影',
  music: '音乐', dumbbell: '健身', shirt: '服饰', makeup: '美妆', beer: '聚会',
  lightbulb: '灵感', stethoscope: '健康', wrench: '维修', heart: '情绪', zap: '冲动',
  'more-horizontal': '其他',
}).map(([key, label]) => ({ key, label, Icon: CATEGORY_ICON_MAP[key] || MoreHorizontal }))

// ── Mood Icons ──
export const MOOD_LIST: { value: string; label: string; Icon: LucideIcon; color: string }[] = [
  { value: 'happy', label: '开心', Icon: Smile, color: '#f59e0b' },
  { value: 'calm', label: '平静', Icon: Heart, color: '#0ea5e9' },
  { value: 'neutral', label: '一般', Icon: Meh, color: '#6b7280' },
  { value: 'sad', label: '难过', Icon: Frown, color: '#6366f1' },
  { value: 'anxious', label: '焦虑', Icon: AlertTriangle, color: '#f97316' },
  { value: 'angry', label: '愤怒', Icon: Angry, color: '#ef4444' },
  { value: 'excited', label: '兴奋', Icon: Star, color: '#a855f7' },
  { value: 'tired', label: '疲惫', Icon: Moon, color: '#8b5cf6' },
]

export const MOOD_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  MOOD_LIST.map(m => [m.value, m.Icon])
)
export const MOOD_COLOR_MAP: Record<string, string> = Object.fromEntries(
  MOOD_LIST.map(m => [m.value, m.color])
)

// ── Navigation Icons ──
export { LayoutDashboard, Brain, Settings, Plus, Mic, Pencil, Search,
  Calendar, PiggyBank, MessageCircle, BarChart3, PieChart, List,
  Trash2, Edit3, ArrowLeft, ArrowRight, X, Menu, Send, Download, Upload,
  MoreHorizontal, Package, Copy, Tag, Target, FolderOpen, Database, AlertTriangle, Check, Star, Lightbulb,
  Timer, Clock, ShieldCheck, ShieldX, Thermometer, Flame, Hourglass }

// ── Project Icons (keys mapped to Lucide) ──
export const PROJECT_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'plane-project', label: '旅行', Icon: Plane },
  { key: 'gamepad-project', label: '游戏', Icon: Gamepad2 },
  { key: 'home-project', label: '居家', Icon: Home },
  { key: 'briefcase-project', label: '工作', Icon: Briefcase },
  { key: 'gift-project', label: '礼物', Icon: Gift },
  { key: 'stethoscope-project', label: '健康', Icon: Stethoscope },
  { key: 'car-project', label: '出行', Icon: Car },
  { key: 'music-project', label: '音乐', Icon: Music },
  { key: 'book-open-project', label: '学习', Icon: BookOpen },
  { key: 'cat-project', label: '宠物', Icon: Cat },
  { key: 'package-project', label: '其他', Icon: Package },
]

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PROJECT_ICONS.map(p => [p.key, p.Icon])
)
