import { useState, useMemo, useEffect, useRef } from 'react'
import { useTransactions, useCategories, useProjects, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import { MOOD_LIST, MOOD_ICON_MAP, MOOD_COLOR_MAP, CATEGORY_ICON_MAP, MoreHorizontal, BarChart3, Trash2, PieChart, List, Calendar as CalendarIcon } from '@/lib/icons'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import AddModal from '@/components/AddModal'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import type { Transaction } from '@/types'
import { PieChart as RPie, Pie, Cell, ResponsiveContainer } from 'recharts'

const BANNER: Record<string, string> = { happy:'banner-happy',calm:'banner-calm',neutral:'banner-neutral',sad:'banner-sad',anxious:'banner-anxious',angry:'banner-angry',excited:'banner-excited',tired:'banner-tired' }
const PAGE: Record<string, string> = { happy:'page-happy',calm:'page-calm',neutral:'page-neutral',sad:'page-sad',anxious:'page-anxious',angry:'page-angry',excited:'page-excited',tired:'page-tired' }
type FilterType = 'all'|'expense'|'income'

function CalendarHeatmap({ transactions, yearMonth, selectedDay, onSelectDay, onMonthChange }: { transactions: Transaction[]; yearMonth: string; selectedDay: string|null; onSelectDay:(d:string|null)=>void; onMonthChange:(ym:string)=>void }) {
  const [y,m]=yearMonth.split('-').map(Number); const dim=new Date(y,m,0).getDate(); const fd=new Date(y,m-1,1).getDay(); const today=new Date().toISOString().slice(0,10)
  const dt=useMemo(()=>{const mp:Record<string,number>={};for(const t of transactions){if(t.type==='expense')mp[t.date]=(mp[t.date]||0)+t.amount}return mp},[transactions])
  const mx=Math.max(...Object.values(dt),1);const wks:(number|null)[][]=[];let wk:(number|null)[]=[]
  for(let i=0;i<fd;i++)wk.push(null);for(let d=1;d<=dim;d++){wk.push(d);if(wk.length===7){wks.push(wk);wk=[]}};if(wk.length>0){while(wk.length<7)wk.push(null);wks.push(wk)}
  const cl=(day:number|null,ds:string)=>{if(day===null)return'';const t=dt[ds]||0;if(t===0)return'bg-gray-100 dark:bg-gray-800 text-gray-400';const r=t/mx;if(r>.66)return'bg-red-400/80 dark:bg-red-600/80 text-white';if(r>.33)return'bg-orange-300/80 dark:bg-orange-600/80 text-white';return'bg-yellow-200/80 dark:bg-yellow-700/80 text-gray-700'}
  const pv=()=>{let ny=y,nm=m-1;if(nm===0){nm=12;ny--};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)};const nx=()=>{let ny=y,nm=m+1;if(nm===13){nm=1;ny++};onMonthChange(`${ny}-${String(nm).padStart(2,'0')}`)}
  const tr=useRef(0)
  return (
    <div className="card p-4" onTouchStart={e=>{tr.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=tr.current-e.changedTouches[0].clientX;if(Math.abs(d)>60)d>0?nx():pv()}}>
      <div className="flex items-center justify-between mb-2"><button onClick={pv} className="p-1 text-gray-400 hover:text-violet-500 text-lg">‹</button><h3 className="text-sm font-semibold">月历</h3><button onClick={nx} className="p-1 text-gray-400 hover:text-violet-500 text-lg">›</button></div>
      <div className="grid grid-cols-7 gap-1 mb-1">{['日','一','二','三','四','五','六'].map(d=><div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>)}</div>
      {wks.map((w,wi)=>(
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((day,di)=>{
            if(day===null)return<div key={di}/>
            const ds=`${yearMonth}-${String(day).padStart(2,'0')}`
            const sel=selectedDay===ds
            const c=cl(day,ds)
            const ring=sel?'ring-2 ring-violet-500 ring-offset-2 scale-110':'hover:scale-105'
            const tRing=ds===today&&!sel?'ring-1 ring-violet-400/50':''
            return<button key={di} onClick={()=>onSelectDay(sel?null:ds)} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${c} ${ring} ${tRing}`}>{day}</button>
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-400"><span>少</span><div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"/><div className="w-3 h-3 rounded-sm bg-yellow-200/80 dark:bg-yellow-700/80"/><div className="w-3 h-3 rounded-sm bg-orange-300/80 dark:bg-orange-600/80"/><div className="w-3 h-3 rounded-sm bg-red-400/80 dark:bg-red-600/80"/><span>多</span>{selectedDay&&<button onClick={()=>onSelectDay(null)} className="ml-auto text-violet-500 font-medium">清除</button>}</div>
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
  const {categories}=useCategories();const {projects}=useProjects();const {budgets}=useBudgets()
  const txs=useMemo(()=>projectId?all.filter(t=>t.projectId===projectId):all,[all,projectId])
  const stats=useMemo(()=>getMonthlyStats(txs,yearMonth),[txs,yearMonth])
  const expBrk=useMemo(()=>getCategoryBreakdown(txs,categories,'expense',yearMonth),[txs,categories,yearMonth])

  const moodStats=useMemo(()=>{const m:Record<string,{count:number;totalSpent:number}>={};for(const t of txs){if(!t.mood||t.type!=='expense')continue;if(!m[t.mood])m[t.mood]={count:0,totalSpent:0};m[t.mood].count++;m[t.mood].totalSpent+=t.amount};return MOOD_LIST.filter(x=>m[x.value]).map(x=>({...x,...m[x.value]})).sort((a,b)=>b.count-a.count)},[txs])
  const dom=moodStats[0];const moodKey=dom?.value||'neutral'

  const budgetItems=useMemo(()=>{const r:{cat:any;spent:number;pct:number}[]=[];for(const c of categories.filter(c=>c.type==='expense')){const b=budgets.find(x=>x.categoryId===c.id&&x.yearMonth===yearMonth);if(!b)continue;r.push({cat:c,spent:txs.filter(t=>t.categoryId===c.id&&t.type==='expense').reduce((s,t)=>s+t.amount,0),pct:Math.round((txs.filter(t=>t.categoryId===c.id&&t.type==='expense').reduce((s,t)=>s+t.amount,0)/b.amount)*100)})};return r},[categories,budgets,yearMonth,txs])

  const moodTimeline=useMemo(()=>{const today=new Date();return Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(13-i));const ds=d.toISOString().slice(0,10);const dayTxs=txs.filter(t=>t.date===ds);const lm=dayTxs.filter(t=>t.mood).pop();return{date:ds,label:i===13?'今天':i===12?'昨天':`${d.getMonth()+1}/${d.getDate()}`,moodVal:lm?.mood||null,spent:dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)}})},[txs])

  const filtered=useMemo(()=>{let d=txs;if(filterType!=='all')d=d.filter(t=>t.type===filterType);if(filterMood)d=d.filter(t=>t.mood===filterMood);if(filterCategory)d=d.filter(t=>t.categoryId===filterCategory);if(dateFrom)d=d.filter(t=>t.date>=dateFrom);if(dateTo)d=d.filter(t=>t.date<=dateTo);if(selectedDay)d=d.filter(t=>t.date===selectedDay);if(searchQuery.trim()){const q=searchQuery.toLowerCase();d=d.filter(t=>t.description.toLowerCase().includes(q)||(categories.find(c=>c.id===t.categoryId)?.name||'').toLowerCase().includes(q))};return d},[txs,filterType,filterMood,filterCategory,dateFrom,dateTo,selectedDay,searchQuery,categories])
  const grouped=useMemo(()=>{const g:Record<string,Transaction[]>={};for(const t of filtered)g[t.date]=[...(g[t.date]||[]),t];return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]))},[filtered])
  const calTxs=useMemo(()=>all.filter(t=>t.date.startsWith(calendarMonth)),[all,calendarMonth])

  const hEdit=(t:Transaction)=>{setEditing(t);setEAmt(String(t.amount));setEDesc(t.description);setEDate(t.date);setECat(t.categoryId);setEType(t.type);setEMood(t.mood||'');setEProj(t.projectId||'')}
  const hSave=async()=>{if(!editing)return;const a=parseFloat(eAmt);if(!a||a<=0)return;await updateTransaction(editing.id,{amount:a,description:eDesc,date:eDate,categoryId:eCat,type:eType,mood:eMood||undefined,projectId:eProj||undefined});setEditing(null)}
  const hDel=async(id:string)=>{await deleteTransaction(id);setDeleteId(null)}
  const expCats=categories.filter(c=>c.type==='expense');const incCats=categories.filter(c=>c.type==='income');const curCats=eType==='expense'?expCats:incCats

  const hr=new Date().getHours();const greet=hr<6?'夜深了':hr<12?'早上好':hr<18?'下午好':'晚上好'
  const quotes:Record<string,string>={happy:'开心的消费是给自己的礼物',calm:'平静的日子，理性的支出',sad:'难过的日子也要对自己温柔',anxious:'焦虑时停一停，深呼吸',angry:'愤怒时别做决定，先冷静',excited:'兴奋是好事，也别忘了理性',tired:'累了就休息，别用购物犒劳自己',neutral:'记录心情，认识自己'}
  useEffect(()=>{document.body.className=PAGE[moodKey]||PAGE.neutral;return()=>{document.body.className=''}},[moodKey])
  const DomIcon=dom?.Icon

  return (
    <div className="max-w-4xl mx-auto space-y-4 slide-up pb-24 md:pb-6">
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId}/>

      <select value={yearMonth} onChange={e=>setYearMonth(e.target.value)} className="card px-4 py-2 text-sm font-semibold focus:outline-none cursor-pointer w-auto">
        {(()=>{const o:{v:string;l:string}[]=[];const n=new Date();for(let i=0;i<12;i++){const d=new Date(n.getFullYear(),n.getMonth()-i,1);o.push({v:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,l:`${d.getFullYear()}年${d.getMonth()+1}月`})}return o})().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      <div className={`rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden ${BANNER[moodKey]||BANNER.neutral}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.1),transparent_40%)]"/>
        <div className="absolute inset-0 dot-pattern"/>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{greet}</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">心情收支簿</p>
              <p className="text-white/60 text-xs mt-2 italic">{quotes[moodKey]||quotes.neutral}</p>
            </div>
            {DomIcon&&<div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 bounce-in"><DomIcon size={44} strokeWidth={1.5} className="text-white drop-shadow-lg"/></div>}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[{l:'收入',v:formatAmount(stats.totalIncome)},{l:'支出',v:formatAmount(stats.totalExpense)},{l:'结余',v:formatAmount(stats.balance)}].map(c=><div key={c.l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center"><p className="text-white/60 text-xs">{c.l}</p><p className="text-base sm:text-lg font-bold mt-1">{c.v}</p></div>)}
          </div>
        </div>
      </div>

      {txs.length===0?(
        <div className="card p-10 text-center">
          <EmptyState icon={<BarChart3 size={48} strokeWidth={1.2} className="text-violet-400"/>} title="开始认识自己" description="记下第一笔账，同步记录心情" action={{label:'记一笔',onClick:()=>setShowAdd(true)}}/>
        </div>
      ):(
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card card-hover">
              <div className="card-header"><PieChart size={18} strokeWidth={1.8} className="text-violet-500"/>心情统计</div>
              <div className="card-body">
                {moodStats.length>0?(
                  <div className="space-y-3">{moodStats.map(m=>{const MI=m.Icon;const color=MOOD_COLOR_MAP[m.value]||'#6b7280';return(
                    <div key={m.value} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{backgroundColor:color+'18'}}><MI size={20} strokeWidth={1.8} color={color}/></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1"><span className="font-semibold">{m.label}</span><span className="text-xs text-gray-400">{m.count}次 {formatAmount(m.totalSpent)}</span></div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min((m.totalSpent/moodStats[0].totalSpent)*100,100)}%`,backgroundColor:color}}/></div>
                      </div>
                    </div>
                  )})}</div>
                ):<p className="body-sm text-gray-400 text-center py-6">记账时选心情，这里就会出现统计</p>}
              </div>
            </div>

            <div className="card card-hover">
              <div className="card-header"><List size={18} strokeWidth={1.8} className="text-violet-500"/>支出分类</div>
              <div className="card-body">
                {expBrk.length>0?(
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-28"><ResponsiveContainer><RPie><Pie data={expBrk} cx="50%" cy="50%" innerRadius={26} outerRadius={46} paddingAngle={3} dataKey="amount">{expBrk.map(e=><Cell key={e.categoryId} fill={e.categoryColor} strokeWidth={0}/>)}</Pie></RPie></ResponsiveContainer></div>
                    <div className="flex-1 space-y-2">{expBrk.slice(0,5).map(item=><div key={item.categoryId} className="flex items-center gap-2 text-xs"><CategoryIcon categoryId={item.categoryId} size={14}/><span className="flex-1 font-medium truncate">{item.categoryName}</span><span className="text-gray-400 amount">{item.percentage}%</span></div>)}</div>
                  </div>
                ):<p className="body-sm text-gray-400 text-center py-6">暂无支出</p>}
              </div>
            </div>
          </div>

          {budgetItems.length>0&&(
            <div className="card card-hover">
              <div className="card-header">分类预算</div>
              <div className="card-body space-y-3">
                {budgetItems.map(({cat,spent,pct})=>(
                  <div key={cat.id} className="flex items-center gap-3">
                    <CategoryIcon categoryId={cat.id} size={16}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1"><span className="font-semibold">{cat.name}</span><span className="text-xs text-gray-400 amount">{formatAmount(spent)}</span></div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${pct>100?'bg-red-400':pct>80?'bg-amber-400':'bg-emerald-400'}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                    </div>
                    <span className={`text-xs font-bold w-10 text-right amount ${pct>100?'text-red-500':pct>80?'text-amber-500':'text-emerald-500'}`}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card card-hover overflow-hidden">
            <div className="card-header"><CalendarIcon size={18} strokeWidth={1.8} className="text-violet-500"/>心情时间线</div>
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

          <button onClick={()=>setShowCalendar(!showCalendar)} className="text-xs font-medium text-violet-500 hover:text-violet-600 w-full text-center">{showCalendar?'收起月历 ▲':'展开月历 ▼'}</button>
          {showCalendar&&<CalendarHeatmap transactions={calTxs} yearMonth={calendarMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMonthChange={setCalendarMonth}/>}

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-full border border-gray-200/40 overflow-hidden bg-white/40 backdrop-blur">
              {(['all','expense','income']as FilterType[]).map(t=><button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium transition-all ${filterType===t?'bg-violet-500 text-white shadow-sm':'text-gray-500 hover:bg-white/60'}`}>{t==='all'?'全部':t==='expense'?'支出':'收入'}</button>)}
            </div>
            <select value={filterMood} onChange={e=>setFilterMood(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部心情</option>{MOOD_LIST.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部分类</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs"/>
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs"/>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="搜索" className="input flex-1 min-w-[80px] !py-1.5 !px-3 !rounded-full !text-xs"/>
          </div>

          <div className="card overflow-hidden">
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
                    <button onClick={e=>{e.stopPropagation();setDeleteId(t.id)}} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"><Trash2 size={14}/></button>
                  </div>
                )})}
              </div>
            ))}
          </div>
        </>
      )}

      {editing&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={()=>setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 tracking-tight">编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">{['expense','income'].map(t=><button key={t} onClick={()=>setEType(t as any)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${eType===t?(t==='expense'?'bg-red-400 text-white shadow-sm':'bg-emerald-400 text-white shadow-sm'):'text-gray-500'}`}>{t==='expense'?'支出':'收入'}</button>)}</div>
              <input type="number" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" className="input input-lg"/>
              <div className="grid grid-cols-4 gap-2">{curCats.map(c=>{const Icon=CATEGORY_ICON_MAP[c.icon]||MoreHorizontal;return<button key={c.id} onClick={()=>setECat(c.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${eCat===c.id?'bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-400 scale-105 shadow-sm':'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><Icon size={20} strokeWidth={1.8} className={eCat===c.id?'text-violet-500':'text-gray-400'}/><span className="font-medium">{c.name}</span></button>})}</div>
              <input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} className="input"/>
              <input type="text" value={eDesc} onChange={e=>setEDesc(e.target.value)} placeholder="备注" className="input"/>
              <div><p className="label mb-2">心情</p><div className="flex flex-wrap gap-1.5">{MOOD_LIST.map(m=>{const MI=m.Icon;return<button key={m.value} onClick={()=>setEMood(eMood===m.value?'':m.value)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all ${eMood===m.value?'bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-400 scale-105 shadow-sm':'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><MI size={15} strokeWidth={1.8}/><span>{m.label}</span></button>})}</div></div>
              {projects.length>0&&<select value={eProj} onChange={e=>setEProj(e.target.value)} className="input"><option value="">分账单（可选）</option>{projects.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select>}
              <div className="flex gap-2 pt-1"><button onClick={()=>setEditing(null)} className="btn btn-secondary flex-1">取消</button><button onClick={hSave} className="btn btn-primary flex-1">保存</button></div>
            </div>
          </div>
        </div>
      )}

      {deleteId&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={()=>setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center" onClick={e=>e.stopPropagation()}>
            <p className="font-bold text-lg tracking-tight">确认删除</p><p className="text-gray-400 text-sm mt-1 mb-6">删除后无法恢复</p>
            <div className="flex gap-2"><button onClick={()=>setDeleteId(null)} className="btn btn-secondary flex-1">取消</button><button onClick={()=>hDel(deleteId)} className="btn btn-danger flex-1">删除</button></div>
          </div>
        </div>
      )}

      <button onClick={()=>setShowAdd(true)} className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl shadow-2xl shadow-violet-500/30 halo-pulse flex items-center justify-center text-2xl z-40 hover:scale-110 active:scale-95 transition-all duration-200 font-light">+</button>
      <AddModal open={showAdd} onClose={()=>setShowAdd(false)}/>
    </div>
  )
}
