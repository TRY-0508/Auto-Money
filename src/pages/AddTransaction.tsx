import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { parseTransaction } from '@/services/llm'
import { startRecognition, isSpeechSupported, stopRecognition } from '@/services/speech'
import type { ParsedTransaction } from '@/types'

type InputMode = 'text' | 'voice'

export default function AddTransaction() {
  const navigate = useNavigate()
  const { addTransaction } = useTransactions()
  const { categories } = useCategories()

  const [mode, setMode] = useState<InputMode>('text')
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [error, setError] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)

  // Manual form state
  const [manualType, setManualType] = useState<'expense' | 'income'>('expense')
  const [manualAmount, setManualAmount] = useState('')
  const [manualCategoryId, setManualCategoryId] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualDesc, setManualDesc] = useState('')

  const [manualMode, setManualMode] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')
  const currentCats = manualType === 'expense' ? expenseCats : incomeCats

  const handleParse = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await parseTransaction(textInput.trim())
      setParsed(result)
    } catch (err: any) {
      setError(err.message || '解析失败')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceStart = async () => {
    if (!isSpeechSupported()) {
      setError('浏览器不支持语音识别，请使用 Chrome 或 Edge')
      return
    }
    setVoiceListening(true)
    setVoiceText('')
    setError('')
    try {
      const text = await startRecognition('zh-CN')
      setVoiceText(text)
      setVoiceListening(false)

      // Auto-parse after voice
      setTextInput(text)
      setLoading(true)
      try {
        const result = await parseTransaction(text)
        setParsed(result)
      } catch (err: any) {
        setError(err.message || '解析失败')
      } finally {
        setLoading(false)
      }
    } catch (err: any) {
      setVoiceListening(false)
      setError(err.message || '语音识别失败')
    }
  }

  const handleVoiceStop = () => {
    stopRecognition()
    setVoiceListening(false)
  }

  const handleConfirmParsed = () => {
    if (!parsed) return
    const cat = categories.find(
      (c) => c.name === parsed.category && c.type === parsed.type
    )
    const defaultCat = currentCats[0]

    setManualType(parsed.type)
    setManualAmount(String(parsed.amount))
    setManualCategoryId(cat?.id || defaultCat?.id || '')
    setManualDate(parsed.date)
    setManualDesc(parsed.description)
    setManualMode(true)
  }

  const handleEditParsedField = (field: string) => {
    setEditingField(field)
  }

  const handleUpdateParsedField = (field: string, value: string | number) => {
    if (!parsed) return
    setParsed({ ...parsed, [field]: value })
    setEditingField(null)
  }

  const handleSave = async () => {
    const amount = parseFloat(manualAmount)
    if (!amount || amount <= 0) {
      setError('请输入有效金额')
      return
    }
    if (!manualCategoryId) {
      setError('请选择分类')
      return
    }

    try {
      await addTransaction({
        type: manualType,
        amount,
        categoryId: manualCategoryId,
        description: manualDesc,
        date: manualDate,
        aiParsed: !manualMode,
      })
      navigate('/transactions')
    } catch (err: any) {
      setError(err.message || '保存失败')
    }
  }

  const resetForm = () => {
    setTextInput('')
    setParsed(null)
    setManualMode(false)
    setError('')
    setManualAmount('')
    setManualCategoryId('')
    setManualDesc('')
    setManualDate(new Date().toISOString().slice(0, 10))
    setManualType('expense')
    setVoiceText('')
  }

  // Parsed result card
  if (parsed && !manualMode) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">AI 解析结果</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {(parsed.confidence * 100).toFixed(0)}% 置信度
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500">类型</span>
              <span className={`text-sm font-medium ${parsed.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                {parsed.type === 'expense' ? '支出' : '收入'}
              </span>
            </div>

            {editingField === 'amount' ? (
              <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800">
                <input
                  type="number"
                  value={parsed.amount}
                  onChange={(e) => handleUpdateParsedField('amount', parseFloat(e.target.value))}
                  className="flex-1 px-2 py-1 rounded border text-sm"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1"
                onClick={() => handleEditParsedField('amount')}
              >
                <span className="text-sm text-gray-500">金额</span>
                <span className="text-sm font-semibold">¥{parsed.amount}</span>
              </div>
            )}

            <div
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1"
              onClick={() => handleEditParsedField('category')}
            >
              <span className="text-sm text-gray-500">分类</span>
              {editingField === 'category' ? (
                <select
                  value={parsed.category}
                  onChange={(e) => handleUpdateParsedField('category', e.target.value)}
                  className="text-sm rounded border px-1 py-0.5"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                >
                  {categories.filter((c) => c.type === parsed.type).map((c) => (
                    <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium">{parsed.category}</span>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500">日期</span>
              <span className="text-sm">{parsed.date}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">描述</span>
              <span className="text-sm text-right max-w-[200px] truncate">{parsed.description}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={resetForm}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              重新输入
            </button>
            <button
              onClick={handleConfirmParsed}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              确认并编辑
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Manual form mode
  if (manualMode) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold mb-4">{parsed ? '确认记录' : '手动记录'}</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setManualType('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  manualType === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => setManualType('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  manualType === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                收入
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">金额 (元)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">分类</label>
              <div className="grid grid-cols-4 gap-2">
                {currentCats.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setManualCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                      manualCategoryId === cat.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">日期</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">描述 (可选)</label>
              <input
                type="text"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="备注"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setManualMode(false)
                  setParsed(null)
                }}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                返回
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main input mode
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">添加记录</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('text'); setManualMode(false); setParsed(null); setError('') }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                mode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              文字
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                mode === 'voice'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              语音
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">关闭</button>
          </div>
        )}

        {mode === 'text' ? (
          <div className="space-y-4">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="比如：中午吃面花了15块"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleParse()
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setManualMode(true); setParsed(null) }}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                手动输入
              </button>
              <button
                onClick={handleParse}
                disabled={loading || !textInput.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '解析中...' : 'AI 解析'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {voiceText ? (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                {voiceText}
              </div>
            ) : (
              <div className="text-center py-8">
                {voiceListening ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-blue-500 rounded-full animate-pulse"
                          style={{
                            height: `${16 + Math.random() * 24}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">正在聆听...</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">点击下方按钮开始语音输入</p>
                )}
              </div>
            )}
            <button
              onClick={voiceListening ? handleVoiceStop : handleVoiceStart}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                voiceListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {voiceListening ? '停止录音' : '开始说话'}
            </button>
          </div>
        )}

        <button
          onClick={() => { setManualMode(true); setParsed(null) }}
          className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          或者手动填写表单
        </button>
      </div>
    </div>
  )
}
