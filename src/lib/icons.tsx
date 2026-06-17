// ── Lucide icon map: all visual elements use these ──
import {
  UtensilsCrossed, Car, ShoppingBag, Gamepad2, Home, Pill, BookOpen,
  Smartphone, Package, MoreHorizontal, Banknote, Briefcase, TrendingUp,
  Gift, FileText, Coffee, Cat, Plane, Dumbbell, Music, Shirt,
  SprayCan as MakeupIcon, Beer, Stethoscope, Lightbulb, Camera, Wrench, Bus, Train, Pizza,
  ArrowUpRight, ArrowDownRight,
  // Mood icons
  Smile, Meh, Frown, Angry, AlertTriangle, Star, Moon, Heart, Zap,
  // Nav & UI icons
  LayoutDashboard, Brain, Settings, Plus, Mic, Pencil, Search,
  Calendar, PiggyBank, MessageCircle, BarChart3, PieChart, List,
  Trash2, Edit3, ArrowLeft, ArrowRight, X, Menu, Send, Download, Upload,
  Copy, Tag, Target, FolderOpen, Database, Check,
  Palette, Wallet, Sparkles, RotateCcw,
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
  heart: Heart, zap: Zap, 'alert-triangle': AlertTriangle,
  sparkles: Sparkles, 'rotate-ccw': RotateCcw,
}

export const PRESET_CAT_ICONS: Record<string, IconKey> = {
  '必要消费': 'home', '价值消费': 'trending-up', '情绪消费': 'heart',
  '冲动消费': 'zap', '意外消费': 'alert-triangle',
  '工资': 'banknote', '兼职': 'briefcase', '理财': 'trending-up',
  '红包': 'gift', '其他': 'more-horizontal',
}

export const CAT_ICON_OPTIONS: { key: IconKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: '住所', Icon: Home },
  { key: 'utensils', label: '饮食', Icon: UtensilsCrossed },
  { key: 'stethoscope', label: '健康', Icon: Stethoscope },
  { key: 'wrench', label: '修缮', Icon: Wrench },
  { key: 'car', label: '出行', Icon: Car },
  { key: 'book-open', label: '学习', Icon: BookOpen },
  { key: 'dumbbell', label: '成长', Icon: Dumbbell },
  { key: 'heart', label: '情感', Icon: Heart },
  { key: 'lightbulb', label: '灵感', Icon: Lightbulb },
  { key: 'camera', label: '纪念', Icon: Camera },
  { key: 'zap', label: '冲动', Icon: Zap },
  { key: 'alert-triangle', label: '意外', Icon: AlertTriangle },
  { key: 'trending-up', label: '投资', Icon: TrendingUp },
  { key: 'briefcase', label: '工作', Icon: Briefcase },
  { key: 'gift', label: '礼物', Icon: Gift },
  { key: 'banknote', label: '现金', Icon: Banknote },
  { key: 'music', label: '爱好', Icon: Music },
  { key: 'coffee', label: '小憩', Icon: Coffee },
  { key: 'package', label: '日用', Icon: Package },
  { key: 'smartphone', label: '数码', Icon: Smartphone },
  { key: 'more-horizontal', label: '其他', Icon: MoreHorizontal },
]

// ── Mood Icons ──
export const MOOD_LIST: { value: string; label: string; Icon: LucideIcon; color: string }[] = [
  { value: 'happy', label: '开心', Icon: Smile, color: '#f59e0b' },
  { value: 'calm', label: '平静', Icon: Heart, color: '#0ea5e9' },
  { value: 'neutral', label: '一般', Icon: Meh, color: '#6b7280' },
  { value: 'sad', label: '难过', Icon: Frown, color: '#6366f1' },
  { value: 'anxious', label: '焦虑', Icon: AlertTriangle, color: '#f97316' },
  { value: 'angry', label: '愤怒', Icon: Angry, color: '#ef4444' },
  { value: 'excited', label: '兴奋', Icon: Star, color: '#ec4899' },
  { value: 'tired', label: '疲惫', Icon: Moon, color: '#a8a29e' },
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
  Palette, Wallet, TrendingUp, Sparkles, RotateCcw,
  ArrowUpRight, ArrowDownRight,
  Timer, Clock, ShieldCheck, ShieldX, Thermometer, Flame, Hourglass, Zap }

// ── Project Icons (keys mapped to Lucide) ──
export const PROJECT_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'home-project', label: '日常', Icon: Home },
  { key: 'book-open-project', label: '学习', Icon: BookOpen },
  { key: 'briefcase-project', label: '工作', Icon: Briefcase },
  { key: 'gamepad-project', label: '娱乐', Icon: Gamepad2 },
  { key: 'gift-project', label: '人情', Icon: Gift },
  { key: 'stethoscope-project', label: '健康', Icon: Stethoscope },
  { key: 'car-project', label: '出行', Icon: Car },
  { key: 'plane-project', label: '旅行', Icon: Plane },
  { key: 'cat-project', label: '宠物', Icon: Cat },
  { key: 'smartphone-project', label: '数码', Icon: Smartphone },
  { key: 'music-project', label: '爱好', Icon: Music },
  { key: 'package-project', label: '杂项', Icon: Package },
]

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PROJECT_ICONS.map(p => [p.key, p.Icon])
)
