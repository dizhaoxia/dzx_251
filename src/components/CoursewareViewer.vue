<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick, onUnmounted } from 'vue'
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
const objectUrls = ref<string[]>([])

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

function dataUrlToBlobUrl(dataUrl: string): string {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const blob = new Blob([u8arr], { type: mime })
  const url = URL.createObjectURL(blob)
  objectUrls.value.push(url)
  return url
}

function isDataUrl(url: string): boolean {
  return url.startsWith('data:')
}

function revokeObjectUrls() {
  objectUrls.value.forEach(url => {
    try { URL.revokeObjectURL(url) } catch (e) {}
  })
  objectUrls.value = []
}

async function loadPdf(rawUrl: string) {
  isLoading.value = true
  try {
    let loadUrl = rawUrl
    if (isDataUrl(rawUrl)) {
      loadUrl = dataUrlToBlobUrl(rawUrl)
    }

    const loadingTask = pdfjsLib.getDocument({ url: loadUrl })
    pdfDoc.value = await loadingTask.promise

    if (coursewareStore.currentCourseware) {
      coursewareStore.currentCourseware.totalPages = pdfDoc.value.numPages
    }
    await renderPage(currentPage.value)
  } catch (error) {
    console.error('加载PDF失败:', error)
    ElMessage.error('加载PDF失败，文件可能已损坏或格式不正确')
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
    revokeObjectUrls()

    await nextTick()

    if (courseware.type === 'pdf') {
      await loadPdf(courseware.url)
    } else if (courseware.type === 'image') {
      let imgUrl = courseware.url
      if (isDataUrl(courseware.url)) {
        imgUrl = dataUrlToBlobUrl(courseware.url)
      }
      if (imageRef.value) {
        imageRef.value.src = imgUrl
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

onUnmounted(() => {
  revokeObjectUrls()
})
</script>

<template>
  <div class="courseware-viewer">
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <span class="courseware-name" :title="currentCourseware?.name">
          {{ currentCourseware?.name || '暂无课件' }}
        </span>
        <span v-if="totalPages > 0" class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 页
        </span>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" @click="zoomOut" title="缩小" :disabled="!currentCourseware">
          <el-icon>
            <ZoomOut />
          </el-icon>
        </button>
        <span class="scale-text">{{ Math.round(scale * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn" title="放大" :disabled="!currentCourseware">
          <el-icon>
            <ZoomIn />
          </el-icon>
        </button>
        <button class="tool-btn" @click="resetScale" title="重置" :disabled="!currentCourseware">
          <el-icon>
            <RefreshLeft />
          </el-icon>
        </button>
        <button class="tool-btn" @click="fitToScreen" title="适应屏幕" :disabled="!currentCourseware">
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
        <span>课件加载中...</span>
      </div>

      <div v-else-if="!currentCourseware" class="empty-courseware">
        <el-icon :size="72" class="empty-icon">
          <Picture />
        </el-icon>
        <h3 class="empty-title">暂无课件</h3>
        <p class="empty-desc">{{ isTeacher ? '请点击下方「上传课件」按钮添加教学内容' : '等待老师上传课件...' }}</p>
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
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.courseware-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.page-info {
  font-size: 12px;
  color: #909399;
  padding: 2px 10px;
  background: #f5f7fa;
  border-radius: 10px;
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

  &:hover:not(:disabled) {
    color: #409eff;
    border-color: #409eff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.scale-text {
  font-size: 12px;
  color: #606266;
  min-width: 40px;
  text-align: center;
  font-weight: 500;
}

.viewer-container {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  position: relative;
  box-sizing: border-box;
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
    color: #409eff;
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
  margin: auto;

  .empty-icon {
    margin-bottom: 20px;
    opacity: 0.5;
    color: #c0c4cc;
  }

  .empty-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #606266;
  }

  .empty-desc {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }
}

.content-wrapper {
  transform-origin: top center;
  transition: transform 0.2s ease;
  display: flex;
  justify-content: center;
}

.pdf-canvas {
  max-width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background: #fff;
}

.courseware-image {
  max-width: 100%;
  height: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
