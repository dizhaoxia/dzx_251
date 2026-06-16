<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useClassroomStore } from '@/stores/classroom'
import { useUserStore } from '@/stores/user'
import type { Classroom } from '@/types'
import dayjs from 'dayjs'
import {
  VideoCamera,
  User,
  Clock,
  VideoPlay,
  Reading,
} from '@element-plus/icons-vue'

const router = useRouter()
const classroomStore = useClassroomStore()
const userStore = useUserStore()

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
  },
])

const currentUser = computed(() => userStore.currentUser)

function enterClassroom(classroom: Classroom) {
  classroomStore.enterClassroom(classroom)
  router.push('/classroom')
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

onMounted(() => {
  userStore.initUser()
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
      <div class="section">
        <h2 class="section-title">
          <el-icon>
            <Reading />
          </el-icon>
          <span>课堂列表</span>
        </h2>

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
                    <Clock />
                  </el-icon>
                  {{ formatTime(item.startTime) }}
                </span>
              </div>
            </div>

            <div class="card-action">
              <button
                class="enter-btn"
                :class="{ disabled: item.status === 'ended' }"
                :disabled="item.status === 'ended'"
                @click="enterClassroom(item)"
              >
                <el-icon :size="16">
                  <VideoPlay v-if="item.status === 'live'" />
                  <Clock v-else />
                </el-icon>
                <span>
                  {{ item.status === 'live' ? '进入直播' : item.status === 'waiting' ? '预约课程' : '查看回放' }}
                </span>
              </button>
            </div>
          </div>
        </div>
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
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;

  .el-icon {
    color: #409eff;
  }
}

.classroom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.classroom-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &.live .card-cover {
    background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%);
  }

  &.waiting .card-cover {
    background: linear-gradient(135deg, #e6a23c 0%, #d89b2e 100%);
  }

  &.ended .card-cover {
    background: linear-gradient(135deg, #909399 0%, #787a7f 100%);
  }
}

.card-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);

  .cover-icon {
    color: #fff;
    opacity: 0.9;
  }
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.card-content {
  padding: 16px;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.card-action {
  padding: 0 16px 16px;
}

.enter-btn {
  width: 100%;
  padding: 10px 0;
  border: none;
  background: #409eff;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.2s;

  &:hover {
    background: #66b1ff;
  }

  &.disabled {
    background: #c0c4cc;
    cursor: not-allowed;
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
