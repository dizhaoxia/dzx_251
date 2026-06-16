import { io, Socket } from 'socket.io-client'

class WebSocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private messageHandlers: Map<string, ((data: unknown) => void)[]> = new Map()

  connect(url: string, options?: Record<string, unknown>): void {
    if (this.socket?.connected) return

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      ...options,
    })

    this.socket.on('connect', () => {
      console.log('[WebSocket] 连接成功')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] 断开连接:', reason)
      this.tryReconnect(url, options)
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] 连接错误:', error)
      this.tryReconnect(url, options)
    })

    this.socket.onAny((event: string, data: unknown) => {
      const handlers = this.messageHandlers.get(event)
      if (handlers) {
        handlers.forEach((handler) => handler(data))
      }
    })
  }

  private tryReconnect(url: string, options?: Record<string, unknown>): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数')
      return
    }
    this.reconnectAttempts++
    setTimeout(() => {
      console.log(`[WebSocket] 第${this.reconnectAttempts}次重连...`)
      this.connect(url, options)
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(handler)
  }

  off(event: string, handler?: (data: unknown) => void): void {
    if (!handler) {
      this.messageHandlers.delete(event)
      return
    }
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('[WebSocket] 未连接，无法发送消息:', event)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.messageHandlers.clear()
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const wsManager = new WebSocketManager()
