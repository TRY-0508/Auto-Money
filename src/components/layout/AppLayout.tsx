import { useEffect, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import ParticleNetwork from '@/components/ParticleNetwork'
import { useSettings, useTransactions } from '@/db/hooks'
import { MOOD_LIST } from '@/lib/icons'
import { getCurrentYearMonth } from '@/lib/utils'

const FIXED_THEMES = ['warm-amber','forest-green','ocean-blue','rose-pink','lavender','sunset-orange']
const DYNAMIC_MOODS = ['happy','calm','neutral','sad','anxious','angry','excited','tired']

export default function AppLayout() {
  const { settings } = useSettings()
  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })

  const moodKey = useMemo(() => {
    const moodTx = transactions.filter(t => t.mood && t.type === 'expense')
    if (moodTx.length === 0) return 'neutral'

    const scheme = settings?.colorScheme || 'most-frequent'

    if (scheme === 'latest') {
      const latest = moodTx.sort((a, b) => b.date.localeCompare(a.date))[0]
      return latest.mood || 'neutral'
    }

    if (scheme === 'adaptive') {
      const today = new Date().toISOString().slice(0, 10)
      const todayTx = moodTx.filter(t => t.date === today)
      if (todayTx.length > 0) return todayTx[todayTx.length - 1].mood || 'neutral'
    }

    // most-frequent
    const counts: Record<string, number> = {}
    for (const t of moodTx) counts[t.mood!] = (counts[t.mood!] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return top[0]?.[0] || 'neutral'
  }, [transactions, settings?.colorScheme])

  useEffect(() => {
    const root = document.documentElement
    // Clear all theme classes
    FIXED_THEMES.forEach(t => root.classList.remove(`theme-${t}`))
    DYNAMIC_MOODS.forEach(m => root.classList.remove(`theme-dynamic-${m}`))

    if (settings?.themeMode === 'fixed' && settings?.fixedTheme) {
      root.classList.add(`theme-${settings.fixedTheme}`)
    } else {
      root.classList.add(`theme-dynamic-${moodKey}`)
    }
  }, [settings?.themeMode, settings?.fixedTheme, moodKey])

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
