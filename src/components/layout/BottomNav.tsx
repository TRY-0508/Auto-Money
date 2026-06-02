import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/transactions', label: '账本', icon: '📋' },
  { to: '/add', label: '记账', icon: '➕' },
  { to: '/ai', label: 'AI', icon: '🤖' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200/50 dark:border-gray-800/50 flex items-center justify-around h-16">
      {NAV.map(item => (
        <NavLink key={item.to} to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs transition-colors ${isActive ? 'text-blue-500 font-medium' : 'text-gray-400'}`
          }>
          <span className="text-xl">{item.icon}</span><span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
