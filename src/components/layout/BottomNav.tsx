import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Brain, Settings } from '@/lib/icons'
import AddModal from '@/components/AddModal'

export default function BottomNav() {
  const [showAdd, setShowAdd] = useState(false)
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200/50 flex items-center justify-around h-16">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-violet-500 font-medium' : 'text-gray-400'}`}>
          <LayoutDashboard size={22} strokeWidth={1.8} /><span>首页</span>
        </NavLink>
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 -mt-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform">+</button>
        <NavLink to="/ai" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-violet-500 font-medium' : 'text-gray-400'}`}>
          <Brain size={22} strokeWidth={1.8} /><span>AI</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-violet-500 font-medium' : 'text-gray-400'}`}>
          <Settings size={22} strokeWidth={1.8} /><span>设置</span>
        </NavLink>
      </nav>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}
