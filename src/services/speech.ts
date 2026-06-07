let rec: any = null

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

  rec.onresult = (e: any) => {
    let text = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript
    }
    if (text.trim()) onResult(text)
  }

  rec.onerror = (e: any) => {
    if (e.error === 'aborted' || e.error === 'no-speech') return
    const msgs: Record<string, string> = {
      'not-allowed': '麦克风权限被拒绝',
      'network': '网络连接失败',
      'audio-capture': '未检测到麦克风',
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
