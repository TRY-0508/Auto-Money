import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import ParticleNetwork from '@/components/ParticleNetwork'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-orbs relative">
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
