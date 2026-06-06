import { useCategories } from '@/db/hooks'
import { ICON_MAP } from '@/lib/icons'
import { MoreHorizontal } from 'lucide-react'

interface CategoryIconProps {
  categoryId: string
  size?: number
}

// Check if a string is a single emoji (for backward compat with old data)
function isEmoji(str: string): boolean {
  const regex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u
  return regex.test(str)
}

export default function CategoryIcon({ categoryId, size = 18 }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === categoryId)
  const icon = cat?.icon || ''
  const color = cat?.color || '#6b7280'
  const Icon = ICON_MAP[icon] || MoreHorizontal

  // If it's an old emoji icon, render as text; otherwise render Lucide SVG
  const renderEmoji = isEmoji(icon)

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: color + '18',
        width: size + 14,
        height: size + 14,
      }}
    >
      {renderEmoji ? (
        <span style={{ fontSize: size }}>{icon}</span>
      ) : (
        <Icon size={size} color={color} strokeWidth={1.8} />
      )}
    </div>
  )
}
