let recognition: SpeechRecognition | null = null

export function isSpeechSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startRecognition(lang = 'zh-CN'): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      reject(new Error('浏览器不支持语音识别'))
      return
    }

    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.interimResults = false
    rec.continuous = false

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      resolve(transcript)
    }

    rec.onerror = (event: any) => {
      reject(new Error(`语音识别失败: ${event.error}`))
    }

    rec.onend = () => {
      recognition = null
    }

    recognition = rec
    rec.start()
  })
}

export function stopRecognition() {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
}
