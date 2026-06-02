import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import AddModal from '@/components/AddModal'

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/ai', label: 'AI', icon: '🤖' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function BottomNav() {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around h-16">
        {NAV_ITEMS.slice(0, 1).map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`
            }>
            <span className="text-xl">{item.icon}</span><span>{item.label}</span>
          </NavLink>
        ))}

        {/* Center FAB */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 -mt-6 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl"
        >
          +
        </button>

        {NAV_ITEMS.slice(1).map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`
            }>
            <span className="text-xl">{item.icon}</span><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}
