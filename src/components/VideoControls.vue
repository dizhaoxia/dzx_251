<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useVideoStore } from '@/stores/video'
import { webrtcManager } from '@/utils/webrtc'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  Microphone,
  Mute,
  Warning,
  Refresh,
  Monitor,
} from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'leave'): void
}>()

const videoStore = useVideoStore()
const cameraEnabled = computed(() => videoStore.cameraEnabled)
const micEnabled = computed(() => videoStore.micEnabled)
const deviceError = computed(() => videoStore.deviceError)

const isCheckingDevices = ref(false)
const videoDevices = ref<MediaDeviceInfo[]>([])
const audioDevices = ref<MediaDeviceInfo[]>([])
const selectedVideoDevice = ref('')
const selectedAudioDevice = ref('')

async function checkDevices() {
  isCheckingDevices.value = true
  videoStore.setDeviceError(null)

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    videoDevices.value = devices.filter((d) => d.kind === 'videoinput')
    audioDevices.value = devices.filter((d) => d.kind === 'audioinput')

    if (videoDevices.value.length === 0) {
      videoStore.setDeviceError('未检测到摄像头设备')
      ElMessage.warning('未检测到摄像头设备')
    }

    if (audioDevices.value.length === 0) {
      videoStore.setDeviceError('未检测到麦克风设备')
      ElMessage.warning('未检测到麦克风设备')
    }

    if (videoDevices.value.length > 0) {
      selectedVideoDevice.value = videoDevices.value[0].deviceId
    }
    if (audioDevices.value.length > 0) {
      selectedAudioDevice.value = audioDevices.value[0].deviceId
    }
  } catch (error) {
    console.error('设备检测失败:', error)
    videoStore.setDeviceError('设备检测失败，请检查浏览器权限')
    ElMessage.error('设备检测失败，请检查浏览器权限')
  } finally {
    isCheckingDevices.value = false
  }
}

async function initLocalStream() {
  try {
    const stream = await webrtcManager.getLocalStream(
      videoStore.cameraEnabled,
      videoStore.micEnabled
    )
    const userId = 'local-user'
    videoStore.initLocalStream(userId, stream)
    webrtcManager.toggleLocalVideo(videoStore.cameraEnabled)
    webrtcManager.toggleLocalAudio(videoStore.micEnabled)
    ElMessage.success('本地设备初始化成功')
  } catch (error) {
    console.error('初始化本地流失败:', error)
    videoStore.setDeviceError('无法访问摄像头或麦克风，请检查权限设置')
    ElMessageBox.alert(
      '无法访问摄像头或麦克风，请检查浏览器权限设置',
      '设备访问失败',
      {
        confirmButtonText: '确定',
        type: 'error',
      }
    )
  }
}

function toggleCamera() {
  const newState = !videoStore.cameraEnabled
  videoStore.toggleCamera(newState)
  webrtcManager.toggleLocalVideo(newState)
  ElMessage.info(newState ? '摄像头已开启' : '摄像头已关闭')
}

function toggleMic() {
  const newState = !videoStore.micEnabled
  videoStore.toggleMic(newState)
  webrtcManager.toggleLocalAudio(newState)
  ElMessage.info(newState ? '麦克风已开启' : '麦克风已静音')
}

function handleLeave() {
  ElMessageBox.confirm('确定要离开课堂吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      webrtcManager.closeAll()
      videoStore.clearAll()
      emit('leave')
    })
    .catch(() => {})
}

function handleDeviceErrorClick() {
  ElMessageBox.alert(deviceError.value || '未知设备错误', '设备异常', {
    confirmButtonText: '重新检测',
    type: 'warning',
  })
    .then(() => {
      checkDevices()
      initLocalStream()
    })
    .catch(() => {})
}

onMounted(() => {
  checkDevices()
  initLocalStream()
})

onUnmounted(() => {
  webrtcManager.closeAll()
  videoStore.clearAll()
})
</script>

<template>
  <div class="video-controls">
    <div class="controls-left">
      <div
        v-if="deviceError"
        class="device-error"
        @click="handleDeviceErrorClick"
      >
        <el-icon class="error-icon">
          <Warning />
        </el-icon>
        <span>设备异常</span>
      </div>
    </div>

    <div class="controls-center">
      <button
        class="control-btn"
        :class="{ active: cameraEnabled, error: !cameraEnabled }"
        @click="toggleCamera"
        :title="cameraEnabled ? '关闭摄像头' : '开启摄像头'"
      >
        <el-icon :size="20">
          <VideoPlay v-if="cameraEnabled" />
          <VideoPause v-else />
        </el-icon>
      </button>

      <button
        class="control-btn"
        :class="{ active: micEnabled, error: !micEnabled }"
        @click="toggleMic"
        :title="micEnabled ? '静音麦克风' : '开启麦克风'"
      >
        <el-icon :size="20">
          <Microphone v-if="micEnabled" />
          <Mute v-else />
        </el-icon>
      </button>

      <button
        class="control-btn refresh-btn"
        @click="checkDevices"
        :disabled="isCheckingDevices"
        title="重新检测设备"
      >
        <el-icon :size="20" :class="{ spinning: isCheckingDevices }">
          <Refresh />
        </el-icon>
      </button>

      <div class="device-selector">
        <el-select
          v-model="selectedVideoDevice"
          size="small"
          placeholder="摄像头"
          class="device-select"
          @change="initLocalStream"
        >
          <el-option
            v-for="device in videoDevices"
            :key="device.deviceId"
            :label="device.label || `摄像头 ${device.deviceId.slice(0, 8)}`"
            :value="device.deviceId"
          />
        </el-select>

        <el-select
          v-model="selectedAudioDevice"
          size="small"
          placeholder="麦克风"
          class="device-select"
          @change="initLocalStream"
        >
          <el-option
            v-for="device in audioDevices"
            :key="device.deviceId"
            :label="device.label || `麦克风 ${device.deviceId.slice(0, 8)}`"
            :value="device.deviceId"
          />
        </el-select>
      </div>
    </div>

    <div class="controls-right">
      <button class="leave-btn" @click="handleLeave">
        <el-icon :size="16" style="margin-right: 4px">
          <Monitor />
        </el-icon>
        离开课堂
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #1a1a2e;
  border-top: 1px solid #2d2d44;
}

.controls-left {
  flex: 1;
}

.device-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;

  .error-icon {
    font-size: 14px;
  }
}

.controls-center {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.control-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #2d2d44;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #3d3d5c;
  }

  &.active {
    background: #409eff;

    &:hover {
      background: #66b1ff;
    }
  }

  &.error {
    background: #f56c6c;

    &:hover {
      background: #f78989;
    }
  }

  &.refresh-btn .spinning {
    animation: spin 1s linear infinite;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.device-selector {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.device-select {
  width: 140px;
}

.controls-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.leave-btn {
  padding: 8px 20px;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: background 0.2s ease;

  &:hover {
    background: #f78989;
  }
}
</style>
