import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import AddModal from '@/components/AddModal'

const TITLES: Record<string, string> = {
  '/': '心情收支簿',
  '/ai': 'AI 助手',
  '/settings': '设置',
}

export default function Header() {
  const location = useLocation()
  const title = TITLES[location.pathname] || '心情收支簿'
  const { toggleSidebar } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between h-14 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="md:hidden p-1 -ml-1 text-gray-500"><span className="text-xl">☰</span></button>
          <h1 className="font-semibold text-lg">{title}</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm rounded-2xl hover:from-violet-600 hover:to-purple-600 transition-all shadow-sm">
          <span>+</span> 记一笔
        </button>
      </header>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}
