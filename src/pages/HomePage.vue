<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useClassroomStore } from '@/stores/classroom'
import { usePlaybackStore } from '@/stores/playback'
import { useUserStore } from '@/stores/user'
import type { Classroom, Playback } from '@/types'
import dayjs from 'dayjs'
import {
  VideoCamera,
  User,
  Clock,
  VideoPlay,
  Reading,
  Film,
  Calendar,
} from '@element-plus/icons-vue'

const router = useRouter()
const classroomStore = useClassroomStore()
const playbackStore = usePlaybackStore()
const userStore = useUserStore()

const activeTab = ref<'classrooms' | 'playbacks'>('classrooms')

const classrooms = ref<Classroom[]>([
  {
    id: 'class_001',
    name: '前端开发实战课程',
    status: 'live',
    startTime: dayjs().subtract(30, 'minute').toISOString(),
    endTime: undefined,
  },
  {
    id: 'class_002',
    name: 'WebRTC 技术深度解析',
    status: 'waiting',
    startTime: dayjs().add(1, 'hour').toISOString(),
    endTime: undefined,
  },
  {
    id: 'class_003',
    name: 'Vue3 高阶应用开发',
    status: 'ended',
    startTime: dayjs().subtract(2, 'day').toISOString(),
    endTime: dayjs().subtract(2, 'day').add(2, 'hour').toISOString(),
    playbackId: 'pb_003',
  },
])

const mockPlaybacks = ref<Playback[]>([
  {
    id: 'pb_001',
    name: '第一节课：WebRTC入门基础',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 600,
    currentTime: 0,
    isPlaying: false,
  },
  {
    id: 'pb_002',
    name: '第二节课：信令交互与ICE流程',
    url: 'https://www.w3schools.com/html/movie.mp4',
    duration: 480,
    currentTime: 0,
    isPlaying: false,
  },
  {
    id: 'pb_003',
    name: '第三节课：多路视频流与SFU架构',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 720,
    currentTime: 0,
    isPlaying: false,
  },
  {
    id: 'pb_004',
    name: '第四节课：屏幕共享与录制',
    url: 'https://www.w3schools.com/html/movie.mp4',
    duration: 540,
    currentTime: 0,
    isPlaying: false,
  },
])

const currentUser = computed(() => userStore.currentUser)

function enterClassroom(classroom: Classroom) {
  classroomStore.enterClassroom(classroom)
  if (classroom.status === 'ended') {
    router.push({
      path: '/classroom',
      query: {
        mode: 'playback',
        playbackId: classroom.playbackId || '',
      },
    })
  } else {
    router.push('/classroom')
  }
}

function watchPlayback(playback: Playback) {
  playbackStore.setList(mockPlaybacks.value)
  classroomStore.setMode('playback')
  router.push({
    path: '/classroom',
    query: {
      mode: 'playback',
      playbackId: playback.id,
    },
  })
}

function getStatusText(status: Classroom['status']) {
  const map = {
    waiting: '待开始',
    live: '直播中',
    ended: '已结束',
  }
  return map[status]
}

