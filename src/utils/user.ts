import { generateId } from './common'
import type { User, VideoStream } from '@/types'

export function getUserInfo(): User {
  const stored = localStorage.getItem('user_info')
  if (stored) {
    return JSON.parse(stored)
  }
  const user: User = {
    id: generateId(),
    name: '用户' + Math.floor(Math.random() * 10000),
    role: 'student',
    isOnline: true,
  }
  localStorage.setItem('user_info', JSON.stringify(user))
  return user
}

export function saveUserInfo(user: User): void {
  localStorage.setItem('user_info', JSON.stringify(user))
}

export function createLocalVideoStream(userId: string, stream: MediaStream | null): VideoStream {
  return {
    id: generateId(),
    userId,
    stream,
    videoEnabled: true,
    audioEnabled: true,
    isMain: true,
  }
}

export function createRemoteVideoStream(userId: string, stream: MediaStream | null, isMain = false): VideoStream {
  return {
    id: generateId(),
    userId,
    stream,
    videoEnabled: true,
    audioEnabled: true,
    isMain,
  }
}
