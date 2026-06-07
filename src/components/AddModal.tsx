import { useState, useMemo } from 'react'
import { useTransactions, useCategories, useProjects } from '@/db/hooks'
import { parseTransaction } from '@/services/llm'
import { startRecognition, isSpeechSupported, stopRecognition } from '@/services/speech'
import { MOOD_LIST, MOOD_COLOR_MAP, CATEGORY_ICON_MAP, CAT_ICON_OPTIONS, MoreHorizontal, AlertTriangle, Check } from '@/lib/icons'
import type { ParsedTransaction } from '@/types'

interface Props { open: boolean; onClose: () => void }

type Step = 'input' | 'parsed' | 'manual'

export default function AddModal({ open, onClose }: Props) {
  const { addTransaction, transactions } = useTransactions()
  const { categories, addCategory } = useCategories()
  const { projects } = useProjects()

  const [mode, setMode] = useState<'text' | 'voice'>('text')
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [voiceText, setVoiceText] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)

  const [manualType, setManualType] = useState<'expense' | 'income'>('expense')
  const [manualAmount, setManualAmount] = useState('')
  const [manualCategoryId, setManualCategoryId] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualDesc, setManualDesc] = useState('')
  const [manualMood, setManualMood] = useState('')
  const [manualProjectId, setManualProjectId] = useState('')

  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('more-horizontal')

  const templates = useMemo(() => {
    const map = new Map<string, { desc: string; catName: string; type: string; count: number }>()
    for (const t of transactions) {
      const cat = categories.find(c => c.id === t.categoryId)
      if (!cat || !t.description) continue
      const key = `${t.description}|${cat.name}|${t.type}`
      const e = map.get(key)
      if (e) e.count++; else map.set(key, { desc: t.description, catName: cat.name, type: t.type, count: 1 })
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [transactions, categories])

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const currentCats = manualType === 'expense' ? expenseCats : incomeCats

  const reset = () => {
    setTextInput(''); setParsed(null); setError(''); setStep('input'); setMode('text')
    setManualAmount(''); setManualCategoryId(''); setManualDesc(''); setManualDate(new Date().toISOString().slice(0, 10))
    setManualType('expense'); setManualMood(''); setManualProjectId('')
    setVoiceText(''); setVoiceListening(false); setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleParse = async () => {
    if (!textInput.trim()) return
    setLoading(true); setError('')
    try { setParsed(await parseTransaction(textInput.trim())); setStep('parsed') }
    catch (err: any) { setError(err.message || '解析失败') }
    finally { setLoading(false) }
  }

  const handleVoiceToggle = () => {
    if (voiceListening) {
      stopRecognition()
      setVoiceListening(false)
    } else {
      if (!isSpeechSupported()) { setError('请使用 Chrome 或 Edge'); return }
      setVoiceListening(true); setVoiceText(''); setError('')
      startRecognition(
        t => setVoiceText(t),
        () => setVoiceListening(false),
        e => { setVoiceListening(false); setError(e) }
      )
    }
  }

  const handleVoiceConfirm = () => {
    if (!voiceText.trim()) return
    setTextInput(voiceText.trim()); setLoading(true)
    parseTransaction(voiceText.trim()).then(r => { setParsed(r); setStep('parsed') }).catch(e => setError(e.message || '失败')).finally(() => setLoading(false))
  }

  const handleConfirmParsed = async () => {
    if (!parsed) return
    let cat = categories.find(c => c.name === parsed.category && c.type === parsed.type)
    if (!cat) {
      const catId = await addCategory({ name: parsed.category, type: parsed.type, icon: 'more-horizontal', color: '#6b7280', isSystem: false })
      setManualCategoryId(catId)
    } else setManualCategoryId(cat.id)
    setManualType(parsed.type); setManualAmount(String(parsed.amount)); setManualDate(parsed.date); setManualDesc(parsed.description)
    if (parsed.mood) setManualMood(parsed.mood)
    setStep('manual')
  }

  const handleQuickAddCat = async () => {
    if (!newCatName.trim()) return
    const catId = await addCategory({ name: newCatName.trim(), type: manualType, icon: newCatIcon, color: '#6b7280', isSystem: false })
    setManualCategoryId(catId); setShowNewCat(false); setNewCatName('')
  }

  const handleSave = async () => {
    const a = parseFloat(manualAmount)
    if (!a || a <= 0) { setError('请输入有效金额'); return }
    if (!manualCategoryId) { setError('请选择分类'); return }
    await addTransaction({ type: manualType, amount: a, categoryId: manualCategoryId, description: manualDesc, date: manualDate, mood: manualMood || undefined, projectId: manualProjectId || undefined })
    handleClose()
  }

  const RenderCatIcon = ({ cat, size = 22 }: { cat: any; size?: number }) => {
    const Icon = CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal
    return <Icon size={size} strokeWidth={1.8} />
  }

  if (!open) return null

  return (
      <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[85vh] md:max-h-[90vh] flex flex-col shadow-xl slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="font-semibold">{step === 'input' ? '记一笔' : step === 'parsed' ? 'AI 解析' : '确认记录'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 pb-24 md:pb-5">
          {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2"><AlertTriangle size={14} />{error}<button onClick={() => setError('')} className="ml-auto text-xs underline">关闭</button></div>}

          {step === 'input' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <button onClick={() => setMode('text')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>文字</button>
                <button onClick={() => setMode('voice')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'voice' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>语音</button>
              </div>

              {mode === 'text' ? (
                <>
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="用自然语言描述这笔收支" rows={3} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse() } }} />
                  <div className="flex gap-2">
                    <button onClick={() => { setStep('manual'); setParsed(null) }} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">手动填写</button>
                    <button onClick={handleParse} disabled={loading || !textInput.trim()} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white text-sm font-medium disabled:opacity-50">AI 解析</button>
                  </div>
                </>
              ) : (
                isSpeechSupported() ? (
                  <div className="space-y-4">
                    {voiceText ? (
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-sm font-medium text-center">{voiceText}</div>
                    ) : (
                      <div className="text-center py-8">
                        {voiceListening ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center gap-1.5">{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 bg-gradient-to-t from-amber-300 to-amber-500 rounded-full animate-pulse" style={{ height: `${14+i*8}px`, animationDelay: `${i*0.12}s`, animationDuration: '0.8s' }} />)}</div>
                            <p className="text-amber-500 font-medium animate-pulse">正在聆听...</p>
                          </div>
                        ) : (
                          <div className="space-y-2"><p className="text-5xl">🎤</p><p className="text-gray-400 text-sm">点击下方按钮开始录音</p></div>
                        )}
                      </div>
                    )}
                    {!voiceText ? (
                      <button type="button" onClick={handleVoiceToggle}
                        className={`w-full py-14 rounded-3xl text-sm font-medium text-white transition-all select-none ${voiceListening ? 'bg-red-400 scale-95' : 'bg-gradient-to-r from-amber-400 to-amber-600 active:scale-95'}`}
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                        {voiceListening ? '点击停止' : '点击开始录音'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setVoiceText(''); setVoiceListening(false) }} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">重新录入</button>
                        <button onClick={handleVoiceConfirm} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white text-sm font-medium">AI 解析</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-4xl">📝</p>
                    <p className="text-sm text-muted">当前浏览器不支持语音识别</p>
                    <p className="text-xs text-muted">请切换到「文字」模式输入，或使用 Chrome 浏览器</p>
                    <button onClick={() => setMode('text')} className="px-6 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-sm font-medium">使用文字输入</button>
                  </div>
                )
              )}

              {templates.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 mb-2">常用记录</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t, i) => (
                      <button key={i} onClick={() => { setTextInput(t.desc); handleParse() }}
                        className="px-3 py-2 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 transition-all">
                        {t.desc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'parsed' && parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-400">AI 分析结果</span><span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium">{Math.round(parsed.confidence * 100)}%</span></div>
              <div className="space-y-2 bg-gradient-to-br from-gray-50 to-amber-50/50 dark:from-gray-800 dark:to-amber-900/20 rounded-2xl p-4">
                {[{ l: '类型', v: parsed.type === 'expense' ? '支出' : '收入' }, { l: '金额', v: `¥${parsed.amount}` }, { l: '分类', v: parsed.category }, { l: '日期', v: parsed.date }, { l: '描述', v: parsed.description }, ...(parsed.mood ? [{ l: '心情', v: parsed.mood }] : [])].map(r => <div key={r.l} className="flex justify-between items-center text-sm"><span className="text-gray-400">{r.l}</span><span className="font-medium">{r.v}</span></div>)}
              </div>
              {!categories.find(c => c.name === parsed.category && c.type === parsed.type) && <div className="p-3 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400">「{parsed.category}」不在现有分类中，确认后将自动创建</div>}
              <div className="flex gap-2">
                <button onClick={() => { setStep('input'); setParsed(null); setTextInput('') }} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">重新输入</button>
                <button onClick={handleConfirmParsed} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white text-sm font-medium">确认并编辑</button>
              </div>
            </div>
          )}

          {step === 'manual' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <button onClick={() => setManualType('expense')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${manualType === 'expense' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500' : 'text-gray-500'}`}>支出</button>
                <button onClick={() => setManualType('income')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${manualType === 'income' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-500' : 'text-gray-500'}`}>收入</button>
              </div>

              <input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-300" />

              <p className="text-xs text-gray-400 -mt-2 text-center">选择分类</p>
              <div className="grid grid-cols-5 gap-2">
                {currentCats.map(cat => {
                  const Icon = CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal
                  return (
                    <button key={cat.id} onClick={() => setManualCategoryId(cat.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${manualCategoryId === cat.id ? 'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-105' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <Icon size={22} strokeWidth={1.8} color={manualCategoryId === cat.id ? '#d97706' : '#6b7280'} />
                      <span className="text-[10px]">{cat.name}</span>
                    </button>
                  )
                })}
                <button onClick={() => setShowNewCat(!showNewCat)} className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border-2 border-dashed text-xs transition-all ${showNewCat ? 'border-amber-400 text-amber-400' : 'border-gray-300 dark:border-gray-600 text-gray-400'}`}>
                  <span className="text-lg">{showNewCat ? '×' : '+'}</span><span className="text-[10px]">新建</span>
                </button>
              </div>

              {showNewCat && (
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 space-y-2">
                  <div className="flex gap-2">
                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="分类名称" autoFocus onKeyDown={e => e.key === 'Enter' && handleQuickAddCat()} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm" />
                    <button onClick={handleQuickAddCat} disabled={!newCatName.trim()} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-50">添加</button>
                  </div>
                  <div className="flex gap-1 flex-wrap max-h-20 overflow-y-auto">
                    {CAT_ICON_OPTIONS.map(({ key, Icon }) => (
                      <button key={key} onClick={() => setNewCatIcon(key)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${newCatIcon === key ? 'bg-amber-100 dark:bg-amber-900/50 ring-1 ring-amber-400' : 'hover:bg-white dark:hover:bg-gray-700'}`}>
                        <Icon size={16} strokeWidth={1.8} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="备注（可选）" className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />

              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">此刻心情</p>
                <div className="grid grid-cols-4 gap-2">
                  {MOOD_LIST.map(m => (
                    <button key={m.value} onClick={() => setManualMood(manualMood === m.value ? '' : m.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${manualMood === m.value ? 'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-105' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      <m.Icon size={24} strokeWidth={1.6} className={manualMood === m.value ? 'text-amber-500' : 'text-gray-500'} />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {projects.length > 0 && (
                <select value={manualProjectId} onChange={e => setManualProjectId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm">
                  <option value="">归属分账单（可选）</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { if (parsed) setStep('parsed'); else setStep('input') }} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">返回</button>
                <button onClick={handleSave} className="btn btn-primary flex-1"><Check size={16}/>保存</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
