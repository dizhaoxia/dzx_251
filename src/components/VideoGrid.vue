<script setup lang="ts">
import { computed } from 'vue'
import { useVideoStore } from '@/stores/video'
import type { VideoStream, VideoLayoutType } from '@/types'
import VideoPlayer from './VideoPlayer.vue'
import { Grid, FullScreen, Hide } from '@element-plus/icons-vue'

const videoStore = useVideoStore()

const layoutOptions = [
  { value: 'tile', label: '等分平铺', icon: Grid },
  { value: 'speaker', label: '主讲置顶', icon: FullScreen },
  { value: 'hidden', label: '隐藏画面', icon: Hide },
]

const mainStream = computed(() => videoStore.mainStream)
const subStreams = computed(() => videoStore.subStreams)
const allStreams = computed(() => videoStore.allStreams)
const currentLayout = computed(() => videoStore.layout)

function setLayout(layout: VideoLayoutType) {
  videoStore.setLayout(layout)
}

function handleStreamClick(stream: VideoStream) {
  if (currentLayout.value === 'speaker') {
    videoStore.setMainStream(stream.userId)
  }
}
</script>

<template>
  <div class="video-grid-container">
    <div class="layout-switcher">
      <el-radio-group v-model="currentLayout" size="small" @change="setLayout">
        <el-radio-button v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
          <el-icon style="margin-right: 4px">
            <component :is="opt.icon" />
          </el-icon>
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="currentLayout === 'tile'" class="tile-layout">
      <div
        v-for="stream in allStreams"
        :key="stream.id"
        class="tile-item"
      >
        <VideoPlayer
          :stream="stream"
          :show-controls="true"
          :is-main="stream.isMain"
          @click="handleStreamClick"
        />
      </div>
    </div>

    <div v-else-if="currentLayout === 'speaker'" class="speaker-layout">
      <div class="main-video">
        <VideoPlayer
          v-if="mainStream"
          :stream="mainStream"
          :is-main="true"
          :show-controls="true"
        />
        <div v-else class="empty-main">
          <span>暂无视频流</span>
        </div>
      </div>
      <div class="sub-videos">
        <div
          v-for="stream in subStreams"
          :key="stream.id"
          class="sub-item"
        >
          <VideoPlayer
            :stream="stream"
            :show-controls="true"
            @click="handleStreamClick"
          />
        </div>
      </div>
    </div>

    <div v-else-if="currentLayout === 'hidden'" class="hidden-layout">
      <div class="hidden-message">
        <el-icon :size="48" style="margin-bottom: 16px">
          <Hide />
        </el-icon>
        <p>视频画面已隐藏</p>
        <p class="sub-text">共 {{ allStreams.length }} 路视频流</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-grid-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
  position: relative;
}

.layout-switcher {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.tile-layout {
  flex: 1;
  display: grid;
  gap: 12px;
  padding: 16px;

  &:has(.tile-item:nth-child(1)):has(.tile-item:nth-child(2)):not(:has(.tile-item:nth-child(3))) {
    grid-template-columns: repeat(2, 1fr);
  }

  &:has(.tile-item:nth-child(1)):has(.tile-item:nth-child(2)):has(.tile-item:nth-child(3)):not(:has(.tile-item:nth-child(5))) {
    grid-template-columns: repeat(2, 1fr);
  }

  &:has(.tile-item:nth-child(5)) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tile-item {
  min-height: 200px;
}

.speaker-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
}

.main-video {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
}

.empty-main {
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.sub-videos {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a2e;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #409eff;
    border-radius: 3px;
  }
}

.sub-item {
  flex-shrink: 0;
  width: 200px;
  height: 120px;
}

.hidden-layout {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden-message {
  text-align: center;
  color: #6b7280;

  p {
    margin: 0;
    font-size: 16px;
  }

  .sub-text {
    margin-top: 8px;
    font-size: 14px;
    color: #4b5563;
  }
}
</style>
