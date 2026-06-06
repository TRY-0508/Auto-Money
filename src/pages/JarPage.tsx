import { useState, useMemo } from 'react'
import { useTransactions, useCategories } from '@/db/hooks'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import StarJar from '@/components/StarJar'

interface JarEntry {
  id: string
  description: string
  amount: number
  resistedAt: number
}

const STORAGE_KEY = 'moodmoney_jar'
const GOAL_KEY = 'moodmoney_jar_goal'

function loadEntries(): JarEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveEntries(entries: JarEntry[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) }
function loadGoal(): string { return localStorage.getItem(GOAL_KEY) || '' }
function saveGoal(goal: string) { localStorage.setItem(GOAL_KEY, goal) }

export default function JarPage() {
  const [entries, setEntries] = useState<JarEntry[]>(loadEntries)
  const [goal, setGoal] = useState(loadGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(goal)
  const [showAdd, setShowAdd] = useState(false)
  const [addDesc, setAddDesc] = useState('')
  const [addAmount, setAddAmount] = useState('')

  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })

  // Auto-detect resisted purchases from transactions marked as "冲动消费" that had a cool-down-like note
  const totalSaved = entries.reduce((s, e) => s + e.amount, 0)
  const starCount = entries.length

  const handleSaveGoal = () => {
    saveGoal(goalInput)
    setGoal(goalInput)
    setEditingGoal(false)
  }

  const handleAdd = () => {
    const amount = parseFloat(addAmount)
    if (!amount || amount <= 0 || !addDesc.trim()) return
    const entry: JarEntry = { id: crypto.randomUUID(), description: addDesc.trim(), amount, resistedAt: Date.now() }
    const updated = [entry, ...entries]
    setEntries(updated)
    saveEntries(updated)
    setAddDesc('')
    setAddAmount('')
    setShowAdd(false)
  }

  const handleDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    saveEntries(updated)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 slide-up pb-24">
      {/* Goal */}
      <div className="card p-5 text-center">
        {goal && !editingGoal ? (
          <div>
            <p className="text-xs text-muted mb-1">积攒目标</p>
            <h2 className="text-xl font-bold text-violet-600">{goal}</h2>
            <button onClick={() => { setEditingGoal(true); setGoalInput(goal) }} className="text-xs text-violet-500 mt-2 hover:underline">修改目标</button>
          </div>
        ) : editingGoal ? (
          <div className="flex gap-2">
            <input type="text" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="你的积攒目标，如：买Switch" className="input flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveGoal()} />
            <button onClick={handleSaveGoal} className="btn btn-primary btn-sm">保存</button>
            <button onClick={() => setEditingGoal(false)} className="btn btn-secondary btn-sm">取消</button>
          </div>
        ) : (
          <div>
            <p className="text-muted text-sm mb-3">设定一个积攒目标</p>
            <button onClick={() => { setEditingGoal(true); setGoalInput('') }} className="btn btn-primary btn-sm">设定目标</button>
          </div>
        )}
      </div>

      {/* Jar */}
      <div className="card p-6 flex flex-col items-center">
        <StarJar stars={starCount} />
        <p className="text-sm text-muted mt-3">已累计克制 {totalSaved > 0 ? formatAmount(totalSaved) : '—'}</p>
      </div>

      {/* Quick add */}
      <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary w-full">
        {showAdd ? '取消' : '+ 记录一次克制'}
      </button>

      {showAdd && (
        <div className="card p-4 space-y-3">
          <input type="text" value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="克制了什么？如：想买一双球鞋" className="input" />
          <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="省下了多少钱？" className="input" />
          <button onClick={handleAdd} disabled={!addDesc.trim() || !addAmount} className="btn btn-primary w-full">记录克制</button>
        </div>
      )}

      {/* History */}
      {entries.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">克制记录</div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">⭐ {e.description}</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(e.resistedAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-semibold amount">{formatAmount(e.amount)}</span>
                  <button onClick={() => handleDelete(e.id)} className="btn-icon btn-icon-danger"><span>×</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
