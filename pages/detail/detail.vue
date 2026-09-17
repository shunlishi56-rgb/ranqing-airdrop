<template>
  <view class="page">
    <!-- 加载失败 / 空态 -->
    <view v-if="failed" class="empty">
      <image class="empty-icon" src="/static/toast/fail.png" mode="aspectFit" />
      <view class="empty-text">{{ failedMsg }}</view>
      <view class="btn-ghost back-btn" @click="goBack">返回重试</view>
    </view>

    <!-- 详情 -->
    <block v-else-if="parcel">
      <!-- 发送者卡片 -->
      <view class="card sender-card">
        <image class="avatar" :src="parcel.senderAvatarUrl || '/static/avatar.png'" mode="aspectFill" />
        <view class="sender-info">
          <text class="sender-name">{{ parcel.senderName }}</text>
          <text class="text-sub">{{ formatTime(parcel.createdAt) }}</text>
        </view>
        <view class="tag" :class="leftTagClass">{{ leftText }}</view>
      </view>

      <!-- 内容区 -->
      <view class="card">
        <!-- 文字 -->
        <block v-if="parcel.type === 'text'">
          <view class="content-text">{{ parcel.content }}</view>
        </block>

        <!-- 图片 -->
        <block v-if="parcel.type === 'images'">
          <view class="grid">
            <image
              v-for="(f, i) in parcel.files"
              :key="i"
              :src="f.url"
              mode="aspectFill"
              class="grid-item"
              @click="preview(i)"
            />
          </view>
        </block>

        <!-- 视频 -->
        <block v-if="parcel.type === 'video'">
          <video
            v-if="parcel.files[0]"
            :src="parcel.files[0].url"
            class="video"
            object-fit="contain"
            controls
          />
        </block>

        <!-- 文件 -->
        <block v-if="parcel.type === 'file'">
          <view class="file-box">
            <view class="file-info">
              <text class="file-name">{{ parcel.fileName }}</text>
              <text class="text-sub">{{ formatSize(parcel.fileSize) }}</text>
            </view>
            <view class="tag tag-blue" @click="openFile">打开文件</view>
          </view>
          <view class="type-tip">文件临时链接约 2 小时内有效，请及时保存</view>
        </block>
      </view>

      <!-- 免责声明与内容规范 -->
      <view class="card notice-card">
        <view class="notice-row">
          <text class="text-sub">{{ parcel.views }} 次浏览</text>
          <text class="text-sub">类型：{{ typeLabel }}</text>
        </view>
        <view class="divider"></view>
        <view class="notice-text">
          本平台仅提供内容临时中转服务，所有内容由用户自行上传，不代表平台立场。请勿使用本服务传播违法违规内容（包括但不限于涉黄、赌博、毒品、暴恐、诈骗、侵权及危害未成年人身心健康的信息）。内容设有有效期，到期自动删除。
        </view>
        <view class="divider"></view>
        <view class="notice-row">
          <text class="text-sub">发现违规内容？请截图保留证据</text>
          <view class="tag tag-red" @click="reportContent">举报此内容</view>
        </view>
      </view>

      <view class="actions">
        <view class="btn-main" @click="goBack">我已知晓</view>
      </view>

      <!-- 举报指引弹窗 -->
      <view v-if="showReport" class="report-mask" @click="showReport = false">
        <view class="report-dialog" @click.stop>
          <view class="report-grab"></view>
          <view class="report-title">举报违规内容</view>
          <image
            v-if="reportImgUrl"
            class="report-img"
            :src="reportImgUrl"
            mode="aspectFit"
            @click="previewReportImg"
          />
          <view class="report-text">长按识别二维码 / 点击图片可保存，按指引完成举报</view>
          <view v-if="parcel" class="report-code-row">
            <text class="text-sub">举报时请附上取件码：</text>
            <text class="report-code">{{ parcel.code }}</text>
            <view class="tag tag-blue" @click="copyReportCode">复制</view>
          </view>
          <view class="report-close" @click="showReport = false">我知道了</view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { callCloud, formatSize, formatTime, formatLeft, copyText } from '../../utils/cloud.js'

const parcel = ref(null)
const failed = ref(false)
const failedMsg = ref('')
const reportImgUrl = ref('') // 管理员配置的举报指引图
const showReport = ref(false) // 举报弹层显隐

const typeLabel = computed(() => {
  const map = { text: '文字', images: '图片', video: '视频', file: '文件' }
  return map[parcel.value?.type] || '未知'
})
const leftText = computed(() => (parcel.value ? formatLeft(parcel.value.expireAt) : ''))
const leftTagClass = computed(() => {
  if (!parcel.value) return 'tag'
  const diff = parcel.value.expireAt - Date.now()
  return diff < 24 * 3600 * 1000 ? 'tag tag-red' : 'tag tag-blue'
})

