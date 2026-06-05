import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import AddModal from '@/components/AddModal'

const NAV = [
  { to: '/', label: '首页', icon: '💜' },
  { to: '/ai', label: 'AI', icon: '🧠' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function BottomNav() {
  const [showAdd, setShowAdd] = useState(false)
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200/50 dark:border-gray-800/50 flex items-center justify-around h-16">
        {NAV.slice(0, 1).map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-violet-500 font-medium' : 'text-gray-400'}`}>
            <span className="text-xl">{item.icon}</span><span>{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 -mt-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform">+</button>
        {NAV.slice(1).map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-violet-500 font-medium' : 'text-gray-400'}`}>
            <span className="text-xl">{item.icon}</span><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}
