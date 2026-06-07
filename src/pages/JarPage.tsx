import { useState } from 'react'
import { formatAmount } from '@/lib/utils'
import StarJar from '@/components/StarJar'
import { Plus, Target, Lightbulb, Check, Trash2, X } from '@/lib/icons'

interface JarGoal {
  id: string
  name: string
  target: number
  current: number
  color: string
  createdAt: number
  ideas: JarIdea[]
}

interface JarIdea {
  id: string
  description: string
  amount: number
  status: 'pending' | 'resisted'
  resistedAt?: number
  goalName?: string
}

const KEY = 'moodmoney_jar_v2'

function load(): JarGoal[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(goals: JarGoal[]) { localStorage.setItem(KEY, JSON.stringify(goals)) }

export default function JarPage() {
  const [goals, setGoals] = useState<JarGoal[]>(load)
  const [activeGoal, setActiveGoal] = useState<string | null>(goals[0]?.id || null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [showNewIdea, setShowNewIdea] = useState(false)
  const [showResistPicker, setShowResistPicker] = useState<string | null>(null)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [ideaDesc, setIdeaDesc] = useState('')
  const [ideaAmount, setIdeaAmount] = useState('')

  const active = goals.find(g => g.id === activeGoal)

  // Gather all unassigned ideas
  const pendingIdeas = goals.flatMap(g => g.ideas.filter(i => i.status === 'pending')).sort((a, b) => (b as any)._ts - (a as any)._ts)

  const handleAddGoal = () => {
    if (!goalName.trim()) return
    const colors = ['#f59e0b','#8b5cf6','#10b981','#f43f5e','#3b82f6']
    const g: JarGoal = {
      id: crypto.randomUUID(), name: goalName.trim(), target: parseFloat(goalTarget) || 1000,
      current: 0, color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: Date.now(), ideas: [],
    }
    const updated = [...goals, g]; setGoals(updated); save(updated)
    setActiveGoal(g.id); setShowNewGoal(false); setGoalName(''); setGoalTarget('')
  }

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id); setGoals(updated); save(updated)
    if (activeGoal === id) setActiveGoal(updated[0]?.id || null)
  }

  const handleAddIdea = () => {
    if (!ideaDesc.trim()) return
    const idea: JarIdea = { id: crypto.randomUUID(), description: ideaDesc.trim(), amount: parseFloat(ideaAmount) || 0, status: 'pending' }
    // Add to active goal's ideas pool
    if (!active) return
    const updated = goals.map(g => g.id === active.id ? { ...g, ideas: [...g.ideas, { ...idea, _ts: Date.now() } as any] } : g)
    setGoals(updated); save(updated)
    setShowNewIdea(false); setIdeaDesc(''); setIdeaAmount('')
  }

  const handleResist = (ideaId: string, goalId: string) => {
    const updated = goals.map(g => {
      if (g.id !== goalId) return g
      const idea = g.ideas.find(i => i.id === ideaId)
      if (!idea) return g
      return {
        ...g,
        current: g.current + (idea.amount || 0),
        ideas: g.ideas.map(i => i.id === ideaId ? { ...i, status: 'resisted' as const, resistedAt: Date.now(), goalName: g.name } : i),
      }
    })
    setGoals(updated); save(updated)
    setShowResistPicker(null)
  }

  const handleDeleteIdea = (goalId: string, ideaId: string) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, ideas: g.ideas.filter(i => i.id !== ideaId) } : g)
    setGoals(updated); save(updated)
  }

  const allResisted = goals.flatMap(g => g.ideas.filter(i => i.status === 'resisted').map(i => ({ ...i, goalName: g.name, goalColor: g.color })))
  const activePending = active?.ideas.filter(i => i.status === 'pending') || []

  const starCount = active?.ideas.filter(i => i.status === 'resisted').length || 0

  return (
    <div className="max-w-lg mx-auto space-y-4 slide-up pb-24 md:pb-4">
      {/* Goal tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {goals.map(g => (
          <button key={g.id} onClick={() => setActiveGoal(g.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeGoal === g.id ? 'text-white shadow-sm' : 'bg-white/40 text-gray-500 hover:bg-white/70'
            }`}
            style={activeGoal === g.id ? { backgroundColor: g.color } : {}}>
            <Target size={16} strokeWidth={1.8} />{g.name}
            <span className="text-xs opacity-80">{formatAmount(g.current)}/{formatAmount(g.target)}</span>
          </button>
        ))}
        <button onClick={() => setShowNewGoal(!showNewGoal)}
          className={`flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium border-2 border-dashed transition-all ${
            showNewGoal ? 'border-violet-400 text-violet-400' : 'border-gray-300 text-gray-400 hover:border-violet-300'
          }`}>
          {showNewGoal ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {showNewGoal && (
        <div className="card p-4 space-y-3">
          <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="目标，如：买Switch" className="input" autoFocus />
          <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="目标金额，如：2000" className="input" />
          <button onClick={handleAddGoal} disabled={!goalName.trim()} className="btn btn-primary w-full">创建目标</button>
        </div>
      )}

      {!active ? (
        <div className="card p-10 text-center">
          <Target size={48} strokeWidth={1} className="text-violet-400 mx-auto mb-4" />
          <p className="text-muted text-sm mb-4">设定一个积攒目标，记录每次克制</p>
          <button onClick={() => setShowNewGoal(true)} className="btn btn-primary">创建第一个目标</button>
        </div>
      ) : (
        <>
          {/* Jar display */}
          <div className="card p-6 flex flex-col items-center">
            <StarJar
              stars={starCount}
              target={active.target}
              current={active.current}
              amounts={active.ideas.filter(i => i.status === 'resisted').map(i => i.amount)}
            />
            <p className="text-sm text-muted mt-1">
              已攒 {formatAmount(active.current)} / {formatAmount(active.target)}
              {active.current >= active.target && (
                <span className="ml-2 font-bold text-violet-600 bounce-in">目标达成!</span>
              )}
            </p>
          </div>

          {/* Ideas */}
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb size={18} strokeWidth={1.8} className="text-violet-500" />
                想法记录
                {activePending.length > 0 && <span className="text-xs text-amber-500 font-medium">{activePending.length}个待考验</span>}
              </span>
              <button onClick={() => setShowNewIdea(!showNewIdea)} className="btn-icon"><Plus size={14} /></button>
            </div>

            {showNewIdea && (
              <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50 border-b">
                <input type="text" value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)} placeholder="想买什么？如：一双球鞋" className="input" autoFocus />
                <input type="number" value={ideaAmount} onChange={e => setIdeaAmount(e.target.value)} placeholder="价格（如：899）" className="input" />
                <button onClick={handleAddIdea} disabled={!ideaDesc.trim()} className="btn btn-primary w-full">记录想法</button>
              </div>
            )}

            <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
              {active.ideas.length === 0 && !showNewIdea && (
                <div className="px-5 py-8 text-center text-sm text-muted">记录一个想买但克制了的想法</div>
              )}
              {active.ideas.map(idea => (
                <div key={idea.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${idea.status === 'resisted' ? 'opacity-70' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    idea.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {idea.status === 'pending' ? '💭' : '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${idea.status === 'resisted' ? 'line-through' : ''}`}>{idea.description}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {idea.amount > 0 && formatAmount(idea.amount)}
                      {idea.status === 'resisted' && ` · 已克制`}
                    </p>
                  </div>
                  {idea.status === 'pending' ? (
                    <>
                      {showResistPicker === idea.id ? (
                        <div className="flex items-center gap-1">
                          <select className="text-xs rounded-lg border px-1 py-0.5" onChange={e => { handleResist(idea.id, e.target.value); setShowResistPicker(null) }} autoFocus>
                            <option value="">投入哪个瓶子?</option>
                            {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                          <button onClick={() => setShowResistPicker(null)} className="btn-icon"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setShowResistPicker(idea.id)} className="btn btn-sm btn-primary flex items-center gap-1">
                          <Check size={14} />克制
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => handleDeleteIdea(active.id, idea.id)} className="btn-icon btn-icon-danger"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {active.ideas.length > 0 && (
            <div className="text-center">
              <button onClick={() => handleDeleteGoal(active.id)} className="text-xs text-red-400 hover:text-red-600">删除这个目标</button>
            </div>
          )}

          {/* All resisted history */}
          {allResisted.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header">克制记录</div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/30 max-h-60 overflow-y-auto">
                {allResisted.sort((a: any, b: any) => (b.resistedAt || 0) - (a.resistedAt || 0)).map((idea: any) => (
                  <div key={idea.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="text-lg flex-shrink-0">⭐</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{idea.description}</p>
                      <p className="text-xs text-muted">{idea.goalName} · {idea.amount > 0 ? formatAmount(idea.amount) : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