function formatTime(time: string) {
  return dayjs(time).format('MM-DD HH:mm')
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getWatchProgress(playbackId: string) {
  try {
    const stored = localStorage.getItem('playback_progress')
    if (stored) {
      const data = JSON.parse(stored)
      const progress = data[playbackId] || 0
      const playback = mockPlaybacks.value.find(p => p.id === playbackId)
      if (playback && playback.duration > 0) {
        return Math.round((progress / playback.duration) * 100)
      }
    }
  } catch (e) {
  }
  return 0
}

onMounted(() => {
  userStore.initUser()
  playbackStore.setList(mockPlaybacks.value)
  classroomStore.setClassroomList(classrooms.value)
})
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="logo">
        <el-icon :size="32" class="logo-icon">
          <VideoCamera />
        </el-icon>
        <h1 class="logo-text">在线直播课堂</h1>
      </div>
      <div class="user-info">
        <el-icon class="user-icon">
          <User />
        </el-icon>
        <span>{{ currentUser?.name || '加载中...' }}</span>
      </div>
    </header>

    <main class="home-main">
      <div class="tabs-wrapper">
        <div class="tabs-nav">
          <button
            class="tab-item"
            :class="{ active: activeTab === 'classrooms' }"
            @click="activeTab = 'classrooms'"
          >
            <el-icon>
              <Reading />
            </el-icon>
            <span>课堂中心</span>
          </button>
          <button
            class="tab-item"
            :class="{ active: activeTab === 'playbacks' }"
            @click="activeTab = 'playbacks'"
          >
            <el-icon>
              <Film />
            </el-icon>
            <span>课堂回放</span>
            <span class="tab-count">{{ mockPlaybacks.length }}</span>
          </button>
        </div>
      </div>

      <div class="tab-content">
        <template v-if="activeTab === 'classrooms'">
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon>
                  <VideoCamera />
                </el-icon>
                <span>课堂列表</span>
              </h2>
              <div class="section-desc">选择课堂进入直播，或查看已结束课堂的回放</div>
            </div>

            <div class="classroom-grid">
              <div
                v-for="item in classrooms"
                :key="item.id"
                class="classroom-card"
                :class="item.status"
              >
                <div class="card-cover">
                  <el-icon class="cover-icon" :size="48">
                    <VideoCamera />
                  </el-icon>
                  <span class="status-badge" :class="item.status">
                    {{ getStatusText(item.status) }}
                  </span>
                </div>

                <div class="card-content">
                  <h3 class="card-title">{{ item.name }}</h3>
                  <div class="card-meta">
                    <span class="meta-item">
                      <el-icon :size="14">
                        <Calendar />
                      </el-icon>
                      {{ formatTime(item.startTime) }}
                    </span>
                    <span v-if="item.status === 'ended'" class="meta-item duration">
                      <el-icon :size="14">
                        <Film />
                      </el-icon>
                      已生成回放
                    </span>
                  </div>
                </div>

                <div class="card-action">
                  <button
                    class="enter-btn"
                    :class="item.status"
                    @click="enterClassroom(item)"
                  >
                    <el-icon :size="16">
                      <VideoPlay v-if="item.status === 'live'" />
                      <Clock v-else-if="item.status === 'waiting'" />
                      <Film v-else />
                    </el-icon>
                    <span>
                      {{ item.status === 'live' ? '进入直播' : item.status === 'waiting' ? '预约课程' : '查看回放' }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon>
                  <Film />
                </el-icon>
                <span>课堂回放</span>
              </h2>
              <div class="section-desc">观看已结束课程的录制回放，支持播放进度记忆</div>
            </div>

            <div class="playback-grid">
              <div
                v-for="item in mockPlaybacks"
                :key="item.id"
                class="playback-card"
              >
                <div class="playback-cover" @click="watchPlayback(item)">
                  <div class="cover-bg"></div>
                  <el-icon class="play-icon" :size="48">
                    <VideoPlay />
                  </el-icon>
                  <span class="duration-badge">
                    {{ formatDuration(item.duration) }}
                  </span>
                  <div v-if="getWatchProgress(item.id) > 0" class="progress-bar">
                    <div
                      class="progress-inner"
                      :style="{ width: `${getWatchProgress(item.id)}%` }"
                    ></div>
                  </div>
                </div>
                <div class="playback-info">
                  <h3 class="playback-title">{{ item.name }}</h3>
                  <div class="playback-meta">
                    <span v-if="getWatchProgress(item.id) > 0" class="watch-progress">
                      已观看 {{ getWatchProgress(item.id) }}%
                    </span>
                    <span v-else class="not-watched">尚未观看</span>
                  </div>
                  <button class="watch-btn" @click="watchPlayback(item)">
                    <el-icon>
                      <VideoPlay />
                    </el-icon>
                    <span>{{ getWatchProgress(item.id) > 0 ? '继续观看' : '开始观看' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <footer class="home-footer">
      <p>© 2024 在线直播课堂互动教学平台</p>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  color: #fff;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  color: #fff;
}

.logo-text {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
}

.home-main {
  flex: 1;
  padding: 0 40px 40px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.tabs-wrapper {
  margin-bottom: 24px;
}

.tabs-nav {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 6px;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: #fff;
    color: #667eea;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    font-size: 12px;

    .active & {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
    }
  }
}

.tab-content {
}

.section {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;

  .el-icon {
    color: #409eff;
  }
}

.section-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.classroom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.classroom-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid #f0f2f5;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }

  &.live .card-cover {
    background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%);
  }

  &.waiting .card-cover {
    background: linear-gradient(135deg, #e6a23c 0%, #d89b2e 100%);
  }

  &.ended .card-cover {
    background: linear-gradient(135deg, #909399 0%, #6b7280 100%);
  }
}

.card-cover {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);

  .cover-icon {
    color: #fff;
    opacity: 0.95;
  }
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.card-content {
  padding: 18px;
}

.card-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  min-height: 44px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;

  &.duration {
    color: #409eff;
  }
}

.card-action {
  padding: 0 18px 18px;
}

.enter-btn {
  width: 100%;
  padding: 11px 0;
  border: none;
  background: #409eff;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: #337ecc;
  }

  &.waiting {
    background: #e6a23c;
    &:hover { background: #cf9236; }
  }

  &.ended {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    &:hover {
      background: linear-gradient(135deg, #5568d3 0%, #65408a 100%);
    }
  }
}

.playback-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.playback-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f2f5;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);

    .play-icon {
      transform: scale(1.1);
    }
  }
}

.playback-cover {
  height: 180px;
  position: relative;
  cursor: pointer;
  overflow: hidden;

  .cover-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%);
    transition: transform 0.3s;
  }

  &:hover .cover-bg {
    transform: scale(1.05);
  }
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  opacity: 0.95;
  transition: transform 0.3s;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  z-index: 2;
}

.duration-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  z-index: 2;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  transition: width 0.3s;
}

.playback-info {
  padding: 16px;
}

.playback-title {
  margin: 0 0 10px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.playback-meta {
  margin-bottom: 14px;
}

.watch-progress {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.not-watched {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
  border-radius: 10px;
  font-size: 12px;
}

.watch-btn {
  width: 100%;
  padding: 10px 0;
  border: 1px solid #409eff;
  background: #fff;
  color: #409eff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: #409eff;
    color: #fff;
  }
}

.home-footer {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;

  p {
    margin: 0;
  }
}
</style>
