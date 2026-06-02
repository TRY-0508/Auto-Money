let recognition: SpeechRecognition | null = null

export function isSpeechSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startRecognition(onResult: (text: string) => void, onError: (error: string) => void, onEnd?: () => void): void {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    onError('浏览器不支持语音识别，请使用 Chrome 或 Edge')
    return
  }

  if (recognition) {
    recognition.stop()
  }

  const rec = new SpeechRecognition()
  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = ''
    let interimTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        finalTranscript += result[0].transcript
      } else {
        interimTranscript += result[0].transcript
      }
    }

    const text = finalTranscript || interimTranscript
    if (text.trim()) {
      onResult(text)
    }
  }

  rec.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      onError('未检测到语音，请再试一次')
    } else if (event.error === 'aborted') {
      // User stopped intentionally, not an error
    } else if (event.error === 'not-allowed') {
      onError('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问')
    } else if (event.error === 'network') {
      onError('网络错误，语音识别需要网络连接')
    } else {
      onError(`语音识别错误: ${event.error}`)
    }
    recognition = null
    onEnd?.()
  }

  rec.onend = () => {
    recognition = null
    onEnd?.()
  }

  recognition = rec
  rec.start()
}

export function stopRecognition() {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
}
