import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { parseTransaction } from '@/services/llm'
import { startRecognition, isSpeechSupported, stopRecognition } from '@/services/speech'
import type { ParsedTransaction } from '@/types'

type Step = 'input' | 'parsed' | 'manual'

export default function AddTransaction() {
  const navigate = useNavigate()
  const { addTransaction } = useTransactions()
  const { categories } = useCategories()

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

  const reset = () => {
    setTextInput(''); setParsed(null); setError(''); setStep('input'); setMode('text')
    setManualAmount(''); setManualCategoryId(''); setManualDesc('')
    setManualDate(new Date().toISOString().slice(0, 10)); setManualType('expense')
    setVoiceText(''); setVoiceListening(false); setLoading(false)
  }

  const handleParse = async () => {
    if (!textInput.trim()) return
    setLoading(true); setError('')
    try { const r = await parseTransaction(textInput.trim()); setParsed(r); setStep('parsed') }
    catch (err: any) { setError(err.message || '解析失败') }
    finally { setLoading(false) }
  }

  const handleVoiceStart = () => {
    if (!isSpeechSupported()) { setError('请使用 Chrome 或 Edge 浏览器'); return }
    setVoiceListening(true); setVoiceText(''); setError('')
    startRecognition(
      text => setVoiceText(text),
      errMsg => { setVoiceListening(false); setError(errMsg) },
      () => setVoiceListening(false)
    )
  }

  const handleVoiceStop = () => {
    stopRecognition(); setVoiceListening(false)
    if (voiceText.trim()) {
      setTextInput(voiceText.trim()); setLoading(true)
      parseTransaction(voiceText.trim()).then(r => { setParsed(r); setStep('parsed') }).catch(e => setError(e.message || '失败')).finally(() => setLoading(false))
    }
  }

  const handleConfirmParsed = () => {
    if (!parsed) return
    const cat = categories.find(c => c.name === parsed.category && c.type === parsed.type)
    const filtered = categories.filter(c => c.type === parsed.type)
    setManualType(parsed.type); setManualAmount(String(parsed.amount))
    setManualCategoryId(cat?.id || filtered[0]?.id || ''); setManualDate(parsed.date)
    setManualDesc(parsed.description); setStep('manual')
  }

  const handleSave = async () => {
    const amount = parseFloat(manualAmount)
    if (!amount || amount <= 0) { setError('请输入有效金额'); return }
    if (!manualCategoryId) { setError('请选择分类'); return }
    try { await addTransaction({ type: manualType, amount, categoryId: manualCategoryId, description: manualDesc, date: manualDate }); navigate('/transactions') }
    catch (err: any) { setError(err.message || '保存失败') }
  }

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const currentCats = manualType === 'expense' ? expenseCats : incomeCats

  return (
    <div className="max-w-lg mx-auto slide-up">
      <div className="glass rounded-3xl p-6 shadow-sm border border-white/50 dark:border-gray-800/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span>✍️</span>
            {step === 'input' ? '记一笔' : step === 'parsed' ? 'AI 解析' : '确认记录'}
          </h2>
          {step !== 'input' && (
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-xs underline">关闭</button>
          </div>
        )}

        {/* Step: Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <button onClick={() => setMode('text')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>📝 文字</button>
              <button onClick={() => setMode('voice')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'voice' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>🎤 语音</button>
            </div>

            {mode === 'text' ? (
              <>
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder="💬 比如：中午吃面花了15块..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 backdrop-blur"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse() } }} />
                <div className="flex gap-2">
                  <button onClick={() => { setStep('manual'); setParsed(null) }}
                    className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">手动填写</button>
                  <button onClick={handleParse} disabled={loading || !textInput.trim()}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium disabled:opacity-50 hover:from-blue-600 hover:to-indigo-600 transition-all">
                    {loading ? '🤖 解析中...' : '✨ AI 解析'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {voiceText ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-sm font-medium text-center">{voiceText}</div>
                ) : (
                  <div className="text-center py-10">
                    {voiceListening ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-1.5 bg-gradient-to-t from-blue-400 to-indigo-500 rounded-full animate-pulse"
                              style={{ height: `${14 + i * 8}px`, animationDelay: `${i * 0.12}s`, animationDuration: '0.8s' }} />
                          ))}
                        </div>
                        <p className="text-blue-500 font-medium animate-pulse">🎤 正在聆听...</p>
                        <p className="text-xs text-gray-400">说完后点击停止，AI 会自动解析</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-5xl">🎤</p>
                        <p className="text-gray-400 text-sm">点击下方按钮开始语音输入</p>
                        <p className="text-xs text-gray-300">Chrome / Edge 浏览器效果最佳</p>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={voiceListening ? handleVoiceStop : handleVoiceStart}
                  className={`w-full py-3.5 rounded-2xl text-sm font-medium text-white transition-all ${voiceListening ? 'bg-red-400 hover:bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'}`}>
                  {voiceListening ? '⏹ 停止录音' : '🎤 开始说话'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Parsed */}
        {step === 'parsed' && parsed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">AI 分析结果</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium">
                ✨ {(parsed.confidence * 100).toFixed(0)}% 置信度
              </span>
            </div>
            <div className="space-y-2 bg-gradient-to-br from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-4">
              {[
                { label: '📌 类型', value: parsed.type === 'expense' ? '支出' : '收入' },
                { label: '💵 金额', value: `¥${parsed.amount}` },
                { label: '🏷️ 分类', value: parsed.category },
                { label: '📅 日期', value: parsed.date },
                { label: '📝 描述', value: parsed.description },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setStep('input'); setParsed(null); setTextInput('') }}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">🔄 重新输入</button>
              <button onClick={handleConfirmParsed}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium">✅ 确认并编辑</button>
            </div>
          </div>
        )}

        {/* Step: Manual */}
        {step === 'manual' && (
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <button onClick={() => setManualType('expense')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${manualType === 'expense' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500' : 'text-gray-500'}`}>🔴 支出</button>
              <button onClick={() => setManualType('income')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${manualType === 'income' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-500' : 'text-gray-500'}`}>🟢 收入</button>
            </div>

            <input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)}
              placeholder="0.00" step="0.01"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-300" />

            <p className="text-xs text-gray-400 -mt-2 text-center">选择分类</p>
            <div className="grid grid-cols-5 gap-2">
              {currentCats.map(cat => (
                <button key={cat.id} onClick={() => setManualCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${
                    manualCategoryId === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400 scale-105' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}>
                  <span className="text-xl">{cat.icon}</span><span className="text-[10px]">{cat.name}</span>
                </button>
              ))}
            </div>

            <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)}
              placeholder="💬 备注（可选）"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

            <div className="flex gap-2 pt-1">
              <button onClick={() => { if (parsed) { setStep('parsed') } else { setStep('input') } }}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">返回</button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-all">💾 保存</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
