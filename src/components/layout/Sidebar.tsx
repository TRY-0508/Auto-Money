import { NavLink } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

const NAV = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/transactions', label: '账本', icon: '📋' },
  { to: '/ai', label: 'AI 助手', icon: '🤖' },
  { to: '/budget', label: '预算', icon: '🎯' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-56 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-r border-gray-200/50 dark:border-gray-800/50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center gap-2 h-14 px-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-lg">Auto Money</span>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${
                  isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                }`}>
              <span className="text-lg">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
