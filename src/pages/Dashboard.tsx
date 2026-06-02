export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '本月收入', value: '¥0.00', color: 'text-green-600' },
          { label: '本月支出', value: '¥0.00', color: 'text-red-600' },
          { label: '本月结余', value: '¥0.00', color: 'text-blue-600' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold mb-4">最近交易</h2>
        <div className="text-center text-gray-400 py-8">
          <p className="text-4xl mb-2">📝</p>
          <p>还没有交易记录</p>
          <p className="text-sm mt-1">点击右上角"记账"开始记录吧</p>
        </div>
      </div>
    </div>
  )
}
