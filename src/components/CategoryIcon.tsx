import { useCategories } from '@/db/hooks'
import { CATEGORY_ICON_MAP, MoreHorizontal } from '@/lib/icons'

interface CategoryIconProps {
  categoryId: string
  size?: number
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find(c => c.id === categoryId)
  const icon = cat?.icon || ''
  const Icon = CATEGORY_ICON_MAP[icon] || MoreHorizontal
  const bg = cat?.color || '#6b7280'

  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ width: size + 12, height: size + 12, backgroundColor: bg }}>
      <Icon size={size} strokeWidth={2} color="#fff" />
    </div>
  )
}
