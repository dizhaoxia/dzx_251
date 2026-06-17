<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCoursewareStore } from '@/stores/courseware'
import { wsManager } from '@/utils/websocket'
import { ElMessage } from 'element-plus'
import type { Courseware } from '@/types'
import {
  ArrowLeft,
  ArrowRight,
  DArrowLeft,
  DArrowRight,
  Folder,
  Upload,
  Document,
  Picture,
} from '@element-plus/icons-vue'

const props = defineProps<{
  isTeacher?: boolean
}>()

const coursewareStore = useCoursewareStore()
const currentCourseware = computed(() => coursewareStore.currentCourseware)
const currentPage = computed(() => currentCourseware.value?.currentPage || 1)
const totalPages = computed(() => currentCourseware.value?.totalPages || 0)
const coursewareList = computed(() => coursewareStore.list)

const targetPage = ref('')
const showFileDialog = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

function prevPage() {
  if (!currentCourseware.value) return
  if (currentPage.value <= 1) {
    ElMessage.warning('已经是第一页了')
    return
  }
  coursewareStore.prevPage()
  syncCourseware()
}

function nextPage() {
  if (!currentCourseware.value) return
  if (currentPage.value >= totalPages.value) {
    ElMessage.warning('已经是最后一页了')
    return
  }
  coursewareStore.nextPage()
  syncCourseware()
}

function firstPage() {
  if (!currentCourseware.value) return
  coursewareStore.goToPage(1)
  syncCourseware()
}

function lastPage() {
  if (!currentCourseware.value) return
  coursewareStore.goToPage(totalPages.value)
  syncCourseware()
}

function goToPage() {
  const page = parseInt(targetPage.value)
  if (isNaN(page) || page < 1 || page > totalPages.value) {
    ElMessage.error('请输入有效的页码')
    return
  }
  coursewareStore.goToPage(page)
  targetPage.value = ''
  syncCourseware()
}

function syncCourseware() {
  if (!props.isTeacher || !currentCourseware.value) return
  wsManager.emit('courseware:sync', {
    coursewareId: currentCourseware.value.id,
    page: currentCourseware.value.currentPage,
    scale: currentCourseware.value.scale,
  })
}

