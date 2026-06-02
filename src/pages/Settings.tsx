import { useState, useRef, useEffect } from 'react'
import { useSettings, useCategories, useTransactions } from '@/db/hooks'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { exportAllData, importAllData, exportCSV, downloadFile } from '@/services/export'

const ALL_ICONS = ['🍽️', '🚗', '🛍️', '🎮', '🏠', '💊', '📚', '📱', '🧴', '📦', '💰', '💼', '📈', '🧧', '📋', '🎁', '💡', '✈️', '🐱', '🐶', '☕', '🎬', '🏋️', '🎵', '🌍', '🔧', '👕', '💄', '🍺', '🏥']

const ALL_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#84cc16', '#f59e0b', '#78716c']

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { transactions } = useTransactions()

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1')
  const [model, setModel] = useState('deepseek-chat')
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState('')

  // New category form
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense')
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')

  // Edit category
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatIcon, setEditCatIcon] = useState('')
  const [editCatColor, setEditCatColor] = useState('')

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState('')

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.apiBaseUrl || 'https://api.deepseek.com/v1')
      setModel(settings.model || 'deepseek-chat')
    }
  }, [settings])

  const handleSaveApiKey = async () => {
    if (!updateSettings) return
    const encrypted = apiKey ? await encryptApiKey(apiKey) : settings?.apiKey || ''
    await updateSettings({ apiKey: encrypted, apiBaseUrl: baseUrl, model })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setApiKey('')
  }

  const handleTestConnection = async () => {
    setTestResult('测试中...')
    try {
      const key = apiKey || (settings?.apiKey ? await decryptApiKey(settings.apiKey) : '')
      if (!key) { setTestResult('请先填入 API Key'); return }
      const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${key}` } })
      setTestResult(response.ok ? '连接成功' : `失败 (${response.status})`)
    } catch { setTestResult('网络错误') }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await addCategory({ name: newCatName.trim(), type: newCatType, icon: newCatIcon, color: newCatColor, isSystem: false })
    setNewCatName('')
    setShowAddCat(false)
  }

  const handleStartEditCat = (cat: any) => {
    setEditingCatId(cat.id)
    setEditCatName(cat.name)
    setEditCatIcon(cat.icon)
    setEditCatColor(cat.color)
  }

  const handleSaveEditCat = async (id: string) => {
    await updateCategory(id, { name: editCatName, icon: editCatIcon, color: editCatColor })
    setEditingCatId(null)
  }

  const handleExportJSON = async () => {
    const data = await exportAllData()
    downloadFile(data, `auto-money-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  }

  const handleExportCSV = async () => {
    const csv = exportCSV(transactions, categories)
    downloadFile(csv, `auto-money-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importAllData(await file.text())
      setImportMessage('导入成功')
      setTimeout(() => setImportMessage(''), 2000)
    } catch { setImportMessage('导入失败') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  return (
    <div className="max-w-lg mx-auto space-y-4 slide-up">
      {/* API Config */}
      <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-1.5"><span>🤖</span> API 配置</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.apiKey ? '已配置（输入新 Key 覆盖）' : 'sk-...'}
              className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Base URL</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">模型</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {testResult && <p className={`text-xs ${testResult.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{testResult}</p>}
          <div className="flex gap-2">
            <button onClick={handleTestConnection}
              className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">测试连接</button>
            <button onClick={handleSaveApiKey}
              className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium hover:from-blue-600 hover:to-indigo-600">{saved ? '✅ 已保存' : '保存设置'}</button>
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><span>🏷️</span> 收支分类</h3>
          <button onClick={() => { setShowAddCat(!showAddCat); setEditingCatId(null) }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {showAddCat ? '取消' : '+ 新建分类'}
          </button>
        </div>

        {/* Add category form */}
        {showAddCat && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-2">
              <button onClick={() => setNewCatType('expense')}
                className={`flex-1 py-1.5 rounded text-xs font-medium ${newCatType === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>支出</button>
              <button onClick={() => setNewCatType('income')}
                className={`flex-1 py-1.5 rounded text-xs font-medium ${newCatType === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>收入</button>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">图标</label>
              <div className="flex flex-wrap gap-1">
                {ALL_ICONS.map((icon) => (
                  <button key={icon} onClick={() => setNewCatIcon(icon)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm ${newCatIcon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">颜色</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COLORS.map((color) => (
                  <button key={color} onClick={() => setNewCatColor(color)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: color, borderColor: newCatColor === color ? '#1f2937' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                placeholder="分类名称，如：宠物、咖啡"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
              <button onClick={handleAddCategory} disabled={!newCatName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-blue-700">添加</button>
            </div>
          </div>
        )}

        {/* Expense categories */}
        <div className="px-5 py-2">
          <p className="text-xs text-gray-400 font-medium py-1">支出分类</p>
          {expenseCats.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} editingId={editingCatId} editName={editCatName} editIcon={editCatIcon}
              editColor={editCatColor} setEditingId={setEditingCatId} setEditName={setEditCatName}
              setEditIcon={setEditCatIcon} setEditColor={setEditCatColor} onStartEdit={handleStartEditCat}
              onSave={handleSaveEditCat} onDelete={deleteCategory} allIcons={ALL_ICONS} allColors={ALL_COLORS} />
          ))}
        </div>

        {/* Income categories */}
        <div className="px-5 py-2 border-t border-gray-50 dark:border-gray-800/50">
          <p className="text-xs text-gray-400 font-medium py-1">收入分类</p>
          {incomeCats.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} editingId={editingCatId} editName={editCatName} editIcon={editCatIcon}
              editColor={editCatColor} setEditingId={setEditingCatId} setEditName={setEditCatName}
              setEditIcon={setEditCatIcon} setEditColor={setEditCatColor} onStartEdit={handleStartEditCat}
              onSave={handleSaveEditCat} onDelete={deleteCategory} allIcons={ALL_ICONS} allColors={ALL_COLORS} />
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><span>💾</span> 数据管理</h3>
        <div className="space-y-2">
          <button onClick={handleExportJSON}
            className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">📦 导出全部数据 (JSON)</button>
          <button onClick={handleExportCSV}
            className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">📊 导出交易记录 (CSV)</button>
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">📥 导入数据 (JSON)</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          {importMessage && <p className={`text-xs text-center ${importMessage.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{importMessage}</p>}
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">Auto Money v1.0 · 数据存储在浏览器本地</p>
    </div>
  )
}

function CategoryRow({ cat, editingId, editName, editIcon, editColor, setEditingId, setEditName, setEditIcon, setEditColor, onStartEdit, onSave, onDelete, allIcons, allColors }: any) {
  const isEditing = editingId === cat.id

  if (isEditing) {
    return (
      <div className="py-2 space-y-2">
        <div className="flex gap-2 items-center">
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
            className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" autoFocus />
          <button onClick={() => onSave(cat.id)} className="text-xs text-blue-600 font-medium">保存</button>
          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">取消</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {allIcons.map((icon: string) => (
            <button key={icon} onClick={() => setEditIcon(icon)}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs ${editIcon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-400' : ''}`}>{icon}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allColors.map((color: string) => (
            <button key={color} onClick={() => setEditColor(color)}
              className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: color, borderColor: editColor === color ? '#1f2937' : 'transparent' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</div>
      <span className="flex-1 text-sm">{cat.name}</span>
      {!cat.isSystem && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onStartEdit(cat)} className="text-xs text-blue-500 hover:underline">编辑</button>
          <button onClick={() => onDelete(cat.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">删除</button>
        </div>
      )}
      {cat.isSystem && <span className="text-xs text-gray-300 dark:text-gray-600">预设</span>}
    </div>
  )
}
