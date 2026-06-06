import { useEffect, Suspense, lazy, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SplashScreen from '@/components/SplashScreen'
import ParticleEffect from '@/components/ParticleEffect'
import ParticleNetwork from '@/components/ParticleNetwork'
import { seedDatabase } from '@/db/seed'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AIAssistant = lazy(() => import('@/pages/AIAssistant'))
const Settings = lazy(() => import('@/pages/Settings'))

const SPLASH_KEY = 'moodmoney_splash_seen'

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false
    // Show splash each session
    const seen = sessionStorage.getItem(SPLASH_KEY)
    return !seen
  })

  useEffect(() => { seedDatabase() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const fab = document.querySelector('[class*="fixed bottom"]') as HTMLElement
        if (fab) fab.click()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (showSplash) {
    return (
      <SplashScreen onEnter={() => {
        sessionStorage.setItem(SPLASH_KEY, '1')
        setShowSplash(false)
      }} />
    )
  }

  return (
    <>
      <ParticleNetwork />
      <ParticleEffect />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
