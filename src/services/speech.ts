let recognition: SpeechRecognition | null = null
let _manualStop = false

export function isSpeechSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startRecognition(onResult: (text: string) => void, onError: (error: string) => void, onEnd?: () => void): void {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    onError('您的浏览器不支持语音识别')
    return
  }

  if (!navigator.onLine) {
    onError('语音识别需要网络连接')
    return
  }

  if (recognition) {
    _manualStop = true
    recognition.stop()
    recognition = null
  }

  _manualStop = false
  const rec = new SpeechRecognition()
  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let final = ''; let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript
    }
    const text = final || interim
    if (text.trim()) onResult(text)
  }

  rec.onerror = (event: any) => {
    recognition = null
    if (_manualStop || event.error === 'aborted' || event.error === 'no-speech') {
      onEnd?.()
      return
    }
    const map: Record<string, string> = {
      'not-allowed': '麦克风权限被拒绝',
      'network': '语音识别需要网络连接',
      'service-not-allowed': '语音服务不可用',
      'audio-capture': '未检测到麦克风',
      'language-not-supported': '不支持中文语音识别',
    }
    const msg = map[event.error]
    if (msg) onError(msg)
    recognition = null
    onEnd?.()
  }

  rec.onend = () => {
    recognition = null
    onEnd?.()
  }

  recognition = rec
  try {
    rec.start()
  } catch (err: any) {
    recognition = null
    onError('语音识别启动失败，请使用 Chrome 浏览器')
    onEnd?.()
  }
}

export function stopRecognition() {
  if (recognition) {
    _manualStop = true
    recognition.stop()
    recognition = null
  }
}
