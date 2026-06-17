import { defineStore } from 'pinia'
import type { Classroom } from '@/types'
import dayjs from 'dayjs'

interface ClassroomState {
  currentClassroom: Classroom | null
  classroomList: Classroom[]
  mode: 'live' | 'playback'
}

export const useClassroomStore = defineStore('classroom', {
  state: (): ClassroomState => ({
    currentClassroom: null,
    classroomList: [],
    mode: 'live',
  }),

  actions: {
    setClassroomList(list: Classroom[]) {
      this.classroomList = list
    },

    enterClassroom(classroom: Classroom) {
      this.currentClassroom = classroom
      if (classroom.status === 'ended') {
        this.mode = 'playback'
      } else {
        this.mode = 'live'
      }
    },

    leaveClassroom() {
      this.currentClassroom = null
      this.mode = 'live'
    },

    setMode(mode: 'live' | 'playback') {
      this.mode = mode
    },

    updateStatus(status: Classroom['status']) {
      if (this.currentClassroom) {
        this.currentClassroom.status = status
      }
      const idx = this.classroomList.findIndex(c => c.id === this.currentClassroom?.id)
      if (idx !== -1) {
        this.classroomList[idx].status = status
      }
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
    },
  },
})
