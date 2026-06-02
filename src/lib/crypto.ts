const ALGORITHM = 'AES-GCM'
const KEY_NAME = 'auto-money-encryption-key'

async function getKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_NAME)
  if (stored) {
    const raw = Uint8Array.from(JSON.parse(stored))
    return crypto.subtle.importKey('raw', raw, ALGORITHM, false, ['encrypt', 'decrypt'])
  }
  const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(KEY_NAME, JSON.stringify(Array.from(new Uint8Array(exported))))
  return key
}

export async function encrypt(text: string): Promise<{ iv: number[]; data: number[] }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  }
}

export async function decrypt(payload: { iv: number[]; data: number[] }): Promise<string> {
  const key = await getKey()
  const iv = new Uint8Array(payload.iv)
  const data = new Uint8Array(payload.data)
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  const payload = await encrypt(apiKey)
  return JSON.stringify(payload)
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  try {
    const payload = JSON.parse(encrypted)
    return await decrypt(payload)
  } catch {
    return encrypted
  }
}
