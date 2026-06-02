import { useState } from 'react'
import { useSettings } from '@/db/hooks'
import { encryptApiKey } from '@/lib/crypto'

export default function Settings() {
  const { settings, updateSettings } = useSettings()
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(settings?.apiBaseUrl || 'https://api.deepseek.com/v1')
  const [model, setModel] = useState(settings?.model || 'deepseek-chat')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold mb-4">API 配置</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {settings?.apiKey && !apiKey && (
              <p className="text-xs text-gray-400 mt-1">已配置（输入新 Key 将覆盖）</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold mb-4">数据管理</h2>
        <div className="space-y-3">
          <button className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            导出数据 (JSON)
          </button>
          <button className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            导入数据
          </button>
        </div>
      </div>
    </div>
  )
}
