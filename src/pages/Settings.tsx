import { useState, useRef, useEffect } from 'react'
import { useSettings, useCategories, useTransactions } from '@/db/hooks'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { exportAllData, importAllData, exportCSV, downloadFile } from '@/services/export'
import type { Category } from '@/types'

const NEW_CAT_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#f97316', '#ec4899', '#06b6d4']
const NEW_CAT_ICONS = ['🍽️', '🚗', '🛍️', '🎮', '🏠', '💊', '📚', '📱', '🧴', '📦', '💼', '📈', '🧧', '📋', '🎁', '💡', '✈️', '🐱']

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { transactions } = useTransactions()

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1')
  const [model, setModel] = useState('deepseek-chat')
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.apiBaseUrl || 'https://api.deepseek.com/v1')
      setModel(settings.model || 'deepseek-chat')
    }
  }, [settings])

  // Category management
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense')
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState('')

  const handleSaveApiKey = async () => {
    if (!updateSettings) return
    const encrypted = apiKey ? await encryptApiKey(apiKey) : settings?.apiKey || ''
    await updateSettings({
      apiKey: encrypted,
      apiBaseUrl: baseUrl,
      model,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setApiKey('')
  }

  const handleTestConnection = async () => {
    setTestResult('测试中...')
    try {
      const key = apiKey || (settings?.apiKey ? await decryptApiKey(settings.apiKey) : '')
      if (!key) {
        setTestResult('请先填入 API Key')
        return
      }
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (response.ok) {
        setTestResult('连接成功')
      } else {
        setTestResult(`连接失败 (${response.status})`)
      }
    } catch {
      setTestResult('网络错误，请检查 Base URL')
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await addCategory({
      name: newCatName.trim(),
      type: newCatType,
      icon: newCatIcon,
      color: newCatColor,
      isSystem: false,
    })
    setNewCatName('')
  }

  const handleExportJSON = async () => {
    const data = await exportAllData()
    downloadFile(data, `auto-money-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  }

  const handleExportCSV = async () => {
    const csv = exportCSV(transactions, categories)
    downloadFile(csv, `auto-money-transactions-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await importAllData(text)
      setImportMessage('导入成功')
      setTimeout(() => setImportMessage(''), 2000)
    } catch {
      setImportMessage('导入失败，请检查文件格式')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* API Config */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-sm mb-4">API 配置</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.apiKey ? '已配置（输入新 Key 将覆盖）' : 'sk-...'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {testResult && (
            <p className={`text-xs ${testResult.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
              {testResult}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              测试连接
            </button>
            <button
              onClick={handleSaveApiKey}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <h3 className="font-semibold text-sm px-5 py-3 border-b border-gray-100 dark:border-gray-800">分类管理</h3>

        {/* Add new category */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setNewCatType('expense')}
              className={`flex-1 py-1 rounded text-xs font-medium ${
                newCatType === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >支出</button>
            <button
              onClick={() => setNewCatType('income')}
              className={`flex-1 py-1 rounded text-xs font-medium ${
                newCatType === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >收入</button>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 items-center">
              {NEW_CAT_ICONS.slice(0, 6).map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewCatIcon(icon)}
                  className={`p-1 rounded text-sm ${newCatIcon === icon ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                >{icon}</button>
              ))}
            </div>
            <div className="flex gap-1 items-center">
              {NEW_CAT_COLORS.slice(0, 6).map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCatColor(color)}
                  className={`w-5 h-5 rounded-full border-2 ${newCatColor === color ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="分类名称"
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {[...expenseCats, ...incomeCats].map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-5 py-2.5">
              <span>{cat.icon}</span>
              <span className="flex-1 text-sm">{cat.name}</span>
              <span className="text-xs text-gray-400">{cat.type === 'expense' ? '支出' : '收入'}</span>
              {!cat.isSystem && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              )}
              {cat.isSystem && (
                <span className="text-xs text-gray-300 dark:text-gray-600">系统</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-sm mb-3">数据管理</h3>
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            导出全部数据 (JSON)
          </button>
          <button
            onClick={handleExportCSV}
            className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            导出交易记录 (CSV)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            导入数据 (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          {importMessage && (
            <p className={`text-xs text-center ${importMessage.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
              {importMessage}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">
        Auto Money v1.0 · 数据全部存储在浏览器本地
      </p>
    </div>
  )
}
