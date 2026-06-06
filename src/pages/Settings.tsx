import { useState, useRef, useEffect } from 'react'
import { useSettings, useCategories, useTransactions, useProjects, useBudgets } from '@/db/hooks'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { exportAllData, importAllData, exportCSV, downloadFile } from '@/services/export'
import { db } from '@/db'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'

const ALL_ICONS = ['🍽️', '🚗', '🛍️', '🎮', '🏠', '💊', '📚', '📱', '🧴', '📦', '💰', '💼', '📈', '🧧', '📋', '🎁', '💡', '✈️', '🐱', '🐶', '☕', '🎬', '🏋️', '🎵', '🌍', '🔧', '👕', '💄', '🍺', '🏥']

const ALL_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#84cc16', '#f59e0b', '#78716c']

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { transactions } = useTransactions()
  const { projects, addProject, updateProject, deleteProject } = useProjects()
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets()

  const yearMonth = getCurrentYearMonth()
  const stats = getMonthlyStats(transactions, yearMonth)
  const breakdown = getCategoryBreakdown(transactions, categories, 'expense', yearMonth)

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

  // Project form
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIcon, setNewProjectIcon] = useState('📋')
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6')

  // Budget form
  const [budgetEditingId, setBudgetEditingId] = useState<string | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')

  // Clear data
  const [showClearConfirm, setShowClearConfirm] = useState(false)

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

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return
    await addProject({ name: newProjectName.trim(), icon: newProjectIcon, color: newProjectColor })
    setNewProjectName(''); setShowAddProject(false)
  }

  const handleSaveBudget = async (categoryId: string | null) => {
    const a = parseFloat(budgetAmount); if (!a || a <= 0) return
    const exist = budgets.find(b => b.categoryId === categoryId && b.yearMonth === yearMonth)
    if (exist) await updateBudget(exist.id, { amount: a })
    else await addBudget({ categoryId, amount: a, period: 'monthly', yearMonth })
    setBudgetEditingId(null); setBudgetAmount('')
  }

  const handleClearAllData = async () => {
    await db.transactions.clear()
    await db.chatMessages.clear()
    await db.budgets.clear()
    await db.projects.clear()
    setShowClearConfirm(false)
    window.location.reload()
  }

  const getSpent = (catId: string | null) => catId === null ? stats.totalExpense : (breakdown.find(b => b.categoryId === catId)?.amount || 0)
  const totalBudget = budgets.filter(b => b.categoryId === null && b.yearMonth === yearMonth).reduce((s, b) => s + b.amount, 0)

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

      {/* Project Management */}
      <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><span>📁</span> 分账单</h3>
          <button onClick={() => setShowAddProject(!showAddProject)}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium">
            {showAddProject ? '取消' : '+ 新建'}
          </button>
        </div>

        {showAddProject && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-1">
              {ALL_ICONS.map(icon => (
                <button key={icon} onClick={() => setNewProjectIcon(icon)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${newProjectIcon === icon ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-400' : 'hover:bg-white dark:hover:bg-gray-700'}`}>{icon}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {ALL_COLORS.map(color => (
                <button key={color} onClick={() => setNewProjectColor(color)}
                  className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: color, borderColor: newProjectColor === color ? '#374151' : 'transparent' }} />
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                placeholder="分账单名称，如：春节旅游、游戏开支"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleAddProject()} />
              <button onClick={handleAddProject} disabled={!newProjectName.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium disabled:opacity-50">创建</button>
            </div>
          </div>
        )}

        {projects.length === 0 && !showAddProject ? (
          <div className="px-5 py-4 text-center text-sm text-gray-400">
            暂无分账单，点击「+ 新建」创建第一个
          </div>
        ) : (
          projects.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 dark:border-gray-800/30 last:border-0 group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: p.color + '20' }}>{p.icon}</div>
              <span className="flex-1 text-sm">{p.name}</span>
              <button onClick={() => deleteProject(p.id)}
                className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">删除</button>
            </div>
          ))
        )}
      </div>

      {/* Budget Management */}
      <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
        <h3 className="font-semibold text-sm px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5"><span>🎯</span> 月度预算</h3>
        <p className="text-[11px] text-gray-400 px-5 py-2 border-b border-gray-50 dark:border-gray-800/30">设定预算帮助觉察消费模式，观察预算压力与心情变化的关联</p>
        {/* Category Budgets */}
        {expenseCats.map(cat => {
          const budget = budgets.find(b => b.categoryId === cat.id && b.yearMonth === yearMonth)
          const spent = getSpent(cat.id)
          return (
            <div key={cat.id} className="px-5 py-2.5 border-b border-gray-50 dark:border-gray-800/30 last:border-0">
              {budgetEditingId === cat.id ? (
                <div className="flex items-center gap-2"><span>{cat.icon}</span><span className="text-sm flex-1">{cat.name}</span><input type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="金额" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveBudget(cat.id)} className="w-24 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /><button onClick={() => handleSaveBudget(cat.id)} className="text-xs text-violet-500 font-medium">保存</button><button onClick={() => { setBudgetEditingId(null); setBudgetAmount('') }} className="text-xs text-gray-400">取消</button></div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span>{cat.icon}</span><span className="text-sm font-medium">{cat.name}</span></div><span className="text-xs text-gray-400">已花 {formatAmount(spent)}{budget ? ` / ${formatAmount(budget.amount)}` : ''}</span></div>
                  {budget && <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${spent > budget.amount ? 'bg-red-400' : spent / budget.amount > 0.8 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min((spent / budget.amount) * 100, 100)}%` }} /></div>}
                  <button onClick={() => { setBudgetEditingId(cat.id); setBudgetAmount(budget ? String(budget.amount) : '') }} className="text-xs text-violet-500 hover:text-violet-600 font-medium mt-1">{budget ? '✏️ 修改' : '➕ 设置预算'}</button>
                </div>
              )}
            </div>
          )
        })}
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
          <hr className="border-gray-100 dark:border-gray-800 my-2" />
          <button onClick={() => setShowClearConfirm(true)}
            className="w-full py-2.5 rounded-2xl border border-red-200 dark:border-red-900 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">🗑️ 清除所有数据</button>
        </div>
      </div>

      {/* Clear data confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-center font-semibold text-lg mb-1">⚠️ 确认清除</p>
            <p className="text-center text-sm text-gray-500 mb-5">将删除所有交易记录、对话历史和预算数据。<br/>此操作不可撤销。</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">取消</button>
              <button onClick={handleClearAllData} className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-medium">确认清除</button>
            </div>
          </div>
        </div>
      )}

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
