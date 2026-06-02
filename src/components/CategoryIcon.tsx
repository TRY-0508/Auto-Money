import { useCategories } from '@/db/hooks'

interface CategoryIconProps {
  categoryId: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }

export default function CategoryIcon({ categoryId, size = 'md' }: CategoryIconProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === categoryId)

  if (!cat) {
    return (
      <div className={`${SIZE_MAP[size]} rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
        <span>📦</span>
      </div>
    )
  }

  return (
    <div
      className={`${SIZE_MAP[size]} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: cat.color + '20' }}
    >
      <span>{cat.icon}</span>
    </div>
  )
}
