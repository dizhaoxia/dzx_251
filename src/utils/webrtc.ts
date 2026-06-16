class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private remoteStreams: Map<string, MediaStream> = new Map()
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
  ]

  async getLocalStream(video = true, audio = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720 } : false,
        audio: audio,
      })
      return this.localStream
    } catch (error) {
      console.error('获取本地媒体流失败:', error)
      throw error
    }
  }

  getLocalStreamData(): MediaStream | null {
    return this.localStream
  }

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }
  }

  toggleLocalVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  toggleLocalAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  createPeerConnection(userId: string): RTCPeerConnection {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId)!
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    })

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!)
      })
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      this.remoteStreams.set(userId, stream)
      this.dispatch('stream-added', { userId, stream })
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.reconnect(userId)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.dispatch('ice-candidate', { userId, candidate: event.candidate })
      }
    }

    this.peerConnections.set(userId, pc)
    return pc
  }

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.createPeerConnection(userId)
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('创建Offer失败:', error)
      return null
    }
  }

  async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.createPeerConnection(userId)
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('处理Offer失败:', error)
      return null
    }
  }

  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (error) {
        console.error('处理Answer失败:', error)
      }
    }
  }

  async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('添加ICE Candidate失败:', error)
      }
    }
  }

  getRemoteStream(userId: string): MediaStream | undefined {
    return this.remoteStreams.get(userId)
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams)
  }

  private reconnect(userId: string): void {
    console.log(`尝试重新连接用户: ${userId}`)
    this.closePeerConnection(userId)
    this.createPeerConnection(userId)
  }

  closePeerConnection(userId: string): void {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(userId)
    }
    this.remoteStreams.delete(userId)
  }

  closeAll(): void {
    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
    this.remoteStreams.clear()
    this.stopLocalStream()
  }

  private listeners: Map<string, ((data: unknown) => void)[]> = new Map()

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  private dispatch(event: string, data: unknown): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }
}

export const webrtcManager = new WebRTCManager()
