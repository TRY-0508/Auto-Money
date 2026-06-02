export default function AddTransaction() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold mb-4">添加记录</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">支出</button>
            <button className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
              收入
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">描述</label>
            <input
              type="text"
              placeholder="比如：中午吃面花了15块"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-400 text-center">AI 解析功能将在配置 API Key 后启用</p>
        </div>
      </div>
    </div>
  )
}
