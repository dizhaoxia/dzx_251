import request from '@/utils/request'
import type { Classroom, Courseware, Playback } from '@/types'

export const classroomApi = {
  getList(): Promise<Classroom[]> {
    return request.get('/classrooms')
  },
  getDetail(id: string): Promise<Classroom> {
    return request.get(`/classrooms/${id}`)
  },
  join(id: string): Promise<unknown> {
    return request.post(`/classrooms/${id}/join`)
  },
  leave(id: string): Promise<unknown> {
    return request.post(`/classrooms/${id}/leave`)
  },
}

export const coursewareApi = {
  getList(classroomId: string): Promise<Courseware[]> {
    return request.get(`/classrooms/${classroomId}/coursewares`)
  },
  upload(classroomId: string, formData: FormData): Promise<Courseware> {
    return request.post(`/classrooms/${classroomId}/coursewares`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const playbackApi = {
  getList(classroomId: string): Promise<Playback[]> {
    return request.get(`/classrooms/${classroomId}/playbacks`)
  },
  getDetail(id: string): Promise<Playback> {
    return request.get(`/playbacks/${id}`)
  },
}
