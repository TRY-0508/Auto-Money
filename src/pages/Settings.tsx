import { useState, useRef, useEffect } from 'react'
import { useSettings, useCategories, useTransactions, useProjects, useBudgets } from '@/db/hooks'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { exportAllData, importAllData, exportCSV, downloadFile } from '@/services/export'
import { db } from '@/db'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { CAT_ICON_OPTIONS, CATEGORY_ICON_MAP, PROJECT_ICON_MAP, PROJECT_ICONS as PROJ_ICONS_LIST, MoreHorizontal, Settings as SettingsIcon, Tag, FolderOpen, Database, Download, Upload, Trash2, Edit3, Check, X, Mic, Palette, Wallet, Plus } from '@/lib/icons'
import { CATEGORY_DESCRIPTIONS } from '@/lib/constants'

const ALL_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#84cc16', '#f59e0b', '#78716c']

function LucideIconPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
      {CAT_ICON_OPTIONS.map(({ key, Icon }) => (
        <button key={key} onClick={() => onChange(key)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${value === key ? 'bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          <Icon size={18} strokeWidth={1.8} className="text-gray-600 dark:text-gray-400" />
        </button>
      ))}
    </div>
  )
}

const ICON_COLORS_SM = ['#f59e0b','#3b82f6','#ec4899','#8b5cf6','#10b981','#f43f5e','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#eab308']

