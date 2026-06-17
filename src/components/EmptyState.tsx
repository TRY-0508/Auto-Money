import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-4">
      {icon && <div className="mb-4 float flex justify-center">{icon}</div>}
      <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1.5">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-5 px-6 py-2.5 bg-[var(--c-primary-gradient)] text-white text-sm font-medium rounded-full hover:brightness-110 transition-all shadow-lg">
          {action.label}
        </button>
      )}
    </div>
  )
}
