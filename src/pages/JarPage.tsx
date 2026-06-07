import { useState } from 'react'
import { formatAmount } from '@/lib/utils'
import StarJar from '@/components/StarJar'
import { Plus, Target, Lightbulb, Check, Trash2, X } from '@/lib/icons'

interface JarGoal {
  id: string
  name: string
  target: number
  icon: string
  color: string
  createdAt: number
  stars: number
}

interface JarIdea {
  id: string
  goalId: string
  description: string
  amount: number
  status: 'pending' | 'resisted'
  createdAt: number
}

const GOALS_KEY = 'moodmoney_jar_goals'
const IDEAS_KEY = 'moodmoney_jar_ideas'

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback } catch { return fallback }
}
function save(key: string, data: any) { localStorage.setItem(key, JSON.stringify(data)) }

const GOAL_ICONS = [
  { icon: 'gamepad-2', label: '游戏' },
  { icon: 'plane', label: '旅行' },
  { icon: 'briefcase', label: '工作' },
  { icon: 'shopping-bag', label: '购物' },
  { icon: 'home', label: '住房' },
  { icon: 'car', label: '汽车' },
  { icon: 'gift', label: '礼物' },
  { icon: 'book-open', label: '学习' },
]
const GOAL_COLORS = ['#f59e0b','#8b5cf6','#10b981','#f43f5e','#3b82f6','#ec4899']

