import { db } from '@/db'

let ws: WebSocket | null = null
let _onResult: ((text: string) => void) | null = null
let _onEnd: (() => void) | null = null
let _onError: ((msg: string) => void) | null = null
let _stream: MediaStream | null = null
let _audioCtx: AudioContext | null = null
let _processor: ScriptProcessorNode | null = null
let _source: MediaStreamAudioSourceNode | null = null

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

  _onResult = onResult; _onEnd = onEnd; _onError = onError

  try {
    // 1. Get Baidu token
    const token = await getBaiduToken(settings.speechApiKey, settings.speechSecretKey)

    // 2. Open WebSocket
    ws = new WebSocket('wss://vop.baidu.com/realtime_asr')

    ws.onopen = () => {
      // Send start frame
      ws!.send(JSON.stringify({
        type: 'START',
        data: {
          format: 'pcm',
          rate: 16000,
          bits: 16,
          channel: 1,
          cuid: 'moodmoney',
          dev_pid: 1537, // Mandarin
          token,
        },
      }))

      // Start capturing audio
      startAudioCapture()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'FIN_TEXT' || msg.type === 'PARTIAL_TEXT') {
          const text = msg.result || msg.data?.result?.text || ''
          if (text.trim()) _onResult?.(text)
        }
        if (msg.type === 'FINISHED') {
          cleanup()
          _onEnd?.()
        }
        if (msg.err_no && msg.err_no !== 0) {
          cleanup()
          _onError?.(msg.err_msg || '识别失败')
        }
      } catch {}
    }

    ws.onerror = () => {
      cleanup()
      _onError?.('WebSocket 连接失败')
    }

    ws.onclose = () => {
      cleanup()
      _onEnd?.()
    }
  } catch (err: any) {
    cleanup()
    _onError?.(err.message || '启动失败')
    _onEnd?.()
  }
}

async function startAudioCapture() {
  try {
    _stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } })
    _audioCtx = new AudioContext({ sampleRate: 16000 })
    _source = _audioCtx.createMediaStreamSource(_stream)

    // Use ScriptProcessor for PCM capture
    _processor = _audioCtx.createScriptProcessor(4096, 1, 1)
    _processor.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      const input = e.inputBuffer.getChannelData(0)
      const pcm = new Int16Array(input.length)
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      ws.send(pcm.buffer)
    }
    _source.connect(_processor)
    _processor.connect(_audioCtx.destination)
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      _onError?.('麦克风权限被拒绝')
    } else {
      _onError?.('无法启动录音')
    }
    cleanup()
    _onEnd?.()
  }
}

function cleanup() {
  try { _processor?.disconnect() } catch {}
  try { _source?.disconnect() } catch {}
  try { _audioCtx?.close() } catch {}
  _stream?.getTracks().forEach(t => t.stop())
  _stream = null; _audioCtx = null; _processor = null; _source = null
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'FINISH' })) } catch {}
  }
}

export function stopRecognition() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'FINISH' })) } catch {}
  }
  cleanup()
  ws = null
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

  // Try direct first
  try { resp = await fetch(url) } catch {}

  // Fallback: CORS proxy
  if (!resp || !resp.ok) {
    try {
      resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
    } catch (err: any) {
      throw new Error('无法连接百度鉴权服务（CORS 限制）')
    }
  }

  const data = await resp!.json()
  if (!data.access_token) throw new Error('鉴权失败: ' + (data.error_description || '请检查 Key'))

  localStorage.setItem(cacheKey, JSON.stringify({
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 3600) * 1000,
  }))
  return data.access_token
}
