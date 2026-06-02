import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

const PAGE_TITLES: Record<string, string> = {
  '/': '概览',
  '/transactions': '账本',
  '/add': '记账',
  '/reports': 'AI 报告',
  '/chat': 'AI 对话',
  '/budget': '预算管理',
  '/settings': '设置',
}

export default function Header() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Auto Money'
  const { toggleSidebar } = useUIStore()

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1 -ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <span className="text-xl">☰</span>
        </button>
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <Link
        to="/add"
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span>+</span> 记账
      </Link>
    </header>
  )
}
