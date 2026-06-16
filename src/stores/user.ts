import { defineStore } from 'pinia'
import type { User } from '@/types'
import { getUserInfo, saveUserInfo } from '@/utils/user'

interface UserState {
  currentUser: User | null
  users: User[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    currentUser: null,
    users: [],
  }),

  actions: {
    initUser() {
      this.currentUser = getUserInfo()
    },

    setRole(role: 'teacher' | 'student') {
      if (this.currentUser) {
        this.currentUser.role = role
        saveUserInfo(this.currentUser)
      }
    },

    updateUserName(name: string) {
      if (this.currentUser) {
        this.currentUser.name = name
        saveUserInfo(this.currentUser)
      }
    },

    addUser(user: User) {
      const existing = this.users.find((u) => u.id === user.id)
      if (!existing) {
        this.users.push(user)
      }
    },

    removeUser(userId: string) {
      const index = this.users.findIndex((u) => u.id === userId)
      if (index > -1) {
        this.users.splice(index, 1)
      }
    },

    updateUserOnline(userId: string, isOnline: boolean) {
      const user = this.users.find((u) => u.id === userId)
      if (user) {
        user.isOnline = isOnline
      }
    },
  },
})
