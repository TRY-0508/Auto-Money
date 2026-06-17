import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import ParticleNetwork from '@/components/ParticleNetwork'
import { useSettings } from '@/db/hooks'

const FIXED_THEMES = ['warm-amber','forest-green','ocean-blue','rose-pink','lavender','sunset-orange']

export default function AppLayout() {
  const { settings } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    FIXED_THEMES.forEach(t => root.classList.remove(`theme-${t}`))
    ;['happy','calm','neutral','sad','anxious','angry','excited','tired'].forEach(m =>
      root.classList.remove(`theme-dynamic-${m}`))

    if (settings?.themeMode === 'fixed' && settings?.fixedTheme) {
      root.classList.add(`theme-${settings.fixedTheme}`)
    }
  }, [settings?.themeMode, settings?.fixedTheme])

  return (
    <div className="flex h-screen aurora-bg relative">
      <ParticleNetwork />
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 z-10 relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
