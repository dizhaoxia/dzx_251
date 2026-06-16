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

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')

  if (!isPdf && !isImage) {
    ElMessage.error('只支持 PDF 和图片格式')
    return
  }

  const url = URL.createObjectURL(file)
  const newCourseware: Courseware = {
    id: `cw_${Date.now()}`,
    name: file.name,
    type: isPdf ? 'pdf' : 'image',
    url: url,
    totalPages: 1,
    currentPage: 1,
    scale: 1,
  }

  coursewareStore.addCourseware(newCourseware)
  coursewareStore.selectCourseware(newCourseware.id)
  ElMessage.success('课件添加成功')
  syncCourseware()

  input.value = ''
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
      </button>

      <el-divider direction="vertical" />

      <button
        v-if="isTeacher"
        class="control-btn upload-btn"
        @click="triggerFileInput"
      >
        <el-icon>
          <Upload />
        </el-icon>
        <span>上传课件</span>
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          style="display: none"
          @change="handleFileUpload"
        />
      </button>
    </div>

    <div class="controls-center">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="firstPage"
        title="第一页"
      >
        <el-icon>
          <DArrowLeft />
        </el-icon>
      </button>

      <button
        class="page-btn"
        :disabled="currentPage <= 1"
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
          @keyup.enter="goToPage"
        />
        <span class="page-sep">/</span>
        <span class="total-pages">{{ totalPages }}</span>
      </div>

      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
        title="下一页"
      >
        <el-icon>
          <ArrowRight />
        </el-icon>
      </button>

      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="lastPage"
        title="最后一页"
      >
        <el-icon>
          <DArrowRight />
        </el-icon>
      </button>
    </div>

    <div class="controls-right">
      <span v-if="currentCourseware" class="current-name">
        {{ currentCourseware.name }}
      </span>
    </div>

    <el-dialog
      v-model="showFileDialog"
      title="课件列表"
      width="400px"
    >
      <div class="courseware-list">
        <div
          v-for="cw in coursewareList"
          :key="cw.id"
          class="courseware-item"
          :class="{ active: cw.id === currentCourseware?.id }"
          @click="selectCourseware(cw.id)"
        >
          <el-icon class="item-icon">
            <Document v-if="cw.type === 'pdf'" />
            <Picture v-else />
          </el-icon>
          <span class="item-name">{{ cw.name }}</span>
          <span class="item-pages">{{ cw.totalPages }} 页</span>
        </div>
        <div v-if="coursewareList.length === 0" class="empty-list">
          暂无课件
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
  border-top: 1px solid #e4e7ed;
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
  }
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
  color: #606266;

  &:focus {
    outline: none;
    border-color: #409eff;
  }
}

.page-sep {
  color: #c0c4cc;
}

.total-pages {
  color: #606266;
  font-size: 13px;
}

.controls-right {
  min-width: 150px;
  text-align: right;
}

.current-name {
  font-size: 12px;
  color: #909399;
}

.courseware-list {
  max-height: 400px;
  overflow-y: auto;
}

.courseware-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
    border: 1px solid #409eff;
  }

  .item-icon {
    font-size: 20px;
    color: #409eff;
  }

  .item-name {
    flex: 1;
    font-size: 14px;
    color: #303133;
  }

  .item-pages {
    font-size: 12px;
    color: #909399;
  }
}

.empty-list {
  text-align: center;
  padding: 40px 0;
  color: #c0c4cc;
  font-size: 14px;
}
</style>
