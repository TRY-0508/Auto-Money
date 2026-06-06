import {
  UtensilsCrossed, Car, ShoppingBag, Gamepad2, Home, Pill, BookOpen,
  Smartphone, Package, MoreHorizontal, Banknote, Briefcase, TrendingUp,
  Gift, FileText, Coffee, Cat, Plane, Dumbbell, Music, Shirt, SprayCan as Makeup,
  Beer, Stethoscope, Lightbulb, Camera, Wrench, Bus, Train, Pizza,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type IconKey = string

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  utensils: UtensilsCrossed, car: Car, 'shopping-bag': ShoppingBag,
  'gamepad-2': Gamepad2, home: Home, pill: Pill, 'book-open': BookOpen,
  smartphone: Smartphone, package: Package, 'more-horizontal': MoreHorizontal,
  banknote: Banknote, briefcase: Briefcase, 'trending-up': TrendingUp,
  gift: Gift, 'file-text': FileText, coffee: Coffee, cat: Cat, plane: Plane,
  dumbbell: Dumbbell, music: Music, shirt: Shirt, makeup: Makeup,
  beer: Beer, stethoscope: Stethoscope, lightbulb: Lightbulb, camera: Camera,
  wrench: Wrench, bus: Bus, train: Train, pizza: Pizza,
}

// Preset category icon assignments
export const PRESET_ICONS: Record<string, IconKey> = {
  '餐饮': 'utensils', '交通': 'car', '购物': 'shopping-bag', '娱乐': 'gamepad-2',
  '住房': 'home', '医疗': 'pill', '教育': 'book-open', '通讯': 'smartphone',
  '日用': 'package', '其他': 'more-horizontal',
  '工资': 'banknote', '兼职': 'briefcase', '理财': 'trending-up',
  '红包': 'gift', '报销': 'file-text',
}

// Available icons for custom categories (Lucide icon keys)
export const CUSTOM_ICON_OPTIONS: { key: IconKey; label: string }[] = [
  { key: 'utensils', label: '餐饮' }, { key: 'coffee', label: '咖啡' },
  { key: 'pizza', label: '美食' }, { key: 'car', label: '汽车' },
  { key: 'bus', label: '公交' }, { key: 'train', label: '火车' },
  { key: 'plane', label: '飞机' }, { key: 'shopping-bag', label: '购物' },
  { key: 'gamepad-2', label: '游戏' }, { key: 'home', label: '住房' },
  { key: 'pill', label: '医疗' }, { key: 'book-open', label: '教育' },
  { key: 'smartphone', label: '通讯' }, { key: 'package', label: '日用' },
  { key: 'briefcase', label: '工作' }, { key: 'gift', label: '礼物' },
  { key: 'cat', label: '宠物' }, { key: 'camera', label: '摄影' },
  { key: 'music', label: '音乐' }, { key: 'dumbbell', label: '健身' },
  { key: 'shirt', label: '服饰' }, { key: 'makeup', label: '美妆' },
  { key: 'beer', label: '聚会' }, { key: 'lightbulb', label: '灵感' },
  { key: 'stethoscope', label: '健康' }, { key: 'wrench', label: '维修' },
  { key: 'more-horizontal', label: '其他' },
]
