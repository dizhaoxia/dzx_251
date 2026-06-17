<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassroomStore } from '@/stores/classroom'
import { useCoursewareStore } from '@/stores/courseware'
import { usePlaybackStore } from '@/stores/playback'
import { useUserStore } from '@/stores/user'
import { wsManager } from '@/utils/websocket'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import type { Playback } from '@/types'
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
  VideoPause,
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
const classroomStatus = computed(() => currentClassroom.value?.status || 'waiting')

const videoPanelCollapsed = ref(false)
const coursewarePanelCollapsed = ref(false)

function toggleVideoPanel() {
  videoPanelCollapsed.value = !videoPanelCollapsed.value
  if (!videoPanelCollapsed.value) {
    coursewarePanelCollapsed.value = false
  }
}

function toggleCoursewarePanel() {
  coursewarePanelCollapsed.value = !coursewarePanelCollapsed.value
  if (!coursewarePanelCollapsed.value) {
    videoPanelCollapsed.value = false
  }
}

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

async function handleEndClassroom() {
  try {
    await ElMessageBox.confirm(
      '确认要结束本次直播吗？结束后将生成课堂回放，学员可通过回放继续学习。',
      '结束直播确认',
      {
        confirmButtonText: '确认结束',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const playbackName = `${currentClassroom.value?.name} - 课堂回放`
    const newPlayback: Playback = {
      id: `pb_${Date.now()}`,
      name: playbackName,
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 3600,
      currentTime: 0,
      isPlaying: false,
    }

    playbackStore.addPlayback(newPlayback)

    classroomStore.endClassroom(newPlayback.id)

    ElMessage.success('直播已结束，课堂回放已生成！')

    setTimeout(() => {
      switchMode('playback')
    }, 1500)
  } catch {
  }
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
  if (mockCoursewares.length > 0) {
    coursewareStore.selectCourseware(mockCoursewares[0].id)
  }

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

  const existingClassroom = classroomStore.currentClassroom
  if (!existingClassroom) {
    classroomStore.enterClassroom({
      id: 'class_001',
      name: '前端开发实战课程',
      status: 'live',
      startTime: dayjs().toISOString(),
    })
  }

  if (existingClassroom?.status === 'ended' && existingClassroom.playbackId) {
    const targetPlayback = playbackStore.list.find(p => p.id === existingClassroom.playbackId)
    if (targetPlayback) {
      classroomStore.setMode('playback')
      playbackStore.selectPlayback(targetPlayback)
    }
  }

  const modeParam = route.query.mode as string
  if (modeParam === 'playback' && playbackStore.list.length > 0) {
    classroomStore.setMode('playback')
    const playbackId = route.query.playbackId as string
    if (playbackId) {
      const target = playbackStore.list.find(p => p.id === playbackId)
      if (target) {
        playbackStore.selectPlayback(target)
      } else {
        playbackStore.selectPlayback(playbackStore.list[0])
      }
    } else {
      playbackStore.selectPlayback(playbackStore.list[0])
    }
  }
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
          :class="{
            live: classroomStatus === 'live' && mode === 'live',
            waiting: classroomStatus === 'waiting',
            ended: classroomStatus === 'ended' || mode === 'playback',
            playback: mode === 'playback',
          }"
        >
          <template v-if="mode === 'playback'">回放模式</template>
          <template v-else-if="classroomStatus === 'live'">直播中</template>
          <template v-else-if="classroomStatus === 'waiting'">待开始</template>
          <template v-else>已结束</template>
        </span>
      </div>

      <div class="header-center">
        <div class="mode-switcher" v-if="classroomStatus === 'ended' || mode === 'playback'">
          <button
            class="mode-btn"
            :class="{ active: mode === 'playback' }"
            @click="switchMode('playback')"
          >
            <el-icon>
              <VideoPlay />
            </el-icon>
            <span>观看回放</span>
          </button>
        </div>
        <div class="mode-switcher" v-else>
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
        </div>
      </div>

      <div class="header-right">
        <button
          v-if="isTeacher && classroomStatus === 'live'"
          class="end-btn"
          @click="handleEndClassroom"
        >
          <el-icon>
            <VideoPause />
          </el-icon>
          <span>结束直播</span>
        </button>
        <button
          v-if="mode === 'live' && classroomStatus === 'live'"
          class="role-toggle"
          @click="toggleRole"
        >
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
          <div
            class="panel video-panel"
            :class="{ collapsed: videoPanelCollapsed, expanded: !coursewarePanelCollapsed && !videoPanelCollapsed }"
          >
            <div class="panel-header">
              <div class="panel-title">
                <el-icon>
                  <VideoCamera />
                </el-icon>
                <span>多路视频直播</span>
              </div>
              <div class="panel-actions">
                <button
                  class="panel-toggle"
                  @click="toggleCoursewarePanel"
                  :title="coursewarePanelCollapsed ? '显示课件' : '隐藏课件'"
                >
                  <el-icon>
                    <Document />
                  </el-icon>
                </button>
                <button
                  class="panel-toggle"
                  @click="toggleVideoPanel"
                  :title="videoPanelCollapsed ? '展开视频' : '收起视频'"
                >
                  {{ videoPanelCollapsed ? '展开' : '收起' }}
                </button>
              </div>
            </div>
            <div class="panel-body" v-show="!videoPanelCollapsed">
              <VideoGrid />
            </div>
          </div>

          <div
            class="panel courseware-panel"
            :class="{ collapsed: coursewarePanelCollapsed, expanded: !videoPanelCollapsed && !coursewarePanelCollapsed }"
          >
            <div class="panel-header">
              <div class="panel-title">
                <el-icon>
                  <Document />
                </el-icon>
                <span>课件授课</span>
                <el-tag
                  v-if="isTeacher"
                  type="primary"
                  size="small"
                  effect="light"
                  style="margin-left: 8px"
                >
                  教师端
                </el-tag>
              </div>
              <div class="panel-actions">
                <button
                  class="panel-toggle"
                  @click="toggleVideoPanel"
                  :title="videoPanelCollapsed ? '显示视频' : '隐藏视频'"
                >
                  <el-icon>
                    <VideoCamera />
                  </el-icon>
                </button>
                <button
                  class="panel-toggle"
                  @click="toggleCoursewarePanel"
                  :title="coursewarePanelCollapsed ? '展开课件' : '收起课件'"
                >
                  {{ coursewarePanelCollapsed ? '展开' : '收起' }}
                </button>
              </div>
            </div>
            <div class="panel-body" v-show="!coursewarePanelCollapsed">
              <div class="courseware-inner">
                <div class="courseware-main">
                  <CoursewareViewer :is-teacher="isTeacher" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="controls-area">
          <div class="controls-section">
            <div class="controls-label">视频控制</div>
            <VideoControls @leave="handleLeave" />
          </div>
          <div class="divider-v"></div>
          <div class="controls-section courseware-controls-section">
            <div class="controls-label">课件控制</div>
            <CoursewareControls :is-teacher="isTeacher" />
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
  background: #f0f2f5;
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
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;
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

  &.waiting {
    background: rgba(230, 162, 60, 0.1);
    color: #e6a23c;
  }

  &.ended, &.playback {
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
  gap: 12px;
}

.end-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid #f56c6c;
  background: #fff;
  color: #f56c6c;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #fef0f0;
    color: #e74c3c;
    border-color: #e74c3c;
  }
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
  display: flex;
  flex-direction: column;
}

