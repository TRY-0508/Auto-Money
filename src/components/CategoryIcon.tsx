import { useCategories } from '@/db/hooks'
import { CATEGORY_ICON_MAP, MoreHorizontal } from '@/lib/icons'

interface CategoryIconProps {
  categoryId: string
  size?: number
}

function isEmoji(str: string): boolean {
  return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u.test(str)
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === categoryId)
  const icon = cat?.icon || ''
  const color = cat?.color || '#6b7280'
  const Icon = CATEGORY_ICON_MAP[icon] || MoreHorizontal

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color + '18', width: size + 14, height: size + 14 }}
    >
      {isEmoji(icon) ? (
        <span style={{ fontSize: size }}>{icon}</span>
      ) : (
        <Icon size={size} color={color} strokeWidth={1.8} />
      )}
    </div>
  )
}
