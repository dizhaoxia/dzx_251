import { defineStore } from 'pinia'
import type { Classroom } from '@/types'

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
    },

    leaveClassroom() {
      this.currentClassroom = null
    },

    setMode(mode: 'live' | 'playback') {
      this.mode = mode
    },

    updateStatus(status: Classroom['status']) {
      if (this.currentClassroom) {
        this.currentClassroom.status = status
      }
    },
  },
})
