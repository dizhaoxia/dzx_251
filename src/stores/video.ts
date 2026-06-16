import { defineStore } from 'pinia'
import type { VideoStream, VideoLayoutType } from '@/types'
import { createLocalVideoStream, createRemoteVideoStream } from '@/utils/user'

interface VideoState {
  layout: VideoLayoutType
  localStream: VideoStream | null
  remoteStreams: VideoStream[]
  cameraEnabled: boolean
  micEnabled: boolean
  deviceError: string | null
}

export const useVideoStore = defineStore('video', {
  state: (): VideoState => ({
    layout: 'speaker',
    localStream: null,
    remoteStreams: [],
    cameraEnabled: true,
    micEnabled: true,
    deviceError: null,
  }),

  getters: {
    allStreams(state): VideoStream[] {
      const streams: VideoStream[] = []
      if (state.localStream) {
        streams.push(state.localStream)
      }
      return [...streams, ...state.remoteStreams]
    },

    mainStream(state): VideoStream | null {
      const mainRemote = state.remoteStreams.find((s) => s.isMain)
      if (mainRemote) return mainRemote
      if (state.localStream) return state.localStream
      return state.remoteStreams[0] || null
    },

    subStreams(state): VideoStream[] {
      if (state.localStream?.isMain) {
        return state.remoteStreams
      }
      const mainId = state.remoteStreams.find((s) => s.isMain)?.id
      return state.remoteStreams.filter((s) => s.id !== mainId)
    },
  },

  actions: {
    setLayout(layout: VideoLayoutType) {
      this.layout = layout
    },

    initLocalStream(userId: string, stream: MediaStream) {
      this.localStream = createLocalVideoStream(userId, stream)
      this.localStream.videoEnabled = this.cameraEnabled
      this.localStream.audioEnabled = this.micEnabled
    },

    addRemoteStream(userId: string, stream: MediaStream, isMain = false) {
      const existing = this.remoteStreams.find((s) => s.userId === userId)
      if (existing) {
        existing.stream = stream
        existing.isMain = isMain || existing.isMain
      } else {
        this.remoteStreams.push(createRemoteVideoStream(userId, stream, isMain))
      }
    },

    removeRemoteStream(userId: string) {
      const index = this.remoteStreams.findIndex((s) => s.userId === userId)
      if (index > -1) {
        this.remoteStreams.splice(index, 1)
      }
    },

    setMainStream(userId: string) {
      this.remoteStreams.forEach((s) => {
        s.isMain = s.userId === userId
      })
      if (this.localStream) {
        this.localStream.isMain = this.localStream.userId === userId
      }
    },

    toggleCamera(enabled?: boolean) {
      this.cameraEnabled = enabled ?? !this.cameraEnabled
      if (this.localStream) {
        this.localStream.videoEnabled = this.cameraEnabled
      }
    },

    toggleMic(enabled?: boolean) {
      this.micEnabled = enabled ?? !this.micEnabled
      if (this.localStream) {
        this.localStream.audioEnabled = this.micEnabled
      }
    },

    setDeviceError(error: string | null) {
      this.deviceError = error
    },

    clearAll() {
      this.localStream = null
      this.remoteStreams = []
      this.deviceError = null
    },
  },
})
