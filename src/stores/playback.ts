import { defineStore } from 'pinia'
import type { Playback } from '@/types'

const PROGRESS_STORAGE_KEY = 'playback_progress'

interface PlaybackState {
  list: Playback[]
  currentPlayback: Playback | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
}

function loadProgress(playbackId: string): number {
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return data[playbackId] || 0
    }
  } catch (e) {
    console.error('加载播放进度失败:', e)
  }
  return 0
}

function saveProgress(playbackId: string, time: number): void {
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data[playbackId] = time
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存播放进度失败:', e)
  }
}

export const usePlaybackStore = defineStore('playback', {
  state: (): PlaybackState => ({
    list: [],
    currentPlayback: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  }),

  actions: {
    setList(list: Playback[]) {
      this.list = list
    },

    selectPlayback(playback: Playback) {
      this.currentPlayback = playback
      this.currentTime = loadProgress(playback.id)
      this.duration = playback.duration
      this.isPlaying = false
    },

    play() {
      this.isPlaying = true
    },

    pause() {
      this.isPlaying = false
      this.saveCurrentProgress()
    },

    togglePlay() {
      this.isPlaying ? this.pause() : this.play()
    },

    seek(time: number) {
      this.currentTime = Math.max(0, Math.min(this.duration, time))
      this.saveCurrentProgress()
    },

    setDuration(duration: number) {
      this.duration = duration
    },

    setVolume(volume: number) {
      this.volume = Math.max(0, Math.min(1, volume))
    },

    setCurrentTime(time: number) {
      this.currentTime = time
    },

    saveCurrentProgress() {
      if (this.currentPlayback && this.currentTime > 5) {
        saveProgress(this.currentPlayback.id, this.currentTime)
      }
    },

    clearCurrent() {
      this.saveCurrentProgress()
      this.currentPlayback = null
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
    },
  },
})
