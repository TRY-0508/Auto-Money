import { useState, useMemo, useRef } from 'react'
import { useTransactions, useCategories, useProjects, useSettings, useJarGoals } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown, getDailyTrend } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import { CATEGORY_DESCRIPTIONS } from '@/lib/constants'
import { MOOD_LIST, MOOD_ICON_MAP, MOOD_COLOR_MAP, CATEGORY_ICON_MAP, MoreHorizontal, BarChart3, Trash2, PieChart, Calendar as CalendarIcon, Check, ArrowUpRight, TrendingUp, Plus } from '@/lib/icons'
import CategoryIcon from '@/components/CategoryIcon'
import AddModal from '@/components/AddModal'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import type { Transaction } from '@/types'
import { PieChart as RPie, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts'

const BANNER: Record<string, string> = { happy:'banner-happy',calm:'banner-calm',neutral:'banner-neutral',sad:'banner-sad',anxious:'banner-anxious',angry:'banner-angry',excited:'banner-excited',tired:'banner-tired' }
type FilterType = 'all'|'expense'|'income'
const CHART_COLORS = ['#3b82f6','#10b981','#f43f5e','#f59e0b','#f97316','#ec4899','#06b6d4','#84cc16','#d97706','#14b8a6','#eab308','#78716c']

function CalendarHeatmap({ transactions, yearMonth, selectedDay, onSelectDay, onMonthChange, view }: { transactions: Transaction[]; yearMonth: string; selectedDay: string|null; onSelectDay:(d:string|null)=>void; onMonthChange:(ym:string)=>void; view: 'expense'|'income'|'balance' }) {
  const [y,m]=yearMonth.split('-').map(Number); const dim=new Date(y,m,0).getDate(); const fd=new Date(y,m-1,1).getDay(); const today=new Date().toISOString().slice(0,10)
  const dt=useMemo(()=>{
    const mp:Record<string,number>={};
    if(view==='balance'){for(const t of transactions)mp[t.date]=(mp[t.date]||0)+(t.type==='income'?t.amount:-t.amount)}
    else{for(const t of transactions){if(t.type===view)mp[t.date]=(mp[t.date]||0)+t.amount}}
    return mp
  },[transactions,view])
  const vals=Object.values(dt);const mx=Math.max(...vals,1);const mn=Math.min(...vals,0)
  const wks:(number|null)[][]=[];let wk:(number|null)[]=[]
  for(let i=0;i<fd;i++)wk.push(null);for(let d=1;d<=dim;d++){wk.push(d);if(wk.length===7){wks.push(wk);wk=[]}};if(wk.length>0){while(wk.length<7)wk.push(null);wks.push(wk)}
  const cl=(day:number|null,ds:string)=>{
    if(day===null)return''
    const t=dt[ds]
    if(t===undefined||t===0)return'bg-gray-100 dark:bg-gray-800 text-gray-400'
    if(view==='balance'){
      if(t>0){const r=t/mx;if(r>.66)return'bg-emerald-500/70 text-white';if(r>.33)return'bg-emerald-300/60 text-emerald-800';return'bg-emerald-200/50 text-emerald-700'}
      else{const r=Math.abs(t)/Math.abs(mn);if(r>.66)return'bg-red-500/70 text-white';if(r>.33)return'bg-red-300/60 text-red-800';return'bg-red-200/50 text-red-700'}
    }
    if(view==='income'){const r=t/mx;if(r>.66)return'bg-emerald-500/70 text-white';if(r>.33)return'bg-emerald-300/60 text-emerald-800';return'bg-emerald-200/50 text-emerald-700'}
    const r=t/mx;if(r>.66)return'bg-red-400/80 dark:bg-red-600/80 text-white';if(r>.33)return'bg-orange-300/80 dark:bg-orange-600/80 text-white';return'bg-yellow-200/80 dark:bg-yellow-700/80 text-gray-700'
  }
  const pv=()=>{let ny=y,nm=m-1;if(nm===0){nm=12;ny--};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)};const nx=()=>{let ny=y,nm=m+1;if(nm===13){nm=1;ny++};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)}
  const tr=useRef(0)
  return (
    <div className="card card-chart p-3 sm:p-4" onTouchStart={e=>{tr.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=tr.current-e.changedTouches[0].clientX;if(Math.abs(d)>60)d>0?nx():pv()}}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={pv} className="p-1 text-gray-400 hover:text-accent text-lg">‹</button>
        <div className="flex items-center gap-1.5 text-xs font-semibold"><span>{yearMonth}</span></div>
        <button onClick={nx} className="p-1 text-gray-400 hover:text-accent text-lg">›</button>
      </div>
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
      <div className="flex items-center justify-between mt-2 text-[10px]">
        {view==='expense'&&<div className="flex items-center gap-1.5 text-gray-400"><span>少</span><div className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-800"/><div className="w-2.5 h-2.5 rounded-sm bg-yellow-200/80 dark:bg-yellow-700/80"/><div className="w-2.5 h-2.5 rounded-sm bg-orange-300/80 dark:bg-orange-600/80"/><div className="w-2.5 h-2.5 rounded-sm bg-red-400/80 dark:bg-red-600/80"/><span>多</span></div>}
        {view==='income'&&<div className="flex items-center gap-1.5 text-gray-400"><span>少</span><div className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-800"/><div className="w-2.5 h-2.5 rounded-sm bg-emerald-200/50"/><div className="w-2.5 h-2.5 rounded-sm bg-emerald-300/60"/><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70"/><span>多</span></div>}
        {view==='balance'&&<div className="flex items-center gap-1.5 text-gray-400"><span>亏</span><div className="w-2.5 h-2.5 rounded-sm bg-red-500/70"/><div className="w-2.5 h-2.5 rounded-sm bg-red-200/50"/><div className="w-2.5 h-2.5 rounded-sm bg-emerald-200/50"/><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70"/><span>盈</span></div>}
        {selectedDay&&<button onClick={()=>onSelectDay(null)} className="text-accent font-medium">清除</button>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [projectId,setProjectId]=useState<string|null>(null);const [filterType,setFilterType]=useState<FilterType>('all');const [filterMood,setFilterMood]=useState('');const [filterCategory,setFilterCategory]=useState('')
  const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');const [searchQuery,setSearchQuery]=useState('')
  const [calendarMonth,setCalendarMonth]=useState(getCurrentYearMonth());const [selectedDay,setSelectedDay]=useState<string|null>(null)
  const [calendarView,setCalendarView]=useState<'expense'|'income'|'balance'>('expense')
  const [showCalendar,setShowCalendar]=useState(false);const [showAdd,setShowAdd]=useState(false)
  const [showSavePopup,setShowSavePopup]=useState(false);const [saveGoalId,setSaveGoalId]=useState('')
  const [editing,setEditing]=useState<Transaction|null>(null);const [deleteId,setDeleteId]=useState<string|null>(null)
  const [eAmt,setEAmt]=useState('');const [eDesc,setEDesc]=useState('');const [eDate,setEDate]=useState('');const [eCat,setECat]=useState('');const [eType,setEType]=useState<'expense'|'income'>('expense');const [eMood,setEMood]=useState('');const [eProj,setEProj]=useState('')

  const [yearMonth,setYearMonth]=useState(getCurrentYearMonth());const [year,month]=yearMonth.split('-').map(Number)
  const {transactions:all,updateTransaction,deleteTransaction}=useTransactions({month:yearMonth})
  const {categories}=useCategories();const {projects}=useProjects();const {settings}=useSettings();const {goals,updateGoal}=useJarGoals()
  const txs=useMemo(()=>projectId?all.filter(t=>t.projectId===projectId):all,[all,projectId])
  const stats=useMemo(()=>getMonthlyStats(txs,yearMonth),[txs,yearMonth])
  const expBrk=useMemo(()=>getCategoryBreakdown(txs,categories,'expense',yearMonth),[txs,categories,yearMonth])
  const incBrk=useMemo(()=>getCategoryBreakdown(txs,categories,'income',yearMonth),[txs,categories,yearMonth])
  const dailyTrend=useMemo(()=>getDailyTrend(txs,14),[txs])
  const flowData=useMemo(()=>dailyTrend.map(d=>({date:d.date.slice(5),收入:d.income,支出:-d.expense,结余:d.income-d.expense})),[dailyTrend])
  const prevStats=useMemo(()=>{const [y,m]=yearMonth.split('-').map(Number);let py=y,pm=m-1;if(pm===0){pm=12;py--};return getMonthlyStats(all,`${py}-${String(pm).padStart(2,'0')}`)},[all,yearMonth])

  const expMoodStats=useMemo(()=>{const m:Record<string,number>={};for(const t of txs){if(!t.mood||t.type!=='expense')continue;m[t.mood]=(m[t.mood]||0)+1};const top=Object.entries(m).sort((a,b)=>b[1]-a[1]);return top.length>0?MOOD_LIST.find(x=>x.value===top[0][0]):undefined},[txs])
  const expMoodData=useMemo(()=>{const m:Record<string,number>={};for(const t of txs){if(!t.mood||t.type!=='expense')continue;m[t.mood]=(m[t.mood]||0)+t.amount};return MOOD_LIST.filter(x=>m[x.value]).map(x=>({name:x.label,value:m[x.value]||0,color:x.color})).sort((a,b)=>b.value-a.value)},[txs])
  const incMoodData=useMemo(()=>{const m:Record<string,number>={};for(const t of txs){if(!t.mood||t.type!=='income')continue;m[t.mood]=(m[t.mood]||0)+t.amount};return MOOD_LIST.filter(x=>m[x.value]).map(x=>({name:x.label,value:m[x.value]||0,color:x.color})).sort((a,b)=>b.value-a.value)},[txs])

  const dom=expMoodStats;const moodKey=dom?.value||'neutral'

  const moodTimeline=useMemo(()=>{const today=new Date();return Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(13-i));const ds=d.toISOString().slice(0,10);const dayTxs=txs.filter(t=>t.date===ds);const lm=dayTxs.filter(t=>t.mood).pop();return{date:ds,label:i===13?'今天':i===12?'昨天':`${d.getMonth()+1}/${d.getDate()}`,moodVal:lm?.mood||null,spent:dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)}})},[txs])

  const filtered=useMemo(()=>{let d=txs;if(filterType!=='all')d=d.filter(t=>t.type===filterType);if(filterMood)d=d.filter(t=>t.mood===filterMood);if(filterCategory)d=d.filter(t=>t.categoryId===filterCategory);if(dateFrom)d=d.filter(t=>t.date>=dateFrom);if(dateTo)d=d.filter(t=>t.date<=dateTo);if(selectedDay)d=d.filter(t=>t.date===selectedDay);if(searchQuery.trim()){const q=searchQuery.toLowerCase();d=d.filter(t=>t.description.toLowerCase().includes(q)||(categories.find(c=>c.id===t.categoryId)?.name||'').toLowerCase().includes(q))};return d},[txs,filterType,filterMood,filterCategory,dateFrom,dateTo,selectedDay,searchQuery,categories])
  const grouped=useMemo(()=>{const g:Record<string,Transaction[]>={};for(const t of filtered)g[t.date]=[...(g[t.date]||[]),t];return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]))},[filtered])
  const calTxs=useMemo(()=>all.filter(t=>t.date.startsWith(calendarMonth)),[all,calendarMonth])
  const todayStr=new Date().toISOString().slice(0,10);const todayBalance=useMemo(()=>{const dt=all.filter(t=>t.date===todayStr);return dt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)-dt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)},[all,todayStr])

  const hEdit=(t:Transaction)=>{setEditing(t);setEAmt(String(t.amount));setEDesc(t.description);setEDate(t.date);setECat(t.categoryId);setEType(t.type);setEMood(t.mood||'');setEProj(t.projectId||'')}
  const hSave=async()=>{if(!editing)return;const a=parseFloat(eAmt);if(!a||a<=0)return;await updateTransaction(editing.id,{amount:a,description:eDesc,date:eDate,categoryId:eCat,type:eType,mood:eMood||undefined,projectId:eProj||undefined});setEditing(null)}
  const hDel=async(id:string)=>{await deleteTransaction(id);setDeleteId(null)}
  const expCats=categories.filter(c=>c.type==='expense');const incCats=categories.filter(c=>c.type==='income');const curCats=eType==='expense'?expCats:incCats

  const hr=new Date().getHours();const greet=hr<6?'夜深了':hr<12?'早上好':hr<18?'下午好':'晚上好'
  const quotes:Record<string,string>={happy:'开心的消费是给自己的礼物',calm:'平静的日子，理性的支出',sad:'难过的日子也要对自己温柔',anxious:'焦虑时停一停，深呼吸',angry:'愤怒时别做决定，先冷静',excited:'兴奋是好事，也别忘了理性',tired:'累了就休息，别用购物犒劳自己',neutral:'记录心情，认识自己'}
  const DomIcon=dom?.Icon

  const incomeChange = prevStats.totalIncome > 0 ? Math.round(((stats.totalIncome - prevStats.totalIncome) / prevStats.totalIncome) * 100) : 0
  const expenseChange = prevStats.totalExpense > 0 ? Math.round(((stats.totalExpense - prevStats.totalExpense) / prevStats.totalExpense) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-5 slide-up pb-safe">
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
          {/* Stats Card — nested quad layout */}
          <div className="card card-stat overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800">
              <div className="p-3 sm:p-4">
                <p className="text-[10px] text-muted mb-0.5">收入</p>
                <p className="text-base sm:text-lg font-bold amount truncate">{formatAmount(stats.totalIncome)}</p>
                {incomeChange!==0&&<p className={`text-[10px] mt-0.5 ${incomeChange>0?'text-emerald-500':'text-red-400'}`}>{incomeChange>0?'+':''}{incomeChange}%</p>}
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-[10px] text-muted mb-0.5">支出</p>
                <p className="text-base sm:text-lg font-bold amount truncate">{formatAmount(stats.totalExpense)}</p>
                {expenseChange!==0&&<p className={`text-[10px] mt-0.5 ${expenseChange>0?'text-red-400':'text-emerald-500'}`}>{expenseChange>0?'+':''}{expenseChange}%</p>}
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-[10px] text-muted mb-0.5">结余</p>
                <p className={`text-base sm:text-lg font-bold amount truncate ${stats.balance<0?'text-red-400':''}`}>{formatAmount(stats.balance)}</p>
                <p className="text-[10px] text-muted mt-0.5">{stats.count}笔</p>
              </div>
              <div className="p-3 sm:p-4 relative">
                <p className="text-[10px] text-muted mb-0.5">今日结余</p>
                <p className={`text-base sm:text-lg font-bold amount truncate ${todayBalance<0?'text-red-400':''}`}>{formatAmount(todayBalance)}</p>
                {todayBalance!==0&&goals.length>0&&<button onClick={()=>setShowSavePopup(true)} className="absolute right-3 bottom-3 text-[9px] bg-[var(--c-primary-soft)] hover:bg-[var(--c-primary-soft)] text-accent rounded-lg px-2 py-1 font-medium">{todayBalance>0?'存入' :'记录'}</button>}
              </div>
            </div>
          </div>

          {/* 2x2 Donut Grid */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-[10px] text-muted px-1">{year}年{month}月</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="card card-chart p-2 sm:p-3"><span className="text-[9px] sm:text-[10px] font-semibold">消费类型</span>
                {expBrk.length>0?<div className="flex flex-col items-center gap-1 mt-1"><div className="w-16 h-16 sm:w-20 sm:h-20 relative"><ResponsiveContainer><RPie><Pie data={expBrk} cx="50%" cy="50%" innerRadius={18} outerRadius={28} paddingAngle={2} dataKey="amount" stroke="#fff" strokeWidth={1}>{expBrk.map((e,i)=><Cell key={e.categoryId} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie></RPie></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[9px] sm:text-[10px] font-bold">{formatAmount(stats.totalExpense)}</span></div></div><div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">{expBrk.slice(0,4).map((item,i)=><span key={item.categoryId} className="text-[8px] text-muted flex items-center gap-0.5"><span className="w-1 h-1 rounded-sm flex-shrink-0" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}}/>{item.categoryName}</span>)}</div></div>:<p className="text-[9px] text-muted py-6">—</p>}
              </div>
              <div className="card card-chart p-2 sm:p-3"><span className="text-[9px] sm:text-[10px] font-semibold">消费心情</span>
                {expMoodData.length>0?<>
                  <div className="flex justify-center mt-1"><div className="w-16 h-16 sm:w-20 sm:h-20"><ResponsiveContainer><RPie><Pie data={expMoodData} cx="50%" cy="50%" innerRadius={0} outerRadius={28} paddingAngle={1} dataKey="value" stroke="#fff" strokeWidth={1}>{expMoodData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></RPie></ResponsiveContainer></div></div>
                  <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 mt-1">{expMoodData.slice(0,4).map(e=><span key={e.name} className="text-[8px] text-muted flex items-center gap-0.5"><span className="w-1 h-1 rounded-sm flex-shrink-0" style={{backgroundColor:e.color}}/>{e.name}</span>)}</div>
                </>:<p className="text-[9px] text-muted py-6">—</p>}
              </div>
              <div className="card card-chart p-2 sm:p-3"><span className="text-[9px] sm:text-[10px] font-semibold">收入类型</span>
                {incBrk.length>0?<div className="flex flex-col items-center gap-1 mt-1"><div className="w-16 h-16 sm:w-20 sm:h-20 relative"><ResponsiveContainer><RPie><Pie data={incBrk} cx="50%" cy="50%" innerRadius={18} outerRadius={28} paddingAngle={2} dataKey="amount" stroke="#fff" strokeWidth={1}>{incBrk.map((e,i)=><Cell key={e.categoryId} fill={CHART_COLORS[(i+5)%CHART_COLORS.length]}/>)}</Pie></RPie></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[9px] sm:text-[10px] font-bold">{formatAmount(stats.totalIncome)}</span></div></div><div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">{incBrk.slice(0,4).map((item,i)=><span key={item.categoryId} className="text-[8px] text-muted flex items-center gap-0.5"><span className="w-1 h-1 rounded-sm flex-shrink-0" style={{backgroundColor:CHART_COLORS[(i+5)%CHART_COLORS.length]}}/>{item.categoryName}</span>)}</div></div>:<p className="text-[9px] text-muted py-6">—</p>}
              </div>
              <div className="card card-chart p-2 sm:p-3"><span className="text-[9px] sm:text-[10px] font-semibold">收入心情</span>
                {incMoodData.length>0?<>
                  <div className="flex justify-center mt-1"><div className="w-16 h-16 sm:w-20 sm:h-20"><ResponsiveContainer><RPie><Pie data={incMoodData} cx="50%" cy="50%" innerRadius={0} outerRadius={28} paddingAngle={1} dataKey="value" stroke="#fff" strokeWidth={1}>{incMoodData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></RPie></ResponsiveContainer></div></div>
                  <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 mt-1">{incMoodData.slice(0,4).map(e=><span key={e.name} className="text-[8px] text-muted flex items-center gap-0.5"><span className="w-1 h-1 rounded-sm flex-shrink-0" style={{backgroundColor:e.color}}/>{e.name}</span>)}</div>
                </>:<p className="text-[9px] text-muted py-6">—</p>}
              </div>
            </div>
          </div>

          {/* 14-Day Flow — dual fill + balance line */}
          <div className="card card-chart overflow-hidden p-2 sm:p-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] sm:text-xs font-semibold">14日收支流</span>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400 rounded"/><span className="text-muted">收入</span></span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-rose-400 rounded"/><span className="text-muted">支出</span></span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-400 rounded"/><span className="text-muted">结余</span></span>
              </div>
            </div>
            <div className="h-24 sm:h-28">
              <ResponsiveContainer>
                <AreaChart data={flowData} margin={{top:4,right:4,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="fIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="fEx" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2}/><stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={1.5} fill="url(#fIn)" dot={false} />
                  <Area type="monotone" dataKey="支出" stroke="#f43f5e" strokeWidth={1.5} fill="url(#fEx)" dot={false} />
                  <Area type="monotone" dataKey="结余" stroke="#f59e0b" strokeWidth={2} fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[9px] text-muted px-1 mt-0.5">
              <span>收 {formatAmount(stats.totalIncome)}</span>
              <span className={stats.balance<0?'text-red-400':''}>余 {formatAmount(stats.balance)}</span>
            </div>
          </div>

          {/* Mood Timeline — compact */}
          <div className="card card-list overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5"><CalendarIcon size={14} strokeWidth={1.8} className="text-accent"/><span className="text-[10px] sm:text-xs font-semibold">心情时间线</span></div>
              <button onClick={()=>setShowCalendar(!showCalendar)} className="text-[10px] text-accent font-medium">{showCalendar?'收起月历':'展开月历'}</button>
            </div>
            <div className="overflow-x-auto scrollbar-hide px-2 py-2">
              <div className="flex gap-2">{moodTimeline.map(d=>{const MI=d.moodVal?MOOD_ICON_MAP[d.moodVal]:null;const color=d.moodVal?MOOD_COLOR_MAP[d.moodVal]:null;return(
                <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0 w-8">
                  <span className="text-[8px] text-gray-400 font-medium">{d.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${d.moodVal?'shadow-sm scale-100':'bg-gray-50 dark:bg-gray-800 scale-90'}`} style={d.moodVal&&color?{backgroundColor:color+'18'}:{}}>
                    {MI?<MI size={14} strokeWidth={1.8} color={color||'#6b7280'}/>:<span className="text-gray-300 text-[9px]">—</span>}
                  </div>
                  {d.spent>0&&<span className="text-[7px] text-gray-400 font-medium amount">¥{Math.round(d.spent)}</span>}
                </div>
              )})}</div>
            </div>
          </div>
          {showCalendar&&<>
            <div className="flex rounded-full border border-gray-200/40 overflow-hidden bg-white/40 backdrop-blur w-fit mx-auto">
              {(['expense','income','balance']as const).map(v=><button key={v} onClick={()=>setCalendarView(v)} className={`px-3 py-1 text-[10px] font-medium transition-all ${calendarView===v?'bg-[var(--c-primary)] text-white shadow-sm':'text-gray-500 hover:bg-white/60'}`}>{v==='expense'?'支出':v==='income'?'收入':'结余'}</button>)}
            </div>
            <CalendarHeatmap transactions={calTxs} yearMonth={calendarMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMonthChange={setCalendarMonth} view={calendarView}/>
            {selectedDay&&(()=>{const dayTx=txs.filter(t=>t.date===selectedDay);const dIn=dayTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const dEx=dayTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);return(
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2"><p className="text-[9px] text-muted">{selectedDay.slice(5)} 收入</p><p className="text-xs font-bold text-emerald-600">{formatAmount(dIn)}</p></div>
                <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-2"><p className="text-[9px] text-muted">{selectedDay.slice(5)} 支出</p><p className="text-xs font-bold text-rose-500">{formatAmount(dEx)}</p></div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-2"><p className="text-[9px] text-muted">{selectedDay.slice(5)} 结余</p><p className={`text-xs font-bold ${dIn-dEx<0?'text-red-400':''}`}>{formatAmount(dIn-dEx)}</p></div>
              </div>
            )})()}
          </>}

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
            {(()=>{const tInc=filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const tExp=filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);return(
              <div className="px-3 py-2 bg-[var(--c-primary-soft)] text-[10px] flex justify-between items-center">
                <span className="text-muted">当前 {filtered.length}笔</span>
                <span className="flex gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400">收{formatAmount(tInc)}</span>
                  <span className="text-rose-500">支{formatAmount(tExp)}</span>
                  <span className={tInc-tExp<0?'text-red-400':''}>余{formatAmount(tInc-tExp)}</span>
                </span>
              </div>
            )})()}
            {grouped.length===0?<div className="text-center py-12 text-gray-400 body-sm">没有找到匹配的记录</div>:grouped.map(([date,items])=>(
              <div key={date}>
                <div className="px-3 py-1.5 bg-gradient-to-r from-gray-50/60 to-transparent dark:from-gray-800/40 text-[10px] font-semibold text-gray-500 flex justify-between">
                  <span>{formatDate(date)}</span>
                  <span className="text-gray-400 font-normal amount">收 ¥{items.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0).toFixed(2)} 支 ¥{items.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0).toFixed(2)}</span>
                </div>
                {items.map(t=>{const MI=t.mood?MOOD_ICON_MAP[t.mood]:null;const color=t.mood?MOOD_COLOR_MAP[t.mood]:null;return(
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors cursor-pointer group border-b border-gray-50/40 dark:border-gray-800/20 last:border-0" onClick={()=>hEdit(t)}>
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

      {showSavePopup&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={()=>setShowSavePopup(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full max-w-xs shadow-2xl p-5" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{todayBalance>0?'存入心愿':'记录亏空'}</h3>
            <p className="text-sm text-muted mb-4">{formatAmount(todayBalance)} 将转入所选心愿</p>
            <div className="space-y-2 mb-4">
              {goals.map(g=>(
                <button key={g.id} onClick={()=>setSaveGoalId(g.id)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${saveGoalId===g.id?'border-[var(--c-primary)] bg-[var(--c-primary-soft)]':'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{background:g.color}}>{g.name.charAt(0)}</div>
                    <div><p className="text-sm font-medium">{g.name}</p><p className="text-[10px] text-muted">{formatAmount(g.currentAmount)} / {formatAmount(g.targetAmount)}</p></div>
                  </div>
                  {saveGoalId===g.id&&<Check size={16} className="text-accent"/>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowSavePopup(false)} className="btn btn-secondary flex-1 text-sm">取消</button>
              <button onClick={async()=>{if(!saveGoalId)return;const g=goals.find(x=>x.id===saveGoalId);if(!g)return;await updateGoal(saveGoalId,{currentAmount:g.currentAmount+Math.max(0,todayBalance)});setShowSavePopup(false);setSaveGoalId('')}} disabled={!saveGoalId} className="btn btn-primary flex-1 text-sm">{todayBalance>0?'确认存入':'确认记录'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
