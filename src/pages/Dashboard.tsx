import { useState, useMemo, useRef } from 'react'
import { useTransactions, useCategories, useProjects, useBudgets, useSettings } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown, getDailyTrend } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import { CATEGORY_DESCRIPTIONS } from '@/lib/constants'
import { MOOD_LIST, MOOD_ICON_MAP, MOOD_COLOR_MAP, CATEGORY_ICON_MAP, MoreHorizontal, BarChart3, Trash2, PieChart, List, Calendar as CalendarIcon, Check, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Plus, Target, Zap, Brain } from '@/lib/icons'
import CategoryIcon from '@/components/CategoryIcon'
import AddModal from '@/components/AddModal'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import type { Transaction } from '@/types'
import { PieChart as RPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area } from 'recharts'

const BANNER: Record<string, string> = { happy:'banner-happy',calm:'banner-calm',neutral:'banner-neutral',sad:'banner-sad',anxious:'banner-anxious',angry:'banner-angry',excited:'banner-excited',tired:'banner-tired' }
type FilterType = 'all'|'expense'|'income'
const CHART_COLORS = ['#3b82f6','#10b981','#f43f5e','#f59e0b','#f97316','#ec4899','#06b6d4','#84cc16','#d97706','#14b8a6','#eab308','#78716c']