function selectCourseware(id: string) {
  coursewareStore.selectCourseware(id)
  syncCourseware()
  showFileDialog.value = false
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')

  if (!isPdf && !isImage) {
    ElMessage.error('只支持 PDF 和图片格式')
    return
  }

  if (file.size > 50 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 50MB')
    return
  }

  try {
    isUploading.value = true
    const base64Data = await readFileAsBase64(file)

    const newCourseware: Courseware = {
      id: `cw_${Date.now()}`,
      name: file.name,
      type: isPdf ? 'pdf' : 'image',
      url: base64Data,
      totalPages: 1,
      currentPage: 1,
      scale: 1,
      dataBase64: base64Data,
    }

    coursewareStore.addCourseware(newCourseware)
    coursewareStore.selectCourseware(newCourseware.id)
    ElMessage.success(`课件「${file.name}」添加成功`)
    syncCourseware()
  } catch (error) {
    console.error('文件读取失败:', error)
    ElMessage.error('文件读取失败，请重试')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="courseware-controls">
    <div class="controls-left">
      <button
        class="control-btn"
        @click="showFileDialog = true"
      >
        <el-icon>
          <Folder />
        </el-icon>
        <span>课件列表</span>
        <span v-if="coursewareList.length > 0" class="count-badge">
          {{ coursewareList.length }}
        </span>
      </button>

      <el-divider direction="vertical" />

      <button
        v-if="isTeacher"
        class="control-btn upload-btn"
        :class="{ loading: isUploading }"
        :disabled="isUploading"
        @click="triggerFileInput"
      >
        <el-icon :class="{ 'spin-icon': isUploading }">
          <Upload />
        </el-icon>
        <span>{{ isUploading ? '上传中...' : '上传课件' }}</span>
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          style="display: none"
          @change="handleFileUpload"
        />
      </button>

      <el-tooltip
        v-if="isTeacher"
        content="支持 PDF、JPG、PNG、GIF、WebP 格式，单文件不超过 50MB"
        placement="bottom"
      >
        <span class="help-icon">?</span>
      </el-tooltip>
    </div>

    <div class="controls-center">
      <button
        class="page-btn"
        :disabled="currentPage <= 1 || !currentCourseware"
        @click="firstPage"
        title="第一页"
      >
        <el-icon>
          <DArrowLeft />
        </el-icon>
      </button>

      <button
        class="page-btn"
        :disabled="currentPage <= 1 || !currentCourseware"
        @click="prevPage"
        title="上一页"
      >
        <el-icon>
          <ArrowLeft />
        </el-icon>
      </button>

      <div class="page-input-wrapper">
        <input
          v-model="targetPage"
          type="number"
          class="page-input"
          :placeholder="String(currentPage)"
          min="1"
          :max="totalPages"
          :disabled="!currentCourseware"
          @keyup.enter="goToPage"
        />
        <span class="page-sep">/</span>
        <span class="total-pages">{{ totalPages }}</span>
      </div>

      <button
        class="page-btn"
        :disabled="currentPage >= totalPages || !currentCourseware"
        @click="nextPage"
        title="下一页"
      >
        <el-icon>
          <ArrowRight />
        </el-icon>
      </button>

      <button
        class="page-btn"
        :disabled="currentPage >= totalPages || !currentCourseware"
        @click="lastPage"
        title="最后一页"
      >
        <el-icon>
          <DArrowRight />
        </el-icon>
      </button>
    </div>

    <div class="controls-right">
      <span v-if="currentCourseware" class="current-name" :title="currentCourseware.name">
        {{ currentCourseware.name }}
      </span>
      <span v-else class="empty-tip">请选择或上传课件</span>
    </div>

    <el-dialog
      v-model="showFileDialog"
      title="课件列表"
      width="460px"
      :close-on-click-modal="true"
    >
      <template v-if="isTeacher" #header>
        <div class="dialog-header">
          <span>课件列表</span>
          <button class="dialog-upload-btn" @click="triggerFileInput(), showFileDialog = false">
            <el-icon>
              <Upload />
            </el-icon>
            <span>上传新课件</span>
            <input
              ref="fileInputRef"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              style="display: none"
              @change="handleFileUpload($event), showFileDialog = false"
            />
          </button>
        </div>
      </template>

      <div class="courseware-list">
        <div
          v-for="cw in coursewareList"
          :key="cw.id"
          class="courseware-item"
          :class="{ active: cw.id === currentCourseware?.id }"
          @click="selectCourseware(cw.id)"
        >
          <div class="item-thumb">
            <el-icon class="thumb-icon">
              <Document v-if="cw.type === 'pdf'" />
              <Picture v-else />
            </el-icon>
            <span class="thumb-type">{{ cw.type === 'pdf' ? 'PDF' : 'IMG' }}</span>
          </div>
          <div class="item-info">
            <div class="item-name" :title="cw.name">{{ cw.name }}</div>
            <div class="item-meta">
              <span>{{ cw.totalPages }} 页</span>
              <span v-if="cw.id === currentCourseware?.id" class="current-tag">当前展示</span>
            </div>
          </div>
        </div>
        <div v-if="coursewareList.length === 0" class="empty-list">
          <el-icon :size="48" class="empty-icon">
            <Folder />
          </el-icon>
          <p>暂无课件</p>
          <button
            v-if="isTeacher"
            class="empty-upload-btn"
            @click="triggerFileInput(), showFileDialog = false"
          >
            立即上传
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.courseware-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: all 0.2s;
  position: relative;

  &:hover {
    color: #409eff;
    border-color: #409eff;
  }

  &.upload-btn {
    color: #409eff;
    border-color: #409eff;

    &:hover {
      background: #ecf5ff;
    }

    &:disabled,
    &.loading {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: #f0f2f5;
    color: #909399;
    border-radius: 9px;
    font-size: 11px;
  }

  .spin-icon {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 11px;
  cursor: help;
  font-style: normal;
  font-weight: 600;
}

.controls-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    color: #409eff;
    border-color: #409eff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.page-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.page-input {
  width: 50px;
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  text-align: center;
  font-size: 13px;
  color: #303133;

  &:focus {
    outline: none;
    border-color: #409eff;
  }

  &:disabled {
    background: #f5f7fa;
    color: #c0c4cc;
  }
}

.page-sep {
  color: #c0c4cc;
}

.total-pages {
  color: #606266;
  font-size: 13px;
  min-width: 24px;
}

.controls-right {
  min-width: 180px;
  max-width: 280px;
  text-align: right;
}

.current-name {
  font-size: 12px;
  color: #909399;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  vertical-align: middle;
}

.empty-tip {
  font-size: 12px;
  color: #c0c4cc;
  font-style: italic;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.dialog-upload-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #409eff;
  background: #fff;
  color: #409eff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    background: #ecf5ff;
  }
}

.courseware-list {
  max-height: 460px;
  overflow-y: auto;
}

.courseware-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 8px;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
    border-color: #409eff;
  }
}

.item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6edff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
  position: relative;

  .thumb-icon {
    font-size: 22px;
    color: #409eff;
  }

  .thumb-type {
    font-size: 10px;
    font-weight: 700;
    color: #409eff;
    letter-spacing: 0.5px;
  }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;

  .current-tag {
    padding: 1px 8px;
    background: rgba(103, 194, 58, 0.1);
    color: #67c23a;
    border-radius: 10px;
    font-weight: 500;
  }
}

.empty-list {
  text-align: center;
  padding: 50px 20px;
  color: #c0c4cc;

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  p {
    margin: 0 0 16px;
    font-size: 14px;
  }
}

.empty-upload-btn {
  padding: 8px 20px;
  border: 1px solid #409eff;
  background: #fff;
  color: #409eff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #409eff;
    color: #fff;
  }
}
</style>
