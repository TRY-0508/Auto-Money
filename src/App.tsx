import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import TransactionList from '@/pages/TransactionList'
import AddTransaction from '@/pages/AddTransaction'
import AIAssistant from '@/pages/AIAssistant'
import Budget from '@/pages/Budget'
import Settings from '@/pages/Settings'
import { seedDatabase } from '@/db/seed'

function App() {
  useEffect(() => { seedDatabase() }, [])
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
