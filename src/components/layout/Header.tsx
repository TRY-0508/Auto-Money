import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

const TITLES: Record<string, string> = {
  '/': 'Auto Money',
  '/transactions': '账本',
  '/add': '记账',
  '/ai': 'AI 助手',
  '/budget': '预算',
  '/settings': '设置',
}

export default function Header() {
  const location = useLocation()
  const title = TITLES[location.pathname] || 'Auto Money'
  const { toggleSidebar } = useUIStore()

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <span className="text-xl">☰</span>
        </button>
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <Link to="/add"
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm">
        <span>+</span> 记账
      </Link>
    </header>
  )
}
