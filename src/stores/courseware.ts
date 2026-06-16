import { defineStore } from 'pinia'
import type { Courseware } from '@/types'

interface CoursewareState {
  list: Courseware[]
  currentCourseware: Courseware | null
  isTeacher: boolean
}

export const useCoursewareStore = defineStore('courseware', {
  state: (): CoursewareState => ({
    list: [],
    currentCourseware: null,
    isTeacher: false,
  }),

  actions: {
    setRole(isTeacher: boolean) {
      this.isTeacher = isTeacher
    },

    setList(list: Courseware[]) {
      this.list = list
      if (list.length > 0 && !this.currentCourseware) {
        this.currentCourseware = list[0]
      }
    },

    selectCourseware(id: string) {
      const courseware = this.list.find((c) => c.id === id)
      if (courseware) {
        this.currentCourseware = courseware
      }
    },

    addCourseware(courseware: Courseware) {
      this.list.push(courseware)
    },

    goToPage(page: number) {
      if (!this.currentCourseware) return
      if (page < 1 || page > this.currentCourseware.totalPages) return
      this.currentCourseware.currentPage = page
    },

    nextPage() {
      if (!this.currentCourseware) return
      if (this.currentCourseware.currentPage < this.currentCourseware.totalPages) {
        this.currentCourseware.currentPage++
      }
    },

    prevPage() {
      if (!this.currentCourseware) return
      if (this.currentCourseware.currentPage > 1) {
        this.currentCourseware.currentPage--
      }
    },

    setScale(scale: number) {
      if (!this.currentCourseware) return
      this.currentCourseware.scale = Math.max(0.5, Math.min(3, scale))
    },

    zoomIn() {
      if (!this.currentCourseware) return
      this.setScale(this.currentCourseware.scale + 0.1)
    },

    zoomOut() {
      if (!this.currentCourseware) return
      this.setScale(this.currentCourseware.scale - 0.1)
    },

    resetScale() {
      if (!this.currentCourseware) return
      this.currentCourseware.scale = 1
    },

    syncFromRemote(data: { coursewareId: string; page: number; scale?: number }) {
      const courseware = this.list.find((c) => c.id === data.coursewareId)
      if (courseware) {
        this.currentCourseware = courseware
        courseware.currentPage = data.page
        if (data.scale !== undefined) {
          courseware.scale = data.scale
        }
      }
    },
  },
})
