import { defineStore } from 'pinia'
import type { Classroom } from '@/types'
import dayjs from 'dayjs'

const STORAGE_KEY = 'classroom_state_v1'

interface ClassroomState {
  currentClassroom: Classroom | null
  classroomList: Classroom[]
  mode: 'live' | 'playback'
}

function loadFromStorage(): Partial<ClassroomState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        currentClassroom: data.currentClassroom || null,
        classroomList: data.classroomList || [],
        mode: data.mode || 'live',
      }
    }
  } catch (e) {
    console.error('加载课堂状态失败:', e)
  }
  return null
}

function saveToStorage(state: ClassroomState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentClassroom: state.currentClassroom,
        classroomList: state.classroomList,
        mode: state.mode,
      })
    )
  } catch (e) {
    console.error('保存课堂状态失败:', e)
  }
}

const storedState = loadFromStorage()

export const useClassroomStore = defineStore('classroom', {
  state: (): ClassroomState => ({
    currentClassroom: storedState?.currentClassroom ?? null,
    classroomList: storedState?.classroomList ?? [],
    mode: storedState?.mode ?? 'live',
  }),

  actions: {
    _persist() {
      saveToStorage({
        currentClassroom: this.currentClassroom,
        classroomList: this.classroomList,
        mode: this.mode,
      })
    },

    setClassroomList(list: Classroom[]) {
      const existingIds = new Set(this.classroomList.map(c => c.id))
      const merged = [...this.classroomList]
      for (const item of list) {
        if (!existingIds.has(item.id)) {
          merged.push(item)
        } else {
          const idx = merged.findIndex(c => c.id === item.id)
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...item }
          }
        }
      }
      this.classroomList = merged
      this._persist()
    },

    enterClassroom(classroom: Classroom) {
      const existing = this.classroomList.find(c => c.id === classroom.id)
      if (existing) {
        this.currentClassroom = { ...existing, ...classroom }
      } else {
        this.currentClassroom = classroom
        this.classroomList.push(classroom)
      }
      if (this.currentClassroom.status === 'ended') {
        this.mode = 'playback'
      } else {
        this.mode = 'live'
      }
      this._persist()
    },

    leaveClassroom() {
      this.currentClassroom = null
      this.mode = 'live'
      this._persist()
    },

    setMode(mode: 'live' | 'playback') {
      this.mode = mode
      this._persist()
    },

    updateStatus(status: Classroom['status']) {
      if (this.currentClassroom) {
        this.currentClassroom.status = status
      }
      const idx = this.classroomList.findIndex(c => c.id === this.currentClassroom?.id)
      if (idx !== -1) {
        this.classroomList[idx].status = status
      }
      if (status === 'ended') {
        this.mode = 'playback'
      }
      this._persist()
    },

    endClassroom(playbackId: string) {
      if (this.currentClassroom) {
        this.currentClassroom.status = 'ended'
        this.currentClassroom.endTime = dayjs().toISOString()
        this.currentClassroom.playbackId = playbackId
      }
      const idx = this.classroomList.findIndex(c => c.id === this.currentClassroom?.id)
      if (idx !== -1) {
        this.classroomList[idx].status = 'ended'
        this.classroomList[idx].endTime = dayjs().toISOString()
        this.classroomList[idx].playbackId = playbackId
      }
      this.mode = 'playback'
      this._persist()
    },
  },
})
