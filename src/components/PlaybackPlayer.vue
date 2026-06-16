<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { usePlaybackStore } from '@/stores/playback'
import { ElMessage } from 'element-plus'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import {
  VideoPlay,
  VideoPause,
  Mute,
  Microphone,
  FullScreen,
  RefreshLeft,
} from '@element-plus/icons-vue'

const props = defineProps<{
  playbackId?: string
}>()

const playbackStore = usePlaybackStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const player = ref<any>(null)
const isPlaying = computed(() => playbackStore.isPlaying)
const currentTime = computed(() => playbackStore.currentTime)
const duration = computed(() => playbackStore.duration)
const volume = computed(() => playbackStore.volume)
const currentPlayback = computed(() => playbackStore.currentPlayback)

const isMuted = ref(false)
const isDragging = ref(false)
const progressRef = ref<HTMLDivElement | null>(null)

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function initPlayer() {
  if (!videoRef.value || !currentPlayback.value) return

  player.value = videojs(videoRef.value, {
    controls: false,
    autoplay: false,
    preload: 'metadata',
    sources: [
      {
        src: currentPlayback.value.url,
        type: 'video/mp4',
      },
    ],
  })

  player.value.on('loadedmetadata', () => {
    if (player.value) {
      playbackStore.setDuration(player.value.duration())
      if (currentTime.value > 0) {
        player.value.currentTime(currentTime.value)
      }
    }
  })

  player.value.on('timeupdate', () => {
    if (player.value && !isDragging.value) {
      playbackStore.setCurrentTime(player.value.currentTime())
    }
  })

  player.value.on('play', () => {
    playbackStore.play()
  })

  player.value.on('pause', () => {
    playbackStore.pause()
  })

  player.value.on('ended', () => {
    playbackStore.pause()
    ElMessage.info('播放结束')
  })

  player.value.on('error', () => {
    ElMessage.error('视频加载失败')
  })

  if (currentTime.value > 0) {
    player.value.ready(() => {
      if (player.value) {
        player.value.currentTime(currentTime.value)
      }
    })
  }
}

function togglePlay() {
  if (!player.value) return
  if (isPlaying.value) {
    player.value.pause()
  } else {
    player.value.play()
  }
}

function toggleMute() {
  if (!player.value) return
  isMuted.value = !isMuted.value
  player.value.muted(isMuted.value)
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement
  const vol = parseFloat(target.value)
  playbackStore.setVolume(vol)
  if (player.value) {
    player.value.volume(vol)
    if (vol > 0) {
      isMuted.value = false
      player.value.muted(false)
    }
  }
}

function handleProgressClick(e: MouseEvent) {
  if (!progressRef.value || !player.value || !duration.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const time = percent * duration.value
  player.value.currentTime(time)
  playbackStore.seek(time)
}

function handleProgressMouseDown(e: MouseEvent) {
  isDragging.value = true
  handleProgressClick(e)

  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!progressRef.value || !player.value || !duration.value) return
    const rect = progressRef.value.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width))
    const time = percent * duration.value
    playbackStore.setCurrentTime(time)
  }

  const handleMouseUp = (upEvent: MouseEvent) => {
    isDragging.value = false
    handleProgressClick(upEvent)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function replay() {
  if (!player.value) return
  player.value.currentTime(0)
  playbackStore.seek(0)
  player.value.play()
}

function fullscreen() {
  if (!player.value) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    player.value.requestFullscreen()
  }
}

watch(
  () => props.playbackId,
  async () => {
    if (player.value) {
      player.value.dispose()
      player.value = null
    }
    await nextTick()
    initPlayer()
  }
)

onMounted(() => {
  initPlayer()
})

onUnmounted(() => {
  playbackStore.saveCurrentProgress()
  if (player.value) {
    player.value.dispose()
    player.value = null
  }
})
</script>

<template>
  <div class="playback-player">
    <div class="video-wrapper">
      <video
        ref="videoRef"
        class="video-js vjs-big-play-centered"
        playsinline
      />
    </div>

    <div class="player-controls">
      <div class="controls-left">
        <button class="ctrl-btn" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
          <el-icon :size="18">
            <VideoPause v-if="isPlaying" />
            <VideoPlay v-else />
          </el-icon>
        </button>

        <button class="ctrl-btn" @click="replay" title="重新播放">
          <el-icon :size="16">
            <RefreshLeft />
          </el-icon>
        </button>

        <div class="volume-wrapper">
          <button class="ctrl-btn" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
            <el-icon :size="16">
              <Mute v-if="isMuted || volume === 0" />
              <Microphone v-else />
            </el-icon>
          </button>
          <input
            type="range"
            class="volume-slider"
            min="0"
            max="1"
            step="0.1"
            :value="isMuted ? 0 : volume"
            @input="handleVolumeChange"
          />
        </div>

        <span class="time-display">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>

      <div class="progress-bar">
        <div
          ref="progressRef"
          class="progress-track"
          @click="handleProgressClick"
          @mousedown="handleProgressMouseDown"
        >
          <div
            class="progress-buffered"
            :style="{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
          />
          <div
            class="progress-played"
            :style="{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
          />
          <div
            class="progress-thumb"
            :style="{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
          />
        </div>
      </div>

      <div class="controls-right">
        <button class="ctrl-btn" @click="fullscreen" title="全屏">
          <el-icon :size="16">
            <FullScreen />
          </el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.playback-player {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.video-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  :deep(.video-js) {
    width: 100% !important;
    height: 100% !important;
  }

  :deep(.vjs-tech) {
    object-fit: contain;
  }

  :deep(.vjs-big-play-button) {
    display: none;
  }

  :deep(.vjs-control-bar) {
    display: none;
  }
}

.player-controls {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #1a1a2e;
  gap: 16px;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.volume-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #409eff;
    cursor: pointer;
  }
}

.time-display {
  color: #fff;
  font-size: 13px;
  font-family: monospace;
  min-width: 100px;
}

.progress-bar {
  flex: 1;
}

.progress-track {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  cursor: pointer;
  transition: height 0.2s;

  &:hover {
    height: 8px;
  }
}

.progress-buffered {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.progress-played {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #409eff;
  border-radius: 3px;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #409eff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-track:hover .progress-thumb {
  opacity: 1;
}

.controls-right {
  display: flex;
  align-items: center;
}
</style>
