import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import TransactionList from '@/pages/TransactionList'
import AddTransaction from '@/pages/AddTransaction'
import Reports from '@/pages/Reports'
import Chat from '@/pages/Chat'
import Budget from '@/pages/Budget'
import Settings from '@/pages/Settings'
import { seedDatabase } from '@/db/seed'

function App() {
  useEffect(() => {
    seedDatabase()
  }, [])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
