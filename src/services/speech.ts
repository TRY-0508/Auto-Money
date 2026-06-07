let recognition: SpeechRecognition | null = null
let _manualStop = false

export function isSpeechSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startRecognition(onResult: (text: string) => void, onError: (error: string) => void, onEnd?: () => void): void {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    onError('您的浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari')
    return
  }

  if (!navigator.onLine) {
    onError('语音识别需要网络连接，请检查网络后重试')
    return
  }

  if (recognition) { _manualStop = true; recognition.stop(); recognition = null }

  _manualStop = false
  const rec = new SpeechRecognition()
  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = true
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
    // Manual stop or browser-initiated abort — don't show error
    if (_manualStop || event.error === 'aborted') {
      recognition = null
      onEnd?.()
      return
    }
    const map: Record<string, string> = {
      'no-speech': '未检测到语音，请靠近麦克风再试一次',
      'not-allowed': '麦克风权限被拒绝。请在浏览器设置中允许麦克风访问',
      'network': '语音识别需要网络连接，请检查网络后重试',
      'service-not-allowed': '语音服务不可用，请确保使用 HTTPS 并检查网络',
      'audio-capture': '未检测到麦克风设备',
      'bad-grammar': '语音识别语法错误',
      'language-not-supported': '当前浏览器不支持中文语音识别',
    }
    const msg = map[event.error]
    if (msg) onError(msg)
    recognition = null
    onEnd?.()
  }

  rec.onend = () => { recognition = null; onEnd?.() }

  recognition = rec
  rec.start()
}

export function stopRecognition() {
  if (recognition) {
    _manualStop = true
    recognition.stop()
    recognition = null
  }
}
