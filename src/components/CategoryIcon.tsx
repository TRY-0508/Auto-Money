import { useCategories } from '@/db/hooks'
import { CATEGORY_ICON_MAP, MoreHorizontal } from '@/lib/icons'

const ICON_COLORS = ['#f59e0b','#3b82f6','#ec4899','#8b5cf6','#10b981','#f43f5e','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#eab308']

interface CategoryIconProps {
  categoryId: string
  size?: number
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const idx = categories.findIndex(c => c.id === categoryId)
  const cat = categories[idx]
  const icon = cat?.icon || ''
  const Icon = CATEGORY_ICON_MAP[icon] || MoreHorizontal
  const bg = ICON_COLORS[idx % ICON_COLORS.length]

  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ width: size + 12, height: size + 12, backgroundColor: bg }}>
      <Icon size={size} strokeWidth={2} color="#fff" />
    </div>
  )
}
