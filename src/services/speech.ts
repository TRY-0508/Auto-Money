let rec: any = null
let _startTime = 0

export function isSpeechSupported(): boolean {
  try {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    return !!Ctor
  } catch { return false }
}

export function startRecognition(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError: (msg: string) => void
) {
  stopRecognition()

  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) { onError('浏览器不支持语音识别'); return }

  try {
    rec = new Ctor()
  } catch {
    onError('无法创建语音识别实例'); return
  }

  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = true
  _startTime = Date.now()

  rec.onresult = (e: any) => {
    let text = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript
    }
    if (text.trim()) onResult(text)
  }

  rec.onerror = (e: any) => {
    const elapsed = Date.now() - _startTime
    if (e.error === 'no-speech') return
    if (e.error === 'aborted') {
      if (elapsed < 2000) {
        onError('语音服务连接失败。国内网络可能无法访问 Google 语音服务，请使用代理或切换浏览器')
      }
      return
    }
    const msgs: Record<string, string> = {
      'not-allowed': '麦克风权限被拒绝',
      'network': '语音服务连接失败，请检查网络或使用代理',
    }
    onError(msgs[e.error] || `识别出错: ${e.error}`)
  }

  rec.onend = () => {
    rec = null
    onEnd()
  }

  setTimeout(() => {
    try { rec?.start() } catch { onError('识别启动失败'); onEnd() }
  }, 200)
}

export function stopRecognition() {
  if (rec) {
    try { rec.stop() } catch {}
    rec = null
  }
}
