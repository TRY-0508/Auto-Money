import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '概览', icon: '📊' },
  { to: '/transactions', label: '账本', icon: '📋' },
  { to: '/add', label: '记账', icon: '➕' },
  { to: '/ai', label: 'AI', icon: '🤖' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around h-16 safe-area-bottom">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <span className="text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
