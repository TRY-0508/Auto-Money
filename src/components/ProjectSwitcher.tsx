import { useProjects } from '@/db/hooks'
import { useState } from 'react'

interface ProjectSwitcherProps {
  selectedId: string | null
  onChange: (id: string | null) => void
}

export default function ProjectSwitcher({ selectedId, onChange }: ProjectSwitcherProps) {
  const { projects } = useProjects()

  if (projects.length === 0) return null

  const selected = projects.find(p => p.id === selectedId)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all ${
          !selectedId
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
            : 'bg-white/60 dark:bg-gray-800/60 text-gray-500 hover:bg-white dark:hover:bg-gray-800 backdrop-blur border border-gray-200/50 dark:border-gray-700/50'
        }`}
      >
        📊 全部
      </button>
      {projects.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all flex items-center gap-1 ${
            selectedId === p.id
              ? 'text-white shadow-sm'
              : 'bg-white/60 dark:bg-gray-800/60 text-gray-500 hover:bg-white dark:hover:bg-gray-800 backdrop-blur border border-gray-200/50 dark:border-gray-700/50'
          }`}
          style={selectedId === p.id ? { backgroundColor: p.color } : {}}
        >
          <span>{p.icon}</span>
          {p.name}
        </button>
      ))}
    </div>
  )
}
