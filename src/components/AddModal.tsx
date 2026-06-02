import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { parseTransaction } from '@/services/llm'
import { startRecognition, isSpeechSupported, stopRecognition } from '@/services/speech'
import type { ParsedTransaction } from '@/types'

interface AddModalProps {
  open: boolean
  onClose: () => void
}

type Step = 'input' | 'parsed' | 'manual'

export default function AddModal({ open, onClose }: AddModalProps) {
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

  const resetAll = () => {
    setTextInput(''); setParsed(null); setError(''); setStep('input')
    setManualAmount(''); setManualCategoryId(''); setManualDesc('')
    setManualDate(new Date().toISOString().slice(0, 10)); setManualType('expense')
    setVoiceText(''); setVoiceListening(false); setLoading(false); setMode('text')
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const handleParse = async () => {
    if (!textInput.trim()) return
    setLoading(true); setError('')
    try {
      const result = await parseTransaction(textInput.trim())
      setParsed(result); setStep('parsed')
    } catch (err: any) {
      setError(err.message || '解析失败')
    } finally { setLoading(false) }
  }

  const handleVoiceStart = () => {
    if (!isSpeechSupported()) { setError('请使用 Chrome 或 Edge'); return }
    setVoiceListening(true); setVoiceText(''); setError('')
    startRecognition(
      (text) => setVoiceText(text),
      (errMsg) => { setVoiceListening(false); setError(errMsg) },
      () => setVoiceListening(false)
    )
  }

  const handleVoiceStop = () => {
    stopRecognition(); setVoiceListening(false)
    if (voiceText.trim()) {
      setTextInput(voiceText.trim()); setLoading(true)
      parseTransaction(voiceText.trim())
        .then(r => { setParsed(r); setStep('parsed') })
        .catch(e => setError(e.message || '失败'))
        .finally(() => setLoading(false))
    }
  }

  const handleConfirmParsed = () => {
    if (!parsed) return
    const cat = categories.find(c => c.name === parsed.category && c.type === parsed.type)
    const filteredCats = categories.filter(c => c.type === parsed.type)
    setManualType(parsed.type); setManualAmount(String(parsed.amount))
    setManualCategoryId(cat?.id || filteredCats[0]?.id || '')
    setManualDate(parsed.date); setManualDesc(parsed.description); setStep('manual')
  }

  const handleSave = async () => {
    const amount = parseFloat(manualAmount)
    if (!amount || amount <= 0) { setError('请输入有效金额'); return }
    if (!manualCategoryId) { setError('请选择分类'); return }
    try {
      await addTransaction({ type: manualType, amount, categoryId: manualCategoryId, description: manualDesc, date: manualDate })
      handleClose()
    } catch (err: any) { setError(err.message || '保存失败') }
  }

  if (!open) return null

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const currentCats = manualType === 'expense' ? expenseCats : incomeCats

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold">
            {step === 'input' && '记一笔'}
            {step === 'parsed' && '确认结果'}
            {step === 'manual' && (parsed ? '确认记录' : '手动记录')}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error} <button onClick={() => setError('')} className="ml-2 underline">关闭</button>
            </div>
          )}

          {/* STEP: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setMode('text')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>文字</button>
                <button onClick={() => setMode('voice')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${mode === 'voice' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>语音</button>
              </div>

              {mode === 'text' ? (
                <>
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                    placeholder="中午吃面花了15块"
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse() } }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setStep('manual'); setParsed(null) }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">手动填写</button>
                    <button onClick={handleParse} disabled={loading || !textInput.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
                      {loading ? '解析中...' : 'AI 解析'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {voiceText ? (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">{voiceText}</div>
                  ) : (
                    <div className="text-center py-8">
                      {voiceListening ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                                style={{ height: `${12 + i * 6}px`, animationDelay: `${i * 0.12}s`, animationDuration: '0.8s' }} />
                            ))}
                          </div>
                          <p className="text-sm text-blue-500 font-medium">正在聆听...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-4xl">🎤</p>
                          <p className="text-gray-400 text-sm">点击开始语音输入</p>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={voiceListening ? handleVoiceStop : handleVoiceStart}
                    className={`w-full py-3 rounded-xl text-sm font-medium ${voiceListening ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                    {voiceListening ? '停止录音' : '开始说话'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP: Parsed */}
          {step === 'parsed' && parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">AI 解析结果</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {(parsed.confidence * 100).toFixed(0)}% 置信度
                </span>
              </div>
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <Row label="类型" value={parsed.type === 'expense' ? '🔴 支出' : '🟢 收入'} />
                <Row label="金额" value={`¥${parsed.amount}`} />
                <Row label="分类" value={parsed.category} />
                <Row label="日期" value={parsed.date} />
                <Row label="描述" value={parsed.description} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setStep('input'); setParsed(null) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">重新输入</button>
                <button onClick={handleConfirmParsed}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium">确认并编辑</button>
              </div>
            </div>
          )}

          {/* STEP: Manual */}
          {step === 'manual' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setManualType('expense')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${manualType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>支出</button>
                <button onClick={() => setManualType('income')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${manualType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>收入</button>
              </div>

              <div>
                <input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                  placeholder="0.00" step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {currentCats.map(cat => (
                  <button key={cat.id} onClick={() => setManualCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
                      manualCategoryId === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}>
                    <span className="text-lg">{cat.icon}</span><span>{cat.name}</span>
                  </button>
                ))}
              </div>

              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

              <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                placeholder="备注（可选）"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

              <div className="flex gap-2 pt-2">
                <button onClick={() => { if (parsed) { setStep('parsed') } else { setStep('input') } }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">返回</button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium">保存</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
