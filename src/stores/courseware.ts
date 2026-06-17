import { defineStore } from 'pinia'
import type { Courseware } from '@/types'

const STORAGE_KEY = 'courseware_list_v1'

interface CoursewareState {
  list: Courseware[]
  currentCourseware: Courseware | null
  currentId: string | null
  isTeacher: boolean
}

function loadFromStorage(): { list: Courseware[], currentId: string | null } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        list: data.list || [],
        currentId: data.currentId || null,
      }
    }
  } catch (e) {
    console.error('加载课件状态失败:', e)
  }
  return null
}

function saveToStorage(list: Courseware[], currentId: string | null): void {
  try {
    let totalSize = 0
    for (const cw of list) {
      if (cw.dataBase64) {
        totalSize += cw.dataBase64.length
      }
    }

    if (totalSize > 4 * 1024 * 1024) {
      const safeList: Courseware[] = list.map(cw => {
        if (cw.dataBase64 && cw.url.startsWith('data:')) {
          const { dataBase64, ...rest } = cw
          return { ...rest, url: cw.url, dataBase64: undefined }
        }
        return cw
      })
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ list: safeList, currentId })
      )
      console.warn('课件数据过大，已跳过部分文件内容持久化以节省存储空间')
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ list, currentId })
      )
    }
  } catch (e) {
    console.error('保存课件状态失败:', e)
  }
}

const storedState = loadFromStorage()

export const useCoursewareStore = defineStore('courseware', {
  state: (): CoursewareState => ({
    list: storedState?.list ?? [],
    currentId: storedState?.currentId ?? null,
    currentCourseware: null,
    isTeacher: false,
  }),

  getters: {
    _currentCourseware(state): Courseware | null {
      if (state.currentId) {
        return state.list.find(c => c.id === state.currentId) || null
      }
      return null
    },
  },

  actions: {
    _syncCurrent() {
      this.currentCourseware = this.currentId
        ? this.list.find(c => c.id === this.currentId) || null
        : null
    },

    _persist() {
      saveToStorage(this.list, this.currentId)
      this._syncCurrent()
    },

    setRole(isTeacher: boolean) {
      this.isTeacher = isTeacher
    },

    setList(list: Courseware[]) {
      const mergedIds = new Set<string>()
      const merged: Courseware[] = []

      for (const item of this.list) {
        mergedIds.add(item.id)
        merged.push({ ...item })
      }
      for (const item of list) {
        if (!mergedIds.has(item.id)) {
          mergedIds.add(item.id)
          merged.push({ ...item })
        }
      }
      this.list = merged
      if (!this.currentId && this.list.length > 0) {
        this.currentId = this.list[0].id
      }
      this._persist()
    },

    selectCourseware(id: string) {
      const courseware = this.list.find((c) => c.id === id)
      if (courseware) {
        this.currentId = id
        this._persist()
      }
    },

    addCourseware(courseware: Courseware) {
      this.list.push(courseware)
      this.currentId = courseware.id
      this._persist()
    },

    goToPage(page: number) {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      if (page < 1 || page > cw.totalPages) return
      cw.currentPage = page
      this._persist()
    },

    nextPage() {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      if (cw.currentPage < cw.totalPages) {
        cw.currentPage++
        this._persist()
      }
    },

    prevPage() {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      if (cw.currentPage > 1) {
        cw.currentPage--
        this._persist()
      }
    },

    setScale(scale: number) {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      cw.scale = Math.max(0.5, Math.min(3, scale))
      this._persist()
    },

    zoomIn() {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      this.setScale(cw.scale + 0.1)
    },

    zoomOut() {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      this.setScale(cw.scale - 0.1)
    },

    resetScale() {
      const cw = this.list.find(c => c.id === this.currentId)
      if (!cw) return
      cw.scale = 1
      this._persist()
    },

    syncFromRemote(data: { coursewareId: string; page: number; scale?: number }) {
      const courseware = this.list.find((c) => c.id === data.coursewareId)
      if (courseware) {
        this.currentId = data.coursewareId
        courseware.currentPage = data.page
        if (data.scale !== undefined) {
          courseware.scale = data.scale
        }
        this._persist()
      }
    },
  },
})
