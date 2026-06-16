<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassroomStore } from '@/stores/classroom'
import { useCoursewareStore } from '@/stores/courseware'
import { usePlaybackStore } from '@/stores/playback'
import { useUserStore } from '@/stores/user'
import { wsManager } from '@/utils/websocket'
import { ElMessage } from 'element-plus'
import VideoGrid from '@/components/VideoGrid.vue'
import VideoControls from '@/components/VideoControls.vue'
import CoursewareViewer from '@/components/CoursewareViewer.vue'
import CoursewareControls from '@/components/CoursewareControls.vue'
import PlaybackPlayer from '@/components/PlaybackPlayer.vue'
import PlaybackList from '@/components/PlaybackList.vue'
import {
  VideoCamera,
  Document,
  VideoPlay,
  User,
  SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const classroomStore = useClassroomStore()
const coursewareStore = useCoursewareStore()
const playbackStore = usePlaybackStore()
const userStore = useUserStore()

const mode = computed(() => classroomStore.mode)
const isTeacher = computed(() => coursewareStore.isTeacher)
const currentClassroom = computed(() => classroomStore.currentClassroom)

const activeTab = ref<'video' | 'courseware'>('video')

function switchMode(newMode: 'live' | 'playback') {
  classroomStore.setMode(newMode)
  if (newMode === 'playback' && playbackStore.list.length > 0) {
    playbackStore.selectPlayback(playbackStore.list[0])
  }
}

function toggleRole() {
  const newRole = isTeacher.value ? 'student' : 'teacher'
  coursewareStore.setRole(!isTeacher.value)
  userStore.setRole(newRole)
  ElMessage.info(`已切换为${newRole === 'teacher' ? '老师' : '学生'}模式`)
}

function handleLeave() {
  router.push('/')
}

function initMockData() {
  coursewareStore.setRole(true)

  const mockCoursewares = [
    {
      id: 'cw_001',
      name: '第一章：前端开发基础.pdf',
      type: 'pdf' as const,
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
      totalPages: 1,
      currentPage: 1,
      scale: 1,
    },
    {
      id: 'cw_002',
      name: '课程封面图.png',
      type: 'image' as const,
      url: 'https://via.placeholder.com/800x600/409eff/ffffff?text=Course+Cover',
      totalPages: 1,
      currentPage: 1,
      scale: 1,
    },
  ]
  coursewareStore.setList(mockCoursewares)

  const mockPlaybacks = [
    {
      id: 'pb_001',
      name: '第一节课：WebRTC入门',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 600,
      currentTime: 0,
      isPlaying: false,
    },
    {
      id: 'pb_002',
      name: '第二节课：信令交互详解',
      url: 'https://www.w3schools.com/html/movie.mp4',
      duration: 480,
      currentTime: 0,
      isPlaying: false,
    },
    {
      id: 'pb_003',
      name: '第三节课：多路视频流处理',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 720,
      currentTime: 0,
      isPlaying: false,
    },
  ]
  playbackStore.setList(mockPlaybacks)

  classroomStore.enterClassroom({
    id: 'class_001',
    name: '前端开发实战课程',
    status: 'live',
    startTime: new Date().toISOString(),
  })
}

function setupWebSocketHandlers() {
  wsManager.on('courseware:sync', (data: unknown) => {
    if (!isTeacher.value) {
      coursewareStore.syncFromRemote(data as { coursewareId: string; page: number; scale?: number })
    }
  })
}

onMounted(() => {
  userStore.initUser()
  initMockData()
  setupWebSocketHandlers()
})

onUnmounted(() => {
  classroomStore.leaveClassroom()
})
</script>

<template>
  <div class="classroom-page">
    <header class="classroom-header">
      <div class="header-left">
        <h1 class="classroom-title">{{ currentClassroom?.name || '在线课堂' }}</h1>
        <span
          class="status-badge"
          :class="{ live: mode === 'live', playback: mode === 'playback' }"
        >
          {{ mode === 'live' ? '直播中' : '回放模式' }}
        </span>
      </div>

      <div class="header-center">
        <div class="mode-switcher">
          <button
            class="mode-btn"
            :class="{ active: mode === 'live' }"
            @click="switchMode('live')"
          >
            <el-icon>
              <VideoCamera />
            </el-icon>
            <span>直播</span>
          </button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'playback' }"
            @click="switchMode('playback')"
          >
            <el-icon>
              <VideoPlay />
            </el-icon>
            <span>回放</span>
          </button>
        </div>
      </div>

      <div class="header-right">
        <button class="role-toggle" @click="toggleRole" v-if="mode === 'live'">
          <el-icon>
            <SwitchButton />
          </el-icon>
          <span>{{ isTeacher ? '老师' : '学生' }}模式</span>
        </button>
        <div class="user-info">
          <el-icon class="user-icon">
            <User />
          </el-icon>
          <span>{{ userStore.currentUser?.name || '用户' }}</span>
        </div>
      </div>
    </header>

    <main class="classroom-main">
      <template v-if="mode === 'live'">
        <div class="live-container">
          <div class="live-sidebar">
            <div class="sidebar-tabs">
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'video' }"
                @click="activeTab = 'video'"
              >
                <el-icon>
                  <VideoCamera />
                </el-icon>
                <span>视频</span>
              </button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'courseware' }"
                @click="activeTab = 'courseware'"
              >
                <el-icon>
                  <Document />
                </el-icon>
                <span>课件</span>
              </button>
            </div>
          </div>

          <div class="live-content">
            <div class="video-section" v-show="activeTab === 'video'">
              <VideoGrid />
            </div>
            <div class="courseware-section" v-show="activeTab === 'courseware'">
              <CoursewareViewer :is-teacher="isTeacher" />
            </div>
          </div>

          <div class="live-controls">
            <VideoControls v-if="activeTab === 'video'" @leave="handleLeave" />
            <CoursewareControls v-else :is-teacher="isTeacher" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="playback-container">
          <PlaybackList />
          <div class="playback-content">
            <PlaybackPlayer v-if="playbackStore.currentPlayback" />
            <div v-else class="no-playback">
              <el-icon :size="64" class="no-playback-icon">
                <VideoPlay />
              </el-icon>
              <p>请选择要观看的回放视频</p>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped lang="scss">
.classroom-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.classroom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.classroom-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.live {
    background: rgba(245, 108, 108, 0.1);
    color: #f56c6c;

    &::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f56c6c;
      margin-right: 6px;
      animation: pulse 2s infinite;
    }
  }

  &.playback {
    background: rgba(64, 158, 255, 0.1);
    color: #409eff;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.mode-switcher {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 4px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
  }

  &.active {
    background: #fff;
    color: #409eff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #409eff;
  background: #fff;
  color: #409eff;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    background: #ecf5ff;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #f5f7fa;
  border-radius: 16px;
  font-size: 13px;
  color: #606266;
}

.user-icon {
  color: #409eff;
}

.classroom-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.live-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.live-sidebar {
  display: none;
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  transition: all 0.2s;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }

  &.active {
    background: #ecf5ff;
    color: #409eff;
  }
}

.live-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.video-section,
.courseware-section {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.live-controls {
  flex-shrink: 0;
}

.playback-container {
  width: 100%;
  height: 100%;
  display: flex;
}

.playback-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.no-playback {
  text-align: center;
  color: #6b7280;

  .no-playback-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 16px;
  }
}
</style>