.live-container {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px 12px 0 12px;
  overflow: hidden;
  min-height: 0;
}

.panel {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &.video-panel {
    flex: 1.2;
    min-width: 320px;

    &.expanded {
      flex: 1.2;
    }

    &.collapsed {
      flex: 0 0 48px;
      min-width: 48px;
    }
  }

  &.courseware-panel {
    flex: 1;
    min-width: 360px;
    background: linear-gradient(180deg, #fafcff 0%, #fff 100%);

    &.expanded {
      flex: 1;
    }

    &.collapsed {
      flex: 0 0 48px;
      min-width: 48px;
    }
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f2f5;
  background: #fafbfc;
  flex-shrink: 0;
  min-height: 48px;
  box-sizing: border-box;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;

  .el-icon {
    color: #409eff;
    font-size: 16px;
  }
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-toggle {
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
    border-color: #409eff;
    background: #ecf5ff;
  }

  .el-icon {
    font-size: 14px;
  }
}

.panel-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.courseware-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.courseware-main {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  box-sizing: border-box;
}

.controls-area {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  padding: 12px;
  gap: 12px;
  background: transparent;
}

.controls-section {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &.courseware-controls-section {
    flex: 1.2;
  }
}

.controls-label {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  background: #fafbfc;
  border-bottom: 1px solid #f0f2f5;
  letter-spacing: 0.5px;
}

.divider-v {
  width: 1px;
  background: transparent;
  flex-shrink: 0;
}

.playback-container {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
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
