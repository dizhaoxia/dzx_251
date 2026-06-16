<script setup lang="ts">
import { computed } from 'vue'
import { usePlaybackStore } from '@/stores/playback'
import type { Playback } from '@/types'
import dayjs from 'dayjs'
import {
  VideoCamera,
  Clock,
  VideoPlay,
} from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'select', playback: Playback): void
}>()

const playbackStore = usePlaybackStore()
const playbackList = computed(() => playbackStore.list)
const currentPlayback = computed(() => playbackStore.currentPlayback)

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}分${secs}秒`
}

function handleSelect(playback: Playback) {
  playbackStore.selectPlayback(playback)
  emit('select', playback)
}

function getProgress(playback: Playback): number {
  const stored = localStorage.getItem('playback_progress')
  if (!stored) return 0
  try {
    const data = JSON.parse(stored)
    const progress = data[playback.id] || 0
    return playback.duration > 0 ? (progress / playback.duration) * 100 : 0
  } catch {
    return 0
  }
}
</script>

<template>
  <div class="playback-list">
    <div class="list-header">
      <el-icon class="header-icon">
        <VideoCamera />
      </el-icon>
      <span class="header-title">课堂回放</span>
      <span class="list-count">共 {{ playbackList.length }} 个</span>
    </div>

    <div class="list-content">
      <div
        v-for="item in playbackList"
        :key="item.id"
        class="playback-item"
        :class="{ active: item.id === currentPlayback?.id }"
        @click="handleSelect(item)"
      >
        <div class="item-thumbnail">
          <div class="thumbnail-placeholder">
            <el-icon class="play-icon" :size="28">
              <VideoPlay />
            </el-icon>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${getProgress(item)}%` }"
            />
          </div>
        </div>

        <div class="item-info">
          <h4 class="item-title">{{ item.name }}</h4>
          <div class="item-meta">
            <span class="meta-item">
              <el-icon :size="12">
                <Clock />
              </el-icon>
              {{ formatDuration(item.duration) }}
            </span>
          </div>
          <div v-if="getProgress(item) > 0" class="item-progress-text">
            已观看 {{ Math.round(getProgress(item)) }}%
          </div>
        </div>
      </div>

      <div v-if="playbackList.length === 0" class="empty-list">
        <el-icon :size="48" class="empty-icon">
          <VideoCamera />
        </el-icon>
        <p>暂无回放视频</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.playback-list {
  width: 280px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;

  .header-icon {
    color: #409eff;
    font-size: 18px;
  }

  .header-title {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .list-count {
    font-size: 12px;
    color: #909399;
  }
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.playback-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
    border: 1px solid #409eff;
  }
}

.item-thumbnail {
  position: relative;
  width: 100px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  .play-icon {
    opacity: 0.9;
  }
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
}

.progress-fill {
  height: 100%;
  background: #409eff;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-title {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.item-progress-text {
  margin-top: 4px;
  font-size: 11px;
  color: #409eff;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #c0c4cc;

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}
</style>