onLoad(async (opts) => {
  const code = (opts.code || '').trim()
  if (!code) {
    failed.value = true
    failedMsg.value = '取件码缺失'
    return
  }
  // 预加载举报指引图（login 返回配置，转临时链接）
  try {
    const u = await callCloud('login', {}, { loading: false, silent: true })
    if (u.reportImgFileID) {
      const r = await wx.cloud.getTempFileURL({ fileList: [u.reportImgFileID] })
      reportImgUrl.value = r.fileList[0].tempFileURL || ''
    }
  } catch (e) { /* 静默 */ }
  try {
    parcel.value = await callCloud('receive', { code }, { tip: '取件中…' })
  } catch (e) {
    failed.value = true
    failedMsg.value = e.message || '取件码无效或已过期'
  }
})

function preview(i) {
  uni.previewImage({
    urls: parcel.value.files.map((f) => f.url),
    current: i
  })
}

/** 下载并打开文件 */
function openFile() {
  const f = parcel.value.files[0]
  if (!f || !f.url) return
  uni.showLoading({ title: '下载中…', mask: true })
  uni.downloadFile({
    url: f.url,
    success: (res) => {
      uni.hideLoading()
      uni.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        fail: () => uni.showToast({ title: '该文件类型暂不支持预览', icon: 'none' })
      })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' })
    }
  })
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/index/index' })
  })
}

/** 举报：弹层展示指引图（后台可配）+ 取件码复制；无图回退文字指引 */
function reportContent() {
  showReport.value = true
}

/** 预览举报大图 */
function previewReportImg() {
  if (reportImgUrl.value) {
    uni.previewImage({ urls: [reportImgUrl.value] })
  }
}

/** 复制取件码（举报附证用） */
function copyReportCode() {
  if (!parcel.value) return
  copyText(parcel.value.code || '')
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding-bottom: 80rpx;
}

/* ===== 空态 ===== */
.empty {
  padding-top: 240rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
}
.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 40rpx;
  background: rgba(255, 59, 48, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #8E8E93;
}
.back-btn {
  width: 380rpx;
  margin-top: 20rpx;
}

/* ===== 发送者卡片 ===== */
.sender-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(120, 120, 128, 0.10);
}
.sender-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.sender-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1C1C1E;
}

/* ===== 文字内容 ===== */
.content-text {
  font-size: 30rpx;
  line-height: 1.8;
  word-break: break-all;
  white-space: pre-wrap;
  color: #1C1C1E;
}

/* ===== 图片九宫格 ===== */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.grid-item {
  width: 200rpx;
  height: 200rpx;
  border-radius: 20rpx;
  background: rgba(120, 120, 128, 0.08);
}

/* ===== 视频 ===== */
.video {
  width: 100%;
  height: 400rpx;
  border-radius: 20rpx;
}

/* ===== 文件 ===== */
.file-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 24rpx;
  padding: 28rpx;
}
.file-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  overflow: hidden;
}
.file-name {
  font-size: 28rpx;
  color: #1C1C1E;
  font-weight: 600;
  word-break: break-all;
}
.file-open {
  font-size: 24rpx;
  color: #ffffff;
  background: #007AFF;
  border-radius: 30rpx;
  padding: 12rpx 32rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(0, 122, 255, 0.25);
}
.file-open:active {
  opacity: 0.8;
}
.type-tip {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #FF3B30;
}

/* ===== 底部信息 ===== */
.notice-card {
  display: flex;
  flex-direction: column;
}
.notice-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.divider {
  height: 1rpx;
  background: rgba(60, 60, 67, 0.10);
  margin: 22rpx 0;
}
.notice-text {
  font-size: 22rpx;
  color: #8E8E93;
  line-height: 1.8;
}

.actions {
  margin-top: 44rpx;
  padding: 0 48rpx;
}

/* ===== 举报指引弹窗（iOS sheet） ===== */
.report-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.report-dialog {
  width: 100%;
  background: rgba(249, 249, 251, 0.96);
  backdrop-filter: blur(60rpx) saturate(1.8);
  border-radius: 44rpx 44rpx 0 0;
  padding: 20rpx 48rpx calc(56rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: sheetUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes sheetUp {
  from { transform: translateY(40%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.report-grab {
  width: 72rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: rgba(60, 60, 67, 0.22);
  margin-bottom: 28rpx;
}
.report-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.report-img {
  margin-top: 28rpx;
  width: 420rpx;
  height: 420rpx;
  border-radius: 28rpx;
  background: rgba(120, 120, 128, 0.08);
}
.report-text {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #8E8E93;
  text-align: center;
}
.report-code-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.report-code {
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
}
.report-close {
  margin-top: 32rpx;
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  border-radius: 48rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.28);
}
</style>
