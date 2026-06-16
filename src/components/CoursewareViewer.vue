<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useCoursewareStore } from '@/stores/courseware'
import * as pdfjsLib from 'pdfjs-dist'
import { ElMessage } from 'element-plus'
import {
  ZoomIn,
  ZoomOut,
  RefreshLeft,
  Picture,
} from '@element-plus/icons-vue'

const props = defineProps<{
  isTeacher?: boolean
}>()

const coursewareStore = useCoursewareStore()
const currentCourseware = computed(() => coursewareStore.currentCourseware)
const scale = computed(() => currentCourseware.value?.scale || 1)
const currentPage = computed(() => currentCourseware.value?.currentPage || 1)
const totalPages = computed(() => currentCourseware.value?.totalPages || 0)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)
const pdfDoc = ref<pdfjsLib.PDFDocumentProxy | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

async function loadPdf(url: string) {
  isLoading.value = true
  try {
    const loadingTask = pdfjsLib.getDocument({ url })
    pdfDoc.value = await loadingTask.promise
    coursewareStore.currentCourseware!.totalPages = pdfDoc.value.numPages
    renderPage(currentPage.value)
  } catch (error) {
    console.error('加载PDF失败:', error)
    ElMessage.error('加载课件失败')
  } finally {
    isLoading.value = false
  }
}

async function renderPage(pageNum: number) {
  if (!pdfDoc.value || !canvasRef.value) return

  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value * 1.5 })
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')!

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise
  } catch (error) {
    console.error('渲染页面失败:', error)
  }
}

function handleImageLoad() {
  isLoading.value = false
}

function zoomIn() {
  coursewareStore.zoomIn()
}

function zoomOut() {
  coursewareStore.zoomOut()
}

function resetScale() {
  coursewareStore.resetScale()
}

function fitToScreen() {
  if (!containerRef.value) return
  if (currentCourseware.value?.type === 'pdf' && pdfDoc.value) {
    coursewareStore.setScale(0.8)
  } else if (currentCourseware.value?.type === 'image') {
    coursewareStore.setScale(1)
  }
}

watch(
  () => currentCourseware.value,
  async (courseware) => {
    if (!courseware) return
    isLoading.value = true
    pdfDoc.value = null

    await nextTick()

    if (courseware.type === 'pdf') {
      loadPdf(courseware.url)
    } else if (courseware.type === 'image') {
      if (imageRef.value) {
        imageRef.value.src = courseware.url
      }
      isLoading.value = false
    }
  },
  { immediate: true }
)

watch(
  () => currentPage.value,
  (page) => {
    if (currentCourseware.value?.type === 'pdf') {
      renderPage(page)
    }
  }
)

watch(
  () => scale.value,
  () => {
    if (currentCourseware.value?.type === 'pdf' && currentPage.value) {
      renderPage(currentPage.value)
    }
  }
)

onMounted(() => {
  if (currentCourseware.value?.type === 'pdf' && currentCourseware.value.url) {
    loadPdf(currentCourseware.value.url)
  }
})
</script>

<template>
  <div class="courseware-viewer">
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <span class="courseware-name">{{ currentCourseware?.name || '暂无课件' }}</span>
        <span v-if="totalPages > 0" class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 页
        </span>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" @click="zoomOut" title="缩小">
          <el-icon>
            <ZoomOut />
          </el-icon>
        </button>
        <span class="scale-text">{{ Math.round(scale * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn" title="放大">
          <el-icon>
            <ZoomIn />
          </el-icon>
        </button>
        <button class="tool-btn" @click="resetScale" title="重置">
          <el-icon>
            <RefreshLeft />
          </el-icon>
        </button>
        <button class="tool-btn" @click="fitToScreen" title="适应屏幕">
          <el-icon>
            <Picture />
          </el-icon>
        </button>
      </div>
    </div>

    <div ref="containerRef" class="viewer-container">
      <div v-if="isLoading" class="loading">
        <el-icon class="loading-icon" :size="32">
          <RefreshLeft />
        </el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="!currentCourseware" class="empty-courseware">
        <el-icon :size="64" class="empty-icon">
          <Picture />
        </el-icon>
        <p>暂无课件</p>
      </div>

      <div
        v-else
        class="content-wrapper"
        :style="{ transform: `scale(${scale})` }"
      >
        <canvas
          v-if="currentCourseware.type === 'pdf'"
          ref="canvasRef"
          class="pdf-canvas"
        />
        <img
          v-else-if="currentCourseware.type === 'image'"
          ref="imageRef"
          :src="currentCourseware.url"
          class="courseware-image"
          @load="handleImageLoad"
          @error="isLoading = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.courseware-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.courseware-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.page-info {
  font-size: 12px;
  color: #909399;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
    border-color: #409eff;
  }
}

.scale-text {
  font-size: 12px;
  color: #606266;
  min-width: 40px;
  text-align: center;
}

.viewer-container {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #909399;

  .loading-icon {
    animation: spin 1s linear infinite;
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

.empty-courseware {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  margin-top: 100px;

  .empty-icon {
    margin-bottom: 16px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

.content-wrapper {
  transform-origin: top center;
  transition: transform 0.2s ease;
}

.pdf-canvas {
  max-width: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.courseware-image {
  max-width: 100%;
  height: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
