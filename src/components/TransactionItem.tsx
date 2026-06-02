import { useCategories } from '@/db/hooks'
import { formatAmount } from '@/lib/utils'
import CategoryIcon from './CategoryIcon'
import type { Transaction } from '@/types'

interface TransactionItemProps {
  transaction: Transaction
  onDelete: (id: string) => void
  onEdit: (t: Transaction) => void
}

export default function TransactionItem({ transaction, onDelete, onEdit }: TransactionItemProps) {
  const { categories } = useCategories()
  const cat = categories.find((c) => c.id === transaction.categoryId)
  const isExpense = transaction.type === 'expense'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
      onClick={() => onEdit(transaction)}
    >
      <CategoryIcon categoryId={transaction.categoryId} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {cat?.name || '未分类'}
        </p>
        {transaction.description && (
          <p className="text-xs text-gray-400 truncate">{transaction.description}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
          {isExpense ? '-' : '+'}{formatAmount(transaction.amount)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(transaction.id)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
