<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { VideoStream } from '@/types'
import { VideoPlay, Microphone, Mute, VideoPause } from '@element-plus/icons-vue'

const props = defineProps<{
  stream: VideoStream
  isMain?: boolean
  showControls?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', stream: VideoStream): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const streamId = computed(() => props.stream.id)

function attachStream() {
  if (videoRef.value && props.stream.stream) {
    videoRef.value.srcObject = props.stream.stream
    videoRef.value.play().catch((err) => {
      console.warn('自动播放失败:', err)
    })
  }
}

function handleClick() {
  emit('click', props.stream)
}

onMounted(() => {
  attachStream()
})

watch(
  () => props.stream.stream,
  () => {
    attachStream()
  }
)

onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
})
</script>

<template>
  <div
    class="video-player"
    :class="{ 'is-main': isMain, 'is-video-off': !stream.videoEnabled }"
    @click="handleClick"
  >
    <video
      ref="videoRef"
      class="video-element"
      :muted="stream.isMain ? false : true"
      autoplay
      playsinline
    />
    <div v-if="!stream.videoEnabled" class="video-placeholder">
      <el-icon :size="isMain ? 80 : 40">
        <VideoPause />
      </el-icon>
      <span class="username">{{ stream.userId }}</span>
    </div>
    <div v-if="showControls" class="video-info">
      <span class="username">{{ stream.userId }}</span>
      <div class="audio-indicator">
        <el-icon v-if="stream.audioEnabled" :size="16">
          <Microphone />
        </el-icon>
        <el-icon v-else :size="16" class="muted">
          <Mute />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  &.is-main {
    border: 2px solid #409eff;
  }

  &.is-video-off .video-element {
    visibility: hidden;
  }
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #2d2d44;
  color: #8b8ba7;

  .username {
    margin-top: 12px;
    font-size: 14px;
  }
}

.video-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;

  .username {
    font-size: 12px;
    font-weight: 500;
  }

  .audio-indicator {
    .muted {
      color: #f56c6c;
    }
  }
}
</style>