function CategoryBadge({ cat, idx }: { cat: any; idx: number }) {
  const Icon = CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal
  const bg = ICON_COLORS_SM[idx % ICON_COLORS_SM.length]
  return <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bg }}><Icon size={18} strokeWidth={2} color="#fff" /></div>
}

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { transactions } = useTransactions()
  const { projects, addProject, deleteProject } = useProjects()
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets()

  const [apiKey, setApiKey] = useState(''); const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1'); const [model, setModel] = useState('deepseek-chat'); const [saved, setSaved] = useState(false); const [testResult, setTestResult] = useState('')
  const [speechApiKey, setSpeechApiKey] = useState(''); const [speechSecretKey, setSpeechSecretKey] = useState(''); const [speechSaved, setSpeechSaved] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false); const [newCatName, setNewCatName] = useState(''); const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense'); const [newCatIcon, setNewCatIcon] = useState('more-horizontal')
  const [showAddProject, setShowAddProject] = useState(false); const [newProjectName, setNewProjectName] = useState(''); const [newProjectIcon, setNewProjectIcon] = useState('package'); const [newProjectColor, setNewProjectColor] = useState('#3b82f6')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null); const [importMessage, setImportMessage] = useState('')

  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetEditing, setBudgetEditing] = useState(false)
  const currentYM = getCurrentYearMonth()
  const currentBudget = budgets.find(b => b.yearMonth === currentYM && b.categoryId === null)

  useEffect(() => { if (settings) { setBaseUrl(settings.apiBaseUrl || 'https://api.deepseek.com/v1'); setModel(settings.model || 'deepseek-chat') } }, [settings])

  const handleSaveApiKey = async () => { if (!updateSettings) return; await updateSettings({ apiKey: apiKey ? await encryptApiKey(apiKey) : settings?.apiKey || '', apiBaseUrl: baseUrl, model }); setSaved(true); setTimeout(() => setSaved(false), 2000); setApiKey('') }
  const handleSaveSpeech = async () => { if (!updateSettings) return; await updateSettings({ speechApiKey: speechApiKey || settings?.speechApiKey || '', speechSecretKey: speechSecretKey || settings?.speechSecretKey || '' }); setSpeechSaved(true); setTimeout(() => setSpeechSaved(false), 2000); setSpeechApiKey(''); setSpeechSecretKey('') }
  const handleTestConnection = async () => { setTestResult('测试中...'); try { const key = apiKey || (settings?.apiKey ? await decryptApiKey(settings.apiKey) : ''); if (!key) { setTestResult('请先填入 API Key'); return }; const r = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${key}` } }); setTestResult(r.ok ? '连接成功' : `失败 (${r.status})`) } catch { setTestResult('网络错误') } }
  const handleAddCategory = async () => { if (!newCatName.trim()) return; await addCategory({ name: newCatName.trim(), type: newCatType, icon: newCatIcon, color: '#6b7280', isSystem: false }); setNewCatName(''); setShowAddCat(false) }
  const handleAddProject = async () => { if (!newProjectName.trim()) return; await addProject({ name: newProjectName.trim(), icon: newProjectIcon, color: newProjectColor }); setNewProjectName(''); setShowAddProject(false) }
  const handleClearAllData = async () => { await db.transactions.clear(); await db.chatMessages.clear(); await db.projects.clear(); setShowClearConfirm(false); window.location.reload() }
  const handleExportJSON = async () => { downloadFile(await exportAllData(), `auto-money-${new Date().toISOString().slice(0, 10)}.json`, 'application/json') }
  const handleExportCSV = async () => { downloadFile(exportCSV(transactions, categories), `auto-money-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv') }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; try { await importAllData(await f.text()); setImportMessage('导入成功'); setTimeout(() => setImportMessage(''), 2000) } catch { setImportMessage('导入失败') }; if (fileInputRef.current) fileInputRef.current.value = '' }

  const expenseCats = categories.filter((c) => c.type === 'expense'); const incomeCats = categories.filter((c) => c.type === 'income')

  return (
    <div className="max-w-lg mx-auto space-y-5 slide-up pb-safe">
      {/* API */}
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2"><SettingsIcon size={18} strokeWidth={1.8} className="text-accent" />API 配置</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-400 mb-1 block">API Key</label><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={settings?.apiKey ? '已配置' : 'sk-'} className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Base URL</label><input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">模型</label><input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          {testResult && <p className={`text-xs font-medium ${testResult.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{testResult}</p>}
          <div className="flex gap-2"><button onClick={handleTestConnection} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium">测试连接</button><button onClick={handleSaveApiKey} className="flex-1 py-2.5 rounded-2xl bg-primary-gradient text-white text-sm font-semibold shadow-lg">{saved ? '已保存' : '保存'}</button></div>
        </div>
      </div>

      {/* Speech */}
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2"><Mic size={18} strokeWidth={1.8} className="text-accent" />语音识别</h3>
        <div className="space-y-3">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
            <button onClick={() => updateSettings?.({ speechProvider: 'baidu' })} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${settings?.speechProvider === 'baidu' ? 'bg-white dark:bg-gray-700 shadow-sm text-accent' : 'text-gray-500'}`}>百度语音</button>
            <button onClick={() => updateSettings?.({ speechProvider: 'none' })} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${!settings?.speechProvider || settings?.speechProvider === 'none' ? 'bg-white dark:bg-gray-700 shadow-sm text-accent' : 'text-gray-500'}`}>不使用</button>
          </div>
          {settings?.speechProvider === 'baidu' && (
            <>
              <div><label className="text-xs text-gray-400 mb-1 block">API Key</label><input type="password" value={speechApiKey} onChange={e => setSpeechApiKey(e.target.value)} placeholder={settings.speechApiKey ? '已配置' : ''} className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Secret Key</label><input type="password" value={speechSecretKey} onChange={e => setSpeechSecretKey(e.target.value)} placeholder={settings.speechSecretKey ? '已配置' : ''} className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
              <p className="text-xs text-muted">前往 <a href="https://console.bce.baidu.com/ai/#/ai/speech/overview/index" target="_blank" className="text-accent underline">百度智能云</a> 创建应用获取密钥，免费额度 5 万次/年</p>
              <button onClick={handleSaveSpeech} className="w-full py-2.5 rounded-2xl bg-primary-gradient text-white text-sm font-semibold shadow-lg">{speechSaved ? '已保存' : '保存语音配置'}</button>
              </>
          )}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2"><Palette size={18} strokeWidth={1.8} className="text-accent" />主题配色</h3>
        <p className="text-xs text-muted mb-3">选择喜欢的配色方案，影响所有界面的主色调</p>

        <p className="text-xs font-semibold text-muted mb-2">配色模式</p>
        <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <button onClick={() => updateSettings?.({ themeMode: 'dynamic' })}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${settings?.themeMode !== 'fixed' ? 'bg-white dark:bg-gray-700 shadow-sm text-accent' : 'text-gray-500'}`}>动态心情</button>
          <button onClick={() => updateSettings?.({ themeMode: 'fixed' })}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${settings?.themeMode === 'fixed' ? 'bg-white dark:bg-gray-700 shadow-sm text-accent' : 'text-gray-500'}`}>固定配色</button>
        </div>

        {settings?.themeMode !== 'fixed' ? (
          <>
            <p className="text-xs font-semibold text-muted mb-2">跟随策略</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'most-frequent', label: '最多心情', desc: '本月频次最高' },
                { key: 'latest', label: '最新消费', desc: '最近一笔心情' },
                { key: 'adaptive', label: '全天适应', desc: '当日心情变化' },
              ]).map(opt => (
                <button key={opt.key} onClick={() => updateSettings?.({ colorScheme: opt.key as any })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    (settings?.colorScheme || 'most-frequent') === opt.key
                      ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-amber-200'
                  }`}>
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'warm-amber', label: '暖琥珀', colors: ['#e6a817','#d97706','#b45309'] },
              { key: 'forest-green', label: '森绿', colors: ['#10b981','#059669','#047857'] },
              { key: 'ocean-blue', label: '海蓝', colors: ['#3b82f6','#2563eb','#1d4ed8'] },
              { key: 'rose-pink', label: '玫瑰粉', colors: ['#f43f5e','#e11d48','#be123c'] },
              { key: 'lavender', label: '薰衣草', colors: ['#8b5cf6','#7c3aed','#6d28d9'] },
              { key: 'sunset-orange', label: '日落橙', colors: ['#fb923c','#ea580c','#c2410c'] },
            ]).map(t => {
              const active = (settings?.fixedTheme || 'warm-amber') === t.key
              return (
                <button key={t.key} onClick={() => updateSettings?.({ fixedTheme: t.key })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    active ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-amber-200'
                  }`}>
                  <div className="flex gap-0.5 justify-center mb-1.5">
                    {t.colors.map((c,i) => <div key={i} className="w-5 h-5 rounded-full shadow-sm" style={{backgroundColor:c}}/>)}
                  </div>
                  <p className="text-[10px] font-semibold">{t.label}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="glow-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2"><Tag size={18} strokeWidth={1.8} className="text-accent" />收支分类</h3>
          <button onClick={() => setShowAddCat(!showAddCat)} className="text-xs text-accent hover:brightness-90 font-semibold">{showAddCat ? '取消' : '+ 新建'}</button>
        </div>
        {showAddCat && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-2"><button onClick={() => setNewCatType('expense')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newCatType === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>支出</button><button onClick={() => setNewCatType('income')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newCatType === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>收入</button></div>
            <div><label className="text-xs text-gray-400 mb-1 block">图标</label><LucideIconPicker value={newCatIcon} onChange={setNewCatIcon} /></div>
            <div className="flex gap-2"><input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="分类名称" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" onKeyDown={e => e.key === 'Enter' && handleAddCategory()} /><button onClick={handleAddCategory} disabled={!newCatName.trim()} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">添加</button></div>
          </div>
        )}
        <div className="px-5 py-3"><p className="text-xs text-muted font-medium mb-2">支出分类</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{expenseCats.map((cat, idx) => { const Icon = CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal; const bg = ICON_COLORS_SM[idx % ICON_COLORS_SM.length]; const info = CATEGORY_DESCRIPTIONS[cat.name]; return (
            <div key={cat.id} className="relative group">
              <div title={info?.desc} className="flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 active:scale-95 transition-transform cursor-default">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bg }}><Icon size={20} strokeWidth={2} color="#fff"/></div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight truncate w-full">{cat.name}</span>
                {!cat.isSystem && <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id) }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>}
              </div>
              {info && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {info.desc}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800 dark:border-t-gray-200"/>
                </div>
              )}
            </div>
          )})}</div>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-800/50"><p className="text-xs text-muted font-medium mb-2">收入分类</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{incomeCats.map((cat, idx) => { const Icon = CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal; const bg = ICON_COLORS_SM[(idx + expenseCats.length) % ICON_COLORS_SM.length]; const info = CATEGORY_DESCRIPTIONS[cat.name]; return (
            <div key={cat.id} className="relative group">
              <div title={info?.desc} className="flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 active:scale-95 transition-transform cursor-default">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bg }}><Icon size={20} strokeWidth={2} color="#fff"/></div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight truncate w-full">{cat.name}</span>
                {!cat.isSystem && <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id) }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>}
              </div>
              {info && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {info.desc}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800 dark:border-t-gray-200"/>
                </div>
              )}
            </div>
          )})}</div>
        </div>
      </div>

      {/* Budget */}
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2"><Wallet size={18} strokeWidth={1.8} className="text-accent" />月度预算</h3>
        <p className="text-xs text-gray-400 mb-3">设定每月预算，盈余可转入心愿，超出形成亏空需优先填平</p>
        {currentBudget ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-xs text-muted">{currentYM} 预算</p>
                <p className="text-xl font-bold text-accent dark:text-accent">{formatAmount(currentBudget.amount)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setBudgetAmount(String(currentBudget.amount)); setBudgetEditing(true) }} className="btn-icon"><Edit3 size={14} /></button>
                <button onClick={() => deleteBudget(currentBudget.id)} className="btn-icon btn-icon-danger"><Trash2 size={14} /></button>
              </div>
            </div>
            {budgetEditing && (
              <div className="flex gap-2">
                <input type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="金额" className="input flex-1" autoFocus />
                <button onClick={async () => { await updateBudget(currentBudget.id, { amount: parseFloat(budgetAmount) || 0 }); setBudgetEditing(false) }} className="btn btn-primary btn-sm"><Check size={14} /></button>
                <button onClick={() => setBudgetEditing(false)} className="btn btn-secondary btn-sm"><X size={14} /></button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!budgetEditing ? (
              <button onClick={() => setBudgetEditing(true)} className="w-full py-2.5 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 text-accent text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20"><Plus size={15} />设定本月预算</button>
            ) : (
              <div className="flex gap-2">
                <input type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="预算金额" className="input flex-1" autoFocus />
                <button onClick={async () => { await addBudget({ categoryId: null, amount: parseFloat(budgetAmount) || 0, period: 'monthly', yearMonth: currentYM }); setBudgetEditing(false); setBudgetAmount('') }} disabled={!budgetAmount} className="btn btn-primary btn-sm"><Check size={14} /></button>
                <button onClick={() => { setBudgetEditing(false); setBudgetAmount('') }} className="btn btn-secondary btn-sm"><X size={14} /></button>
              </div>
            )}
          </div>
        )}
        {budgets.filter(b => b.yearMonth !== currentYM || b.categoryId !== null).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-muted mb-2">历史预算</p>
            {budgets.filter(b => b.yearMonth !== currentYM || b.categoryId !== null).sort((a,b) => b.yearMonth.localeCompare(a.yearMonth)).map(b => (
              <div key={b.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-muted">{b.yearMonth}{b.categoryId ? ' · ' + (categories.find(c => c.id === b.categoryId)?.name || '分类') : ''}</span>
                <span className="font-medium">{formatAmount(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="glow-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2"><FolderOpen size={18} strokeWidth={1.8} className="text-accent" />分账单</h3>
          <button onClick={() => setShowAddProject(!showAddProject)} className="text-xs text-accent hover:brightness-90 font-semibold">{showAddProject ? '取消' : '+ 新建'}</button>
        </div>
        {showAddProject && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-1 flex-wrap">{PROJ_ICONS_LIST.map(p => { const Icon = PROJECT_ICON_MAP[p.key] || MoreHorizontal; return <button key={p.key} onClick={() => setNewProjectIcon(p.key)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${newProjectIcon === p.key ? 'bg-amber-100 dark:bg-amber-900/50 ring-1 ring-amber-400' : 'hover:bg-white dark:hover:bg-gray-700'}`}><Icon size={16} strokeWidth={1.8} className="text-gray-600 dark:text-gray-400" /></button> })}</div>
            <div className="flex gap-1.5">{ALL_COLORS.map(c => <button key={c} onClick={() => setNewProjectColor(c)} className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: c, borderColor: newProjectColor === c ? '#1f2937' : 'transparent' }} />)}</div>
            <div className="flex gap-2"><input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="如：春节旅游、游戏开支" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" onKeyDown={e => e.key === 'Enter' && handleAddProject()} /><button onClick={handleAddProject} disabled={!newProjectName.trim()} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">创建</button></div>
          </div>
        )}
        {projects.length === 0 && !showAddProject ? <div className="px-5 py-4 text-center text-sm text-gray-400">暂无分账单</div> : projects.map(p => { const Icon = PROJECT_ICON_MAP[p.icon] || MoreHorizontal; return <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 dark:border-gray-800/30 last:border-0 group"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '18' }}><Icon size={18} strokeWidth={1.8} color={p.color} /></div><span className="flex-1 text-sm font-medium">{p.name}</span><button onClick={() => deleteProject(p.id)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">删除</button></div> })}
      </div>

      {/* Data */}
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-3 flex items-center gap-2"><Database size={18} strokeWidth={1.8} className="text-accent" />数据管理</h3>
        <div className="space-y-2">
          <button onClick={handleExportJSON} className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"><Download size={15} />导出全部数据 (JSON)</button>
          <button onClick={handleExportCSV} className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"><Download size={15} />导出交易记录 (CSV)</button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"><Upload size={15} />导入数据 (JSON)</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          {importMessage && <p className={`text-xs text-center font-medium ${importMessage.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{importMessage}</p>}
          <hr className="border-gray-100 dark:border-gray-800 my-2" />
          <button onClick={() => setShowClearConfirm(true)} className="w-full py-2.5 rounded-2xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"><Trash2 size={15} />清除所有数据</button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-lg tracking-tight">确认清除</p><p className="text-gray-400 text-sm mt-1 mb-6">将删除所有交易、对话和预算数据</p>
            <div className="flex gap-2"><button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 font-semibold text-sm">取消</button><button onClick={handleClearAllData} className="flex-1 py-3 rounded-2xl bg-red-400 text-white font-semibold text-sm shadow-lg shadow-red-400/20">确认清除</button></div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">心情收支簿 · 数据存储在浏览器本地</p>
    </div>
  )
}
