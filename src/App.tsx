import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SplashScreen from '@/components/SplashScreen'
import ParticleEffect from '@/components/ParticleEffect'
import Dashboard from '@/pages/Dashboard'
import AIAssistant from '@/pages/AIAssistant'
import Settings from '@/pages/Settings'
import { seedDatabase } from '@/db/seed'

const SPLASH_KEY = 'moodmoney_splash_seen'

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
      <ParticleEffect />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
