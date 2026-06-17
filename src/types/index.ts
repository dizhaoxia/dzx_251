export interface User {
  id: string
  name: string
  avatar?: string
  role: 'teacher' | 'student'
  isOnline: boolean
}

export interface VideoStream {
  id: string
  userId: string
  stream: MediaStream | null
  videoEnabled: boolean
  audioEnabled: boolean
  isMain: boolean
}

export type VideoLayoutType = 'tile' | 'speaker' | 'hidden'

export interface Courseware {
  id: string
  name: string
  type: 'pdf' | 'image'
  url: string
  totalPages: number
  currentPage: number
  scale: number
}

export interface Playback {
  id: string
  name: string
  url: string
  duration: number
  currentTime: number
  isPlaying: boolean
}

export interface Classroom {
  id: string
  name: string
  status: 'waiting' | 'live' | 'ended'
  startTime: string
  endTime?: string
  playbackId?: string
}
