import { useEffect, useRef, useCallback } from 'react'

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'wss://safe-vision-ai-xi.vercel.app/ws'
    : 'ws://localhost:8000/ws')

// ── Singleton WebSocket — ek hi connection puri app ke liye ──────────────────
let globalWs: WebSocket | null = null
let globalListeners: Set<(data: any) => void> = new Set()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let isConnecting = false

function connectGlobal() {
  if (typeof window === 'undefined') return
  if (isConnecting) return
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) return

  isConnecting = true
  const token = localStorage.getItem('token')
  const wsUrl = token
    ? `${WS_URL}?client_id=dashboard&token=${token}`
    : `${WS_URL}?client_id=dashboard`

  try {
    const ws = new WebSocket(wsUrl)
    globalWs = ws

    ws.onopen = () => {
      isConnecting = false
      console.log('✅ WebSocket connected (singleton)')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'pong' && data.type !== 'connected') {
          globalListeners.forEach(fn => fn(data))
        }
      } catch {}
    }

    ws.onclose = () => {
      isConnecting = false
      globalWs = null
      // Reconnect after 3s if there are active listeners
      if (globalListeners.size > 0) {
        reconnectTimer = setTimeout(connectGlobal, 3000)
      }
    }

    ws.onerror = () => {
      isConnecting = false
    }

  } catch {
    isConnecting = false
    reconnectTimer = setTimeout(connectGlobal, 3000)
  }
}

export function useWebSocket(onMessage: (data: any) => void) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const stableListener = useCallback((data: any) => {
    onMessageRef.current(data)
  }, [])

  useEffect(() => {
    // Register listener
    globalListeners.add(stableListener)

    // Connect if not already connected
    connectGlobal()

    return () => {
      // Unregister listener
      globalListeners.delete(stableListener)

      // If no more listeners, close after a delay
      if (globalListeners.size === 0) {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        // Don't close immediately — user might navigate between pages
      }
    }
  }, [stableListener])

  return { readyState: globalWs?.readyState }
}
