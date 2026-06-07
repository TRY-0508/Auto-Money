import { NavLink } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { LayoutDashboard, Brain, Settings, Star } from '@/lib/icons'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-56 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-r border-gray-200/50 dark:border-gray-800/50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center gap-2 h-14 px-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <LayoutDashboard size={22} strokeWidth={1.8} className="text-violet-500" />
          <span className="font-semibold text-lg">心情收支簿</span>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { to: '/', label: '首页', Icon: LayoutDashboard },
            { to: '/ai', label: 'AI 助手', Icon: Brain },
            { to: '/jar', label: '心愿', Icon: Star },
            { to: '/settings', label: '设置', Icon: Settings },
          ].map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${isActive ? 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50'}`}>
              <Icon size={20} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