export default function JarPage() {
  const [goals, setGoals] = useState<JarGoal[]>(() => load(GOALS_KEY, []))
  const [ideas, setIdeas] = useState<JarIdea[]>(() => load(IDEAS_KEY, []))
  const [activeGoal, setActiveGoal] = useState<string | null>(goals[0]?.id || null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [showNewIdea, setShowNewIdea] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalIcon, setGoalIcon] = useState('gamepad-2')
  const [goalColor, setGoalColor] = useState('#f59e0b')
  const [ideaDesc, setIdeaDesc] = useState('')
  const [ideaAmount, setIdeaAmount] = useState('')

  const active = goals.find(g => g.id === activeGoal)
  const activeIdeas = ideas.filter(i => i.goalId === activeGoal)

  const handleAddGoal = () => {
    if (!goalName.trim()) return
    const g: JarGoal = { id: crypto.randomUUID(), name: goalName.trim(), target: parseInt(goalTarget) || 10, icon: goalIcon, color: goalColor, stars: 0, createdAt: Date.now() }
    const updated = [...goals, g]
    setGoals(updated); save(GOALS_KEY, updated)
    setActiveGoal(g.id); setShowNewGoal(false)
    setGoalName(''); setGoalTarget('')
  }

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id)
    setGoals(updated); save(GOALS_KEY, updated)
    const remainingIdeas = ideas.filter(i => i.goalId !== id)
    setIdeas(remainingIdeas); save(IDEAS_KEY, remainingIdeas)
    if (activeGoal === id) setActiveGoal(updated[0]?.id || null)
  }

  const handleAddIdea = () => {
    if (!ideaDesc.trim() || !activeGoal) return
    const idea: JarIdea = { id: crypto.randomUUID(), goalId: activeGoal, description: ideaDesc.trim(), amount: parseFloat(ideaAmount) || 0, status: 'pending', createdAt: Date.now() }
    const updated = [...ideas, idea]
    setIdeas(updated); save(IDEAS_KEY, updated)
    setShowNewIdea(false); setIdeaDesc(''); setIdeaAmount('')
  }

  const handleResist = (ideaId: string) => {
    const updated = ideas.map(i => i.id === ideaId ? { ...i, status: 'resisted' as const } : i)
    setIdeas(updated); save(IDEAS_KEY, updated)
    const gUpdated = goals.map(g => g.id === activeGoal ? { ...g, stars: g.stars + 1 } : g)
    setGoals(gUpdated); save(GOALS_KEY, gUpdated)
  }

  const handleDeleteIdea = (id: string) => {
    const updated = ideas.filter(i => i.id !== id)
    setIdeas(updated); save(IDEAS_KEY, updated)
  }

  const pendingCount = activeIdeas.filter(i => i.status === 'pending').length

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
            <Target size={16} strokeWidth={1.8} />{g.name} <span className="text-xs opacity-70">{g.stars}⭐</span>
          </button>
        ))}
        <button onClick={() => setShowNewGoal(!showNewGoal)} className={`flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium border-2 border-dashed transition-all ${showNewGoal ? 'border-violet-400 text-violet-400' : 'border-gray-300 text-gray-400 hover:border-violet-300'}`}>
          {showNewGoal ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {/* New goal form */}
      {showNewGoal && (
        <div className="card p-4 space-y-3">
          <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="目标名称，如：买Switch" className="input" autoFocus />
          <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="目标星星数，如：20" className="input" />
          <div className="flex gap-1 flex-wrap">{GOAL_ICONS.map(g => <button key={g.icon} onClick={() => setGoalIcon(g.icon)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${goalIcon === g.icon ? 'bg-violet-100 ring-1 ring-violet-400' : 'hover:bg-gray-100'} text-lg`}>{g.label[0]}</button>)}</div>
          <div className="flex gap-1.5">{GOAL_COLORS.map(c => <button key={c} onClick={() => setGoalColor(c)} className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: c, borderColor: goalColor === c ? '#374151' : 'transparent' }} />)}</div>
          <button onClick={handleAddGoal} disabled={!goalName.trim()} className="btn btn-primary w-full">创建目标</button>
        </div>
      )}

      {!active ? (
        <div className="card p-10 text-center">
          <Target size={48} strokeWidth={1} className="text-violet-400 mx-auto mb-4" />
          <p className="text-muted text-sm">创建一个积攒目标开始吧</p>
        </div>
      ) : (
        <>
          {/* Jar display */}
          <div className="card p-6 flex flex-col items-center">
            <StarJar stars={active.stars} target={active.target} />
          </div>

          {/* Pending ideas */}
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center gap-2"><Lightbulb size={18} strokeWidth={1.8} className="text-violet-500" />待考验的想法 {pendingCount > 0 && <span className="text-xs text-amber-500 font-medium">{pendingCount}</span>}</span>
              <button onClick={() => setShowNewIdea(!showNewIdea)} className="btn-icon"><Plus size={14} /></button>
            </div>

            {showNewIdea && (
              <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <input type="text" value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)} placeholder="想买什么？如：一双球鞋" className="input" autoFocus />
                <input type="number" value={ideaAmount} onChange={e => setIdeaAmount(e.target.value)} placeholder="价格（可选）" className="input" />
                <button onClick={handleAddIdea} disabled={!ideaDesc.trim()} className="btn btn-primary w-full">记录这个想法</button>
              </div>
            )}

            <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
              {activeIdeas.length === 0 && !showNewIdea && (
                <div className="px-5 py-8 text-center text-sm text-muted">还没有记录任何想法</div>
              )}
              {activeIdeas.map(idea => (
                <div key={idea.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${idea.status === 'resisted' ? 'opacity-60' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${idea.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    {idea.status === 'pending' ? '💭' : '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${idea.status === 'resisted' ? 'line-through' : ''}`}>{idea.description}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {idea.amount > 0 && <>{formatAmount(idea.amount)} · </>}
                      {idea.status === 'pending' ? '待考验' : `已克制 · ${new Date(idea.createdAt).toLocaleDateString('zh-CN')}`}
                    </p>
                  </div>
                  {idea.status === 'pending' ? (
                    <button onClick={() => handleResist(idea.id)} className="btn btn-sm btn-primary flex items-center gap-1">
                      <Check size={14} />克制
                    </button>
                  ) : (
                    <button onClick={() => handleDeleteIdea(idea.id)} className="btn-icon btn-icon-danger"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Goal actions */}
          <div className="text-center">
            <button onClick={() => handleDeleteGoal(active.id)} className="text-xs text-red-400 hover:text-red-600">删除这个目标</button>
          </div>
        </>
      )}
    </div>
  )
}
