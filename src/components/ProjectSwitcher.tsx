import { useProjects } from '@/db/hooks'
import { PROJECT_ICON_MAP, Package } from '@/lib/icons'

interface ProjectSwitcherProps {
  selectedId: string | null
  onChange: (id: string | null) => void
}

export default function ProjectSwitcher({ selectedId, onChange }: ProjectSwitcherProps) {
  const { projects } = useProjects()
  if (projects.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all ${
          !selectedId ? 'bg-[var(--c-primary-gradient)] text-white shadow-sm' : 'bg-white/60 dark:bg-gray-800/60 text-gray-500 hover:bg-white'
        }`}>
        全部
      </button>
      {projects.map(p => {
        const Icon = PROJECT_ICON_MAP[p.icon] || Package
        return (
          <button key={p.id} onClick={() => onChange(p.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all flex items-center gap-1 ${
              selectedId === p.id ? 'text-white shadow-sm' : 'bg-white/60 dark:bg-gray-800/60 text-gray-500 hover:bg-white'
            }`}
            style={selectedId === p.id ? { backgroundColor: p.color } : {}}>
            <Icon size={14} strokeWidth={1.8} />{p.name}
          </button>
        )
      })}
    </div>
  )
}
