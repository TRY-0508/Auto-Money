import { db } from '@/db'

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let _onResult: ((text: string) => void) | null = null
let _onEnd: (() => void) | null = null
let _onError: ((msg: string) => void) | null = null

export function isSpeechSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export async function startRecognition(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError: (msg: string) => void
) {
  stopRecognition()

  const settings = await db.settings.get('default')
  if (!settings?.speechApiKey || !settings?.speechSecretKey) {
    onError('请先在设置中配置百度语音 API Key 和 Secret Key')
    return
  }
  if (settings.speechProvider !== 'baidu') {
    onError('请先在设置中将语音提供商设为「百度语音」')
    return
  }

  _onResult = onResult; _onEnd = onEnd; _onError = onError

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (audioChunks.length === 0) { _onEnd?.(); return }

      try {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        const pcm = await blobToPCM(blob)
        const text = await baiduRecognize(pcm, settings)
        if (text) _onResult?.(text)
      } catch (err: any) {
        _onError?.(err.message || '识别失败')
      }
      _onEnd?.()
    }

    mediaRecorder.start()
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      onError('麦克风权限被拒绝')
    } else {
      onError('无法启动录音: ' + (err.message || ''))
    }
    onEnd()
  }
}

export function stopRecognition() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

// ── Audio conversion ──

async function blobToPCM(blob: Blob): Promise<ArrayBuffer> {
  const ctx = new OfflineAudioContext(1, 1, 16000)
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

  const offline = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 16000), 16000)
  const source = offline.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  const channel = rendered.getChannelData(0)
  const pcm = new Int16Array(channel.length)
  for (let i = 0; i < channel.length; i++) {
    const s = Math.max(-1, Math.min(1, channel[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return pcm.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// ── Baidu API ──

async function getBaiduToken(apiKey: string, secretKey: string): Promise<string> {
  const cacheKey = 'baidu_speech_token'
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const { token, expires } = JSON.parse(cached)
      if (Date.now() < expires) return token
    } catch {}
  }

  const resp = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  )
  const data = await resp.json()
  if (!data.access_token) throw new Error('百度鉴权失败: ' + (data.error_description || ''))

  localStorage.setItem(cacheKey, JSON.stringify({
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 3600) * 1000,
  }))
  return data.access_token
}

async function baiduRecognize(pcm: ArrayBuffer, settings: any): Promise<string> {
  const token = await getBaiduToken(settings.speechApiKey, settings.speechSecretKey)
  const speech = arrayBufferToBase64(pcm)

  const resp = await fetch('https://vop.baidu.com/server_api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'pcm',
      rate: 16000,
      channel: 1,
      cuid: 'moodmoney_app',
      token,
      speech,
      len: pcm.byteLength,
    }),
  })

  const data = await resp.json()
  if (data.err_no !== 0) throw new Error(data.err_msg || '识别失败')
  return data.result?.[0] || ''
}
