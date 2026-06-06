import { useCategories } from '@/db/hooks'
import { CATEGORY_ICON_MAP, MoreHorizontal } from '@/lib/icons'

interface CategoryIconProps {
  categoryId: string
  size?: number
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === categoryId)
  const icon = cat?.icon || ''
  const Icon = CATEGORY_ICON_MAP[icon] || MoreHorizontal

  return (
    <div className="rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100/80 dark:bg-gray-800/80" style={{ width: size + 12, height: size + 12 }}>
      <Icon size={size} strokeWidth={1.8} className="text-gray-500 dark:text-gray-400" />
    </div>
  )
}

