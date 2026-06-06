import { useCategories } from '@/db/hooks'
import { ICON_MAP } from '@/lib/icons'
import { MoreHorizontal } from 'lucide-react'

interface CategoryIconProps {
  categoryId: string
  size?: number
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === categoryId)
  const iconKey = cat?.icon || ''
  const Icon = ICON_MAP[iconKey] || MoreHorizontal

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: (cat?.color || '#6b7280') + '18',
        width: size + 14,
        height: size + 14,
      }}
    >
      <Icon size={size} color={cat?.color || '#6b7280'} strokeWidth={1.8} />
    </div>
  )
}
