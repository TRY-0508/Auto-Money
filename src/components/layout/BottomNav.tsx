import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Brain, Settings, Star } from '@/lib/icons'

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200/50 flex items-center justify-around h-16">
      <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent dark:text-amber-400 font-medium' : 'text-gray-400'}`}>
        <LayoutDashboard size={22} strokeWidth={1.8} /><span>首页</span>
      </NavLink>
      <NavLink to="/ai" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent font-medium' : 'text-gray-400'}`}>
        <Brain size={22} strokeWidth={1.8} /><span>AI</span>
      </NavLink>
      <NavLink to="/jar" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent font-medium' : 'text-gray-400'}`}>
        <Star size={22} strokeWidth={1.8} /><span>心愿</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent font-medium' : 'text-gray-400'}`}>
        <Settings size={22} strokeWidth={1.8} /><span>设置</span>
      </NavLink>
    </nav>
  )
}