function CalendarHeatmap({ transactions, yearMonth, selectedDay, onSelectDay, onMonthChange }: { transactions: Transaction[]; yearMonth: string; selectedDay: string|null; onSelectDay:(d:string|null)=>void; onMonthChange:(ym:string)=>void }) {
  const [y,m]=yearMonth.split('-').map(Number); const dim=new Date(y,m,0).getDate(); const fd=new Date(y,m-1,1).getDay(); const today=new Date().toISOString().slice(0,10)
  const dt=useMemo(()=>{const mp:Record<string,number>={};for(const t of transactions){if(t.type==='expense')mp[t.date]=(mp[t.date]||0)+t.amount}return mp},[transactions])
  const mx=Math.max(...Object.values(dt),1);const wks:(number|null)[][]=[];let wk:(number|null)[]=[]
  for(let i=0;i<fd;i++)wk.push(null);for(let d=1;d<=dim;d++){wk.push(d);if(wk.length===7){wks.push(wk);wk=[]}};if(wk.length>0){while(wk.length<7)wk.push(null);wks.push(wk)}
  const cl=(day:number|null,ds:string)=>{if(day===null)return'';const t=dt[ds]||0;if(t===0)return'bg-gray-100 dark:bg-gray-800 text-gray-400';const r=t/mx;if(r>.66)return'bg-red-400/80 dark:bg-red-600/80 text-white';if(r>.33)return'bg-orange-300/80 dark:bg-orange-600/80 text-white';return'bg-yellow-200/80 dark:bg-yellow-700/80 text-gray-700'}
  const pv=()=>{let ny=y,nm=m-1;if(nm===0){nm=12;ny--};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)};const nx=()=>{let ny=y,nm=m+1;if(nm===13){nm=1;ny++};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)}
  const tr=useRef(0)
  return (
    <div className="card card-chart p-4" onTouchStart={e=>{tr.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=tr.current-e.changedTouches[0].clientX;if(Math.abs(d)>60)d>0?nx():pv()}}>
      <div className="flex items-center justify-between mb-2"><button onClick={pv} className="p-1 text-gray-400 hover:text-accent text-lg">‹</button><h3 className="text-sm font-semibold">月历</h3><button onClick={nx} className="p-1 text-gray-400 hover:text-accent text-lg">›</button></div>
      <div className="grid grid-cols-7 gap-1 mb-1">{['日','一','二','三','四','五','六'].map(d=><div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>)}</div>
      {wks.map((w,wi)=>(
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((day,di)=>{
            if(day===null)return<div key={di}/>
            const ds=`${yearMonth}-${String(day).padStart(2,'0')}`
            const sel=selectedDay===ds
            const c=cl(day,ds)
            const ring=sel?'ring-2 ring-amber-500 ring-offset-2 scale-110':'hover:scale-105'
            const tRing=ds===today&&!sel?'ring-1 ring-amber-400/50':''
            return<button key={di} onClick={()=>onSelectDay(sel?null:ds)} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${c} ${ring} ${tRing}`}>{day}</button>
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-400"><span>少</span><div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"/><div className="w-3 h-3 rounded-sm bg-yellow-200/80 dark:bg-yellow-700/80"/><div className="w-3 h-3 rounded-sm bg-orange-300/80 dark:bg-orange-600/80"/><div className="w-3 h-3 rounded-sm bg-red-400/80 dark:bg-red-600/80"/><span>多</span>{selectedDay&&<button onClick={()=>onSelectDay(null)} className="ml-auto text-accent font-medium">清除</button>}</div>
    </div>
  )
}

export default function Dashboard() {
  const [projectId,setProjectId]=useState<string|null>(null);const [filterType,setFilterType]=useState<FilterType>('all');const [filterMood,setFilterMood]=useState('');const [filterCategory,setFilterCategory]=useState('')
  const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');const [searchQuery,setSearchQuery]=useState('')
  const [calendarMonth,setCalendarMonth]=useState(getCurrentYearMonth());const [selectedDay,setSelectedDay]=useState<string|null>(null)
  const [showCalendar,setShowCalendar]=useState(false);const [showAdd,setShowAdd]=useState(false)
  const [editing,setEditing]=useState<Transaction|null>(null);const [deleteId,setDeleteId]=useState<string|null>(null)
  const [eAmt,setEAmt]=useState('');const [eDesc,setEDesc]=useState('');const [eDate,setEDate]=useState('');const [eCat,setECat]=useState('');const [eType,setEType]=useState<'expense'|'income'>('expense');const [eMood,setEMood]=useState('');const [eProj,setEProj]=useState('')

  const [yearMonth,setYearMonth]=useState(getCurrentYearMonth());const [year,month]=yearMonth.split('-').map(Number)
  const {transactions:all,updateTransaction,deleteTransaction}=useTransactions({month:yearMonth})
  const {categories}=useCategories();const {projects}=useProjects();const {budgets}=useBudgets();const {settings}=useSettings()
  const txs=useMemo(()=>projectId?all.filter(t=>t.projectId===projectId):all,[all,projectId])
  const stats=useMemo(()=>getMonthlyStats(txs,yearMonth),[txs,yearMonth])
  const expBrk=useMemo(()=>getCategoryBreakdown(txs,categories,'expense',yearMonth),[txs,categories,yearMonth])
  const incBrk=useMemo(()=>getCategoryBreakdown(txs,categories,'income',yearMonth),[txs,categories,yearMonth])
  const dailyTrend=useMemo(()=>getDailyTrend(txs,30),[txs])
  const prevStats=useMemo(()=>{const [y,m]=yearMonth.split('-').map(Number);let py=y,pm=m-1;if(pm===0){pm=12;py--};return getMonthlyStats(all,`${py}-${String(pm).padStart(2,'0')}`)},[all,yearMonth])

  const moodStats=useMemo(()=>{const m:Record<string,{count:number;totalSpent:number}>={};for(const t of txs){if(!t.mood||t.type!=='expense')continue;if(!m[t.mood])m[t.mood]={count:0,totalSpent:0};m[t.mood].count++;m[t.mood].totalSpent+=t.amount};return MOOD_LIST.filter(x=>m[x.value]).map(x=>({...x,...m[x.value]})).sort((a,b)=>b.count-a.count)},[txs])

  const dom=moodStats[0];const moodKey=dom?.value||'neutral'

  const moodTimeline=useMemo(()=>{const today=new Date();return Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(13-i));const ds=d.toISOString().slice(0,10);const dayTxs=txs.filter(t=>t.date===ds);const lm=dayTxs.filter(t=>t.mood).pop();return{date:ds,label:i===13?'今天':i===12?'昨天':`${d.getMonth()+1}/${d.getDate()}`,moodVal:lm?.mood||null,spent:dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)}})},[txs])

  const filtered=useMemo(()=>{let d=txs;if(filterType!=='all')d=d.filter(t=>t.type===filterType);if(filterMood)d=d.filter(t=>t.mood===filterMood);if(filterCategory)d=d.filter(t=>t.categoryId===filterCategory);if(dateFrom)d=d.filter(t=>t.date>=dateFrom);if(dateTo)d=d.filter(t=>t.date<=dateTo);if(selectedDay)d=d.filter(t=>t.date===selectedDay);if(searchQuery.trim()){const q=searchQuery.toLowerCase();d=d.filter(t=>t.description.toLowerCase().includes(q)||(categories.find(c=>c.id===t.categoryId)?.name||'').toLowerCase().includes(q))};return d},[txs,filterType,filterMood,filterCategory,dateFrom,dateTo,selectedDay,searchQuery,categories])
  const grouped=useMemo(()=>{const g:Record<string,Transaction[]>={};for(const t of filtered)g[t.date]=[...(g[t.date]||[]),t];return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]))},[filtered])
  const calTxs=useMemo(()=>all.filter(t=>t.date.startsWith(calendarMonth)),[all,calendarMonth])

  const currentBudget = useMemo(() => budgets.find(b => b.yearMonth === yearMonth && b.categoryId === null), [budgets, yearMonth])
  const budgetUsed = currentBudget ? stats.totalExpense : 0
  const budgetPct = currentBudget && currentBudget.amount > 0 ? Math.min((budgetUsed / currentBudget.amount) * 100, 100) : 0
  const budgetRemaining = currentBudget ? Math.max(currentBudget.amount - budgetUsed, 0) : 0
  const budgetOverspent = currentBudget ? Math.max(budgetUsed - currentBudget.amount, 0) : 0

  const hEdit=(t:Transaction)=>{setEditing(t);setEAmt(String(t.amount));setEDesc(t.description);setEDate(t.date);setECat(t.categoryId);setEType(t.type);setEMood(t.mood||'');setEProj(t.projectId||'')}
  const hSave=async()=>{if(!editing)return;const a=parseFloat(eAmt);if(!a||a<=0)return;await updateTransaction(editing.id,{amount:a,description:eDesc,date:eDate,categoryId:eCat,type:eType,mood:eMood||undefined,projectId:eProj||undefined});setEditing(null)}
  const hDel=async(id:string)=>{await deleteTransaction(id);setDeleteId(null)}
  const expCats=categories.filter(c=>c.type==='expense');const incCats=categories.filter(c=>c.type==='income');const curCats=eType==='expense'?expCats:incCats

  const hr=new Date().getHours();const greet=hr<6?'夜深了':hr<12?'早上好':hr<18?'下午好':'晚上好'
  const quotes:Record<string,string>={happy:'开心的消费是给自己的礼物',calm:'平静的日子，理性的支出',sad:'难过的日子也要对自己温柔',anxious:'焦虑时停一停，深呼吸',angry:'愤怒时别做决定，先冷静',excited:'兴奋是好事，也别忘了理性',tired:'累了就休息，别用购物犒劳自己',neutral:'记录心情，认识自己'}
  const DomIcon=dom?.Icon

  const incomeChange = prevStats.totalIncome > 0 ? Math.round(((stats.totalIncome - prevStats.totalIncome) / prevStats.totalIncome) * 100) : 0
  const expenseChange = prevStats.totalExpense > 0 ? Math.round(((stats.totalExpense - prevStats.totalExpense) / prevStats.totalExpense) * 100) : 0

  const moodBarData = useMemo(() => MOOD_LIST.filter(m => moodStats.find(ms => ms.value === m.value)).map(m => {
    const ms = moodStats.find(x => x.value === m.value)
    return { name: m.label, value: ms?.totalSpent || 0, count: ms?.count || 0, color: m.color }
  }).sort((a,b) => b.value - a.value), [moodStats])

  return (
    <div className="max-w-4xl mx-auto space-y-5 slide-up pb-safe">
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId}/>

      <select value={yearMonth} onChange={e=>setYearMonth(e.target.value)} className="card px-4 py-2 text-sm font-semibold focus:outline-none cursor-pointer w-auto">
        {(()=>{const o:{v:string;l:string}[]=[];const n=new Date();for(let i=0;i<12;i++){const d=new Date(n.getFullYear(),n.getMonth()-i,1);o.push({v:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,l:`${d.getFullYear()}年${d.getMonth()+1}月`})}return o})().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      {/* Mood Banner */}
      <div className={`rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden ${settings?.themeMode!=='fixed'?BANNER[moodKey]||BANNER.neutral:''}`}
        style={settings?.themeMode==='fixed'?{background:'var(--c-primary-gradient)'}:undefined}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.1),transparent_40%)]"/>
        <div className="absolute inset-0 dot-pattern"/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{greet}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight text-white neon-text">心情收支簿</p>
            <p className="text-white/60 text-xs mt-2 italic">{quotes[moodKey]||quotes.neutral}</p>
          </div>
          {DomIcon&&<div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 bounce-in"><DomIcon size={44} strokeWidth={1.5} className="text-white drop-shadow-lg"/></div>}
        </div>
      </div>

      {txs.length===0?(
        <div className="space-y-5">
          <div className="card card-accent p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center mx-auto mb-5">
              <BarChart3 size={32} strokeWidth={1.5} className="text-accent"/>
            </div>
            <h2 className="text-xl font-bold mb-2">欢迎来到心情收支簿</h2>
            <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto mb-8">基于消费心理学理论的智能记账工具<br/>帮你看见消费心理模式，学会与欲望共处</p>
            
            {/* Category intro cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8">
              <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"><TrendingUp size={14} className="text-rose-400"/></div>
                  <span className="text-sm font-semibold">支出 · 消费心理五型</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/> 必要 — 维持生存运转</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/> 价值 — 自我成长投资</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"/> 情绪 — 情绪状态驱动</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/> 冲动 — 无计划决策</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"/> 意外 — 突发不可控</div>
                </div>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ArrowUpRight size={14} className="text-emerald-400"/></div>
                  <span className="text-sm font-semibold">收入 · 来源心理五型</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/> 劳动 — 技能时间换酬</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/> 增值 — 资产被动回报</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0"/> 馈赠 — 他人情感给予</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/> 惊喜 — 不期而遇</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0"/> 回流 — 支出反向流回</div>
                </div>
              </div>
            </div>

            {/* Three steps */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-5 text-left mb-6">
              <p className="text-sm font-semibold mb-4">三步开始</p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center flex-shrink-0 text-accent font-bold text-sm">1</div>
                  <div><p className="text-sm font-medium">记第一笔</p><p className="text-xs text-muted">选择消费类型和心情，开始记录你的消费心理模式</p></div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center flex-shrink-0 text-accent font-bold text-sm">2</div>
                  <div><p className="text-sm font-medium">配置 AI</p><p className="text-xs text-muted">去设置填入 DeepSeek API Key，解锁智能解析和报告</p></div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center flex-shrink-0 text-accent font-bold text-sm">3</div>
                  <div><p className="text-sm font-medium">管理冲动</p><p className="text-xs text-muted">遇到犹豫的消费？去心愿页让 AI 帮你冷静分析</p></div>
                </div>
              </div>
            </div>

            <button onClick={()=>setShowAdd(true)} className="btn btn-primary text-base px-8 py-3 mx-auto"><Plus size={18}/>记第一笔</button>
          </div>
        </div>
      ):(
        <>
          {/* Stats Row */}
          <div className="bento stagger">
            <div className="card card-stat card-hover bento-col-2 md:bento-col-2 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ArrowUpRight size={16} className="text-emerald-500"/></div><span className="text-xs text-muted">本月收入</span></div>
              <p className="text-xl font-bold amount truncate">{formatAmount(stats.totalIncome)}</p>
              {incomeChange !== 0 && <p className={`text-xs mt-0.5 ${incomeChange > 0 ? 'text-emerald-500' : 'text-red-400'}`}>{incomeChange > 0 ? '+' : ''}{incomeChange}% 环比</p>}
            </div>
            <div className="card card-stat card-hover bento-col-2 md:bento-col-2 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"><ArrowDownRight size={16} className="text-rose-400"/></div><span className="text-xs text-muted">本月支出</span></div>
              <p className="text-xl font-bold amount truncate">{formatAmount(stats.totalExpense)}</p>
              {expenseChange !== 0 && <p className={`text-xs mt-0.5 ${expenseChange > 0 ? 'text-red-400' : 'text-emerald-500'}`}>{expenseChange > 0 ? '+' : ''}{expenseChange}% 环比</p>}
            </div>
            <div className="card card-stat card-hover bento-col-2 md:bento-col-2 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><TrendingUp size={16} className="text-accent"/></div><span className="text-xs text-muted">本月结余</span></div>
              <p className={`text-xl font-bold amount truncate ${stats.balance < 0 ? 'text-red-400' : ''}`}>{formatAmount(stats.balance)}</p>
              <p className="text-xs text-muted mt-0.5">{stats.count} 笔交易</p>
            </div>
            <div className="card card-stat card-hover bento-col-2 md:bento-col-2 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Wallet size={16} className="text-purple-500"/></div><span className="text-xs text-muted">本月预算</span></div>
              {currentBudget ? (
                <>
                  <p className="text-xl font-bold amount truncate">{formatAmount(budgetRemaining)}<span className="text-sm font-normal text-muted"> / {formatAmount(currentBudget.amount)}</span></p>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${budgetPct > 90 ? 'bg-red-400' : budgetPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{width:`${budgetPct}%`}}/>
                  </div>
                  <p className="text-xs text-muted mt-1">{budgetOverspent > 0 ? <span className="text-red-400">超出 {formatAmount(budgetOverspent)}</span> : `已用 ${Math.round(budgetPct)}%`}</p>
                </>
              ) : (
                <p className="text-sm text-muted">未设定</p>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="bento stagger">
            <div className="card card-chart card-hover bento-col-2">
              <div className="card-header"><PieChart size={18} strokeWidth={1.8} className="text-accent"/>五型消费分布</div>
              <div className="card-body">
                {expBrk.length>0?(
                  <div className="flex items-center gap-4">
                    <div className="w-36 h-36 flex-shrink-0 relative">
                      <ResponsiveContainer>
                        <RPie>
                          <defs>
                            {CHART_COLORS.map((c,i)=><filter key={i} id={`shadow-${i}`}><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/></filter>)}
                          </defs>
                          <Pie data={expBrk} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="amount" stroke="none">
                            {expBrk.map((e,i)=><Cell key={e.categoryId} fill={CHART_COLORS[i%CHART_COLORS.length]} filter={`url(#shadow-${i})`}/>)}
                          </Pie>
                        </RPie>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-muted">总支出</span>
                        <span className="text-sm font-bold amount">{formatAmount(stats.totalExpense)}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">{expBrk.slice(0,5).map((item,i)=>{
                      const dotColor = CHART_COLORS[i % CHART_COLORS.length]
                      const cat = categories.find(c => c.id === item.categoryId)
                      const Icon = cat ? (CATEGORY_ICON_MAP[cat.icon] || MoreHorizontal) : MoreHorizontal
                      return (
                        <div key={item.categoryId} className="flex items-center gap-2 text-xs group cursor-default">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: dotColor }} />
                          {cat && <Icon size={14} strokeWidth={1.8} className="text-gray-400 flex-shrink-0" />}
                          <span className="flex-1 font-medium truncate">{item.categoryName}</span>
                          <span className="text-muted amount text-[11px]">{item.percentage}%</span>
                        </div>
                      )
                    })}</div>
                  </div>
                ):<p className="text-sm text-muted text-center py-8">暂无支出</p>}
              </div>
            </div>

            <div className="card card-chart card-hover bento-col-2">
              <div className="card-header"><BarChart3 size={18} strokeWidth={1.8} className="text-accent"/>心情×消费</div>
              <div className="card-body">
                {moodBarData.length>0?(
                  <div className="h-44">
                    <ResponsiveContainer>
                      <BarChart data={moodBarData} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 4 }} barCategoryGap="25%">
                        <defs>
                          {moodBarData.map((entry,idx) => (
                            <linearGradient key={idx} id={`barGrad-${idx}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={entry.color} stopOpacity={0.55}/>
                              <stop offset="100%" stopColor={entry.color} stopOpacity={0.85}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#a8a29e',fontWeight:500}} axisLine={false} tickLine={false} width={32} />
                        <Tooltip cursor={{fill:'rgba(0,0,0,0.03)',rx:8}} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',fontSize:'12px',padding:'8px 14px'}} formatter={(v:number)=>(['¥'+v.toFixed(2),'消费金额'])} />
                        <Bar dataKey="value" radius={[4,8,8,4]} barSize={18} animationBegin={200} animationDuration={800}>
                          {moodBarData.map((entry,idx) => <Cell key={idx} fill={`url(#barGrad-${idx})`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ):<p className="text-sm text-muted text-center py-8">记账时选心情，这里就会出现统计</p>}
              </div>
            </div>
          </div>

          {/* Daily Trend Line Chart */}
          <div className="card card-chart card-hover overflow-hidden">
            <div className="card-header"><TrendingUp size={18} strokeWidth={1.8} className="text-accent"/>30日收支趋势</div>
            <div className="card-body">
              <div className="h-44">
                <ResponsiveContainer>
                  <AreaChart data={dailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'#a8a29e'}} axisLine={false} tickLine={false} interval={5} />
                    <YAxis tick={{fontSize:10,fill:'#a8a29e'}} axisLine={false} tickLine={false} width={44} tickFormatter={(v:number)=>v>0?'¥'+(v/1000).toFixed(0)+'k':''} />
                    <Tooltip cursor={{stroke:'rgba(0,0,0,0.06)',strokeWidth:1}} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',fontSize:'12px',padding:'8px 14px'}} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" dot={false} activeDot={{r:4,fill:'#10b981',stroke:'#fff',strokeWidth:2}} />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExpense)" dot={false} activeDot={{r:4,fill:'#f43f5e',stroke:'#fff',strokeWidth:2}} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mood Timeline */}
          <div className="card card-list card-hover overflow-hidden">
            <div className="card-header"><CalendarIcon size={18} strokeWidth={1.8} className="text-accent"/>心情时间线</div>
            <div className="card-body overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-1">{moodTimeline.map(d=>{const MI=d.moodVal?MOOD_ICON_MAP[d.moodVal]:null;const color=d.moodVal?MOOD_COLOR_MAP[d.moodVal]:null;return(
                <div key={d.date} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-11">
                  <span className="text-[10px] text-gray-400 font-medium">{d.label}</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${d.moodVal?'shadow-sm scale-100':'bg-gray-50 dark:bg-gray-800 scale-90'}`} style={d.moodVal&&color?{backgroundColor:color+'18'}:{}}>
                    {MI?<MI size={18} strokeWidth={1.8} color={color||'#6b7280'}/>:<span className="text-gray-300 text-xs">—</span>}
                  </div>
                  {d.spent>0&&<span className="text-[9px] text-gray-400 font-medium amount">¥{Math.round(d.spent)}</span>}
                </div>
              )})}</div>
            </div>
          </div>

          <button onClick={()=>setShowCalendar(!showCalendar)} className="text-xs font-medium text-accent hover:brightness-90 w-full text-center">{showCalendar?'收起月历 ▲':'展开月历 ▼'}</button>
          {showCalendar&&<CalendarHeatmap transactions={calTxs} yearMonth={calendarMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMonthChange={setCalendarMonth}/>}

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-full border border-gray-200/40 overflow-hidden bg-white/40 backdrop-blur">
              {(['all','expense','income']as FilterType[]).map(t=><button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium transition-all ${filterType===t?'bg-primary text-white shadow-sm':'text-gray-500 hover:bg-white/60'}`}>{t==='all'?'全部':t==='expense'?'支出':'收入'}</button>)}
            </div>
            <select value={filterMood} onChange={e=>setFilterMood(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部心情</option>{MOOD_LIST.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部分类</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs"/>
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs"/>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="搜索" className="input flex-1 min-w-[80px] !py-1.5 !px-3 !rounded-full !text-xs"/>
          </div>

          <div className="card card-list overflow-hidden">
            {grouped.length===0?<div className="text-center py-12 text-gray-400 body-sm">没有找到匹配的记录</div>:grouped.map(([date,items])=>(
              <div key={date}>
                <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50/60 to-transparent dark:from-gray-800/40 text-xs font-semibold text-gray-500 flex justify-between">
                  <span>{formatDate(date)}</span>
                  <span className="text-gray-400 font-normal amount">收 ¥{items.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0).toFixed(2)} 支 ¥{items.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0).toFixed(2)}</span>
                </div>
                {items.map(t=>{const MI=t.mood?MOOD_ICON_MAP[t.mood]:null;const color=t.mood?MOOD_COLOR_MAP[t.mood]:null;return(
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors cursor-pointer group border-b border-gray-50/40 dark:border-gray-800/20 last:border-0" onClick={()=>hEdit(t)}>
                    <CategoryIcon categoryId={t.categoryId} size={16}/>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{categories.find(c=>c.id===t.categoryId)?.name||'未分类'}</p>{t.description&&<p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>}</div>
                    {MI&&<MI size={16} strokeWidth={1.8} color={color||'#6b7280'}/>}
                    <p className={`text-sm font-bold amount ${t.type==='expense'?'text-red-400':'text-emerald-400'}`}>{t.type==='expense'?'-':'+'}{formatAmount(t.amount)}</p>
                    <button onClick={e=>{e.stopPropagation();setDeleteId(t.id)}} className="btn-icon opacity-0 group-hover:opacity-100 btn-icon-danger"><Trash2 size={14}/></button>
                  </div>
                )})}
              </div>
            ))}
          </div>
        </>
      )}

      {editing&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={()=>setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 tracking-tight">编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">{['expense','income'].map(t=><button key={t} onClick={()=>setEType(t as any)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${eType===t?(t==='expense'?'bg-red-400 text-white shadow-sm':'bg-emerald-400 text-white shadow-sm'):'text-gray-500'}`}>{t==='expense'?'支出':'收入'}</button>)}</div>
              <input type="number" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" className="input input-lg"/>
              <div className="grid grid-cols-4 gap-2">{curCats.map(c=>{const Icon=CATEGORY_ICON_MAP[c.icon]||MoreHorizontal;return<button key={c.id} onClick={()=>setECat(c.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${eCat===c.id?'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-105 shadow-sm':'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><Icon size={20} strokeWidth={1.8} className={eCat===c.id?'text-accent':'text-gray-400'}/><span className="text-[10px] truncate w-full text-center">{c.name}</span></button>})}</div>
              <input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} className="input"/>
              <input type="text" value={eDesc} onChange={e=>setEDesc(e.target.value)} placeholder="备注" className="input"/>
              <div><p className="label mb-2">心情</p><div className="flex flex-wrap gap-1.5">{MOOD_LIST.map(m=>{const MI=m.Icon;return<button key={m.value} onClick={()=>setEMood(eMood===m.value?'':m.value)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all ${eMood===m.value?'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-105 shadow-sm':'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><MI size={15} strokeWidth={1.8}/><span>{m.label}</span></button>})}</div></div>
              {projects.length>0&&<select value={eProj} onChange={e=>setEProj(e.target.value)} className="input"><option value="">分账单（可选）</option>{projects.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select>}
              <div className="flex gap-2 pt-1"><button onClick={()=>setEditing(null)} className="btn btn-secondary flex-1">取消</button><button onClick={hSave} className="btn btn-primary flex-1"><Check size={16}/>保存</button></div>
            </div>
          </div>
        </div>
      )}

      {deleteId&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={()=>setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center" onClick={e=>e.stopPropagation()}>
            <p className="font-bold text-lg tracking-tight">确认删除</p><p className="text-gray-400 text-sm mt-1 mb-6">删除后无法恢复</p>
            <div className="flex gap-2"><button onClick={()=>setDeleteId(null)} className="btn btn-secondary flex-1">取消</button><button onClick={()=>hDel(deleteId)} className="btn btn-danger flex-1"><Trash2 size={16}/>删除</button></div>
          </div>
        </div>
      )}

      <button onClick={()=>setShowAdd(true)} className="fab fixed bottom-safe right-6 rounded-2xl text-white text-2xl z-40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 font-light shadow-2xl">+</button>
      <AddModal open={showAdd} onClose={()=>setShowAdd(false)}/>
    </div>
  )
}
