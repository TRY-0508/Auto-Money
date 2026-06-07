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
    onError('请先在设置中配置百度语音 Key')
    return
  }

  _onResult = onResult; _onEnd = onEnd; _onError = onError

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime })
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (audioChunks.length === 0) { _onEnd?.(); return }

      let text = ''
      try {
        const blob = new Blob(audioChunks, { type: mime })
        text = await recognize(blob, settings)
      } catch (err: any) {
        _onError?.(err.message || '识别失败')
      }

      if (text) _onResult?.(text)
      _onEnd?.()
    }

    mediaRecorder.start()
  } catch (err: any) {
    if (err.name === 'NotAllowedError') onError('麦克风权限被拒绝')
    else onError('无法启动录音')
    onEnd()
  }
}

export function stopRecognition() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

// ── Recognition ──

async function recognize(blob: Blob, settings: any): Promise<string> {
  const token = await getBaiduToken(settings.speechApiKey, settings.speechSecretKey)

  // Decode to PCM 16kHz mono
  const pcm = await blobToPCM(blob)
  const base64 = arrayBufferToBase64(pcm)

  const body = JSON.stringify({
    format: 'pcm',
    rate: 16000,
    channel: 1,
    cuid: 'moodmoney',
    token,
    speech: base64,
    len: pcm.byteLength,
  })

  const apiUrl = 'https://vop.baidu.com/server_api'

  // Try direct, fallback to CORS proxy
  let resp: Response | null = null
  try {
    resp = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  } catch {}
  if (!resp || !resp.ok) {
    resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body,
    })
  }

  const data = await resp!.json()
  if (data.err_no !== 0) throw new Error(data.err_msg || '识别失败')
  return data.result?.[0] || ''
}

// ── Audio conversion ──

async function blobToPCM(blob: Blob): Promise<ArrayBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, 16000)
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

// ── Baidu Auth ──

async function getBaiduToken(apiKey: string, secretKey: string): Promise<string> {
  const cacheKey = 'baidu_speech_token'
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const { token, expires } = JSON.parse(cached)
      if (Date.now() < expires) return token
    } catch {}
  }

  const params = `grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const url = `https://aip.baidubce.com/oauth/2.0/token?${params}`

  let resp: Response | null = null
  try { resp = await fetch(url) } catch {}
  if (!resp || !resp.ok) {
    resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
  }

  const data = await resp!.json()
  if (!data.access_token) throw new Error('鉴权失败，请检查 Key')

  localStorage.setItem(cacheKey, JSON.stringify({
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 3600) * 1000,
  }))
  return data.access_token
}
