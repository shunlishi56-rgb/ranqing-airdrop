<template>
  <view class="page">
    <!-- 隐私授权弹窗（触发上传等隐私接口时自动弹出） -->
    <privacy-popup />

    <!-- 类型选择 -->
    <view class="type-row">
      <view
        v-for="t in types"
        :key="t.key"
        class="type-card"
        :class="{ active: type === t.key }"
        @click="switchType(t.key)"
      >
        <image class="type-icon" :src="`/static/postinfo/${t.icon}`" mode="aspectFit" />
        <text class="type-name">{{ t.label }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="card content-card">
      <!-- 文字 -->
      <block v-if="type === 'text'">
        <textarea
          v-model="textContent"
          class="text-area"
          placeholder="请输入要空投的文字…"
          :maxlength="TEXT_MAX + 1"
          auto-height
        />
        <view class="counter" :class="{ over: textContent.length > TEXT_MAX }">
          {{ textContent.length }}/{{ TEXT_MAX }}
        </view>
        <view class="type-tip">文字最大 1000 字</view>
      </block>

      <!-- 图片：九宫格 -->
      <block v-if="type === 'images'">
        <view class="grid">
          <view v-for="(img, i) in images" :key="i" class="grid-item">
            <image :src="img" mode="aspectFill" @click="previewImage(i)" />
            <view class="del" @click="removeImage(i)">×</view>
          </view>
          <view v-if="images.length < IMAGE_MAX" class="grid-item add" @click="chooseImages">
            <text>+</text>
          </view>
        </view>
        <view class="type-tip">最多 {{ IMAGE_MAX }} 张，点击图片预览，点 × 删除</view>
      </block>

      <!-- 视频 -->
      <block v-if="type === 'video'">
        <view v-if="video.path" class="video-box">
          <video :src="video.path" class="video" object-fit="cover" />
          <view class="del video-del" @click="removeVideo">×</view>
        </view>
        <view v-else class="picker-box" @click="chooseVideo">
          <text class="picker-plus">+</text>
          <text class="text-sub">选择视频（最长 {{ VIDEO_MAX_DURATION }} 秒）</text>
        </view>
      </block>

      <!-- 文件 -->
      <block v-if="type === 'file'">
        <view v-if="file.name" class="file-box">
          <view class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="text-sub">{{ formatSize(file.size) }}</text>
          </view>
          <view class="tag tag-red" @click="removeFile">移除</view>
        </view>
        <view v-else class="picker-box" @click="chooseFile">
          <text class="picker-plus">+</text>
          <text class="text-sub">从聊天记录中选择文件（≤50MB）</text>
        </view>
      </block>
    </view>

    <!-- 有效期 -->
    <view class="card">
      <view class="section-title">有效期（到期自动销毁）</view>
      <view class="expire-row">
        <view
          v-for="opt in EXPIRE_OPTIONS"
          :key="opt.days"
          class="expire-item"
          :class="{ active: days === opt.days }"
          @click="days = opt.days"
        >
          <text class="expire-label">{{ opt.label }}</text>
          <text class="expire-desc">{{ opt.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 提示 -->
    <view class="notice">
      内容经微信内容安全审核通过后方可发送；到期或删除后即刻销毁，请及时取件。
      请勿发送违法违规内容（涉黄、赌博、毒品、暴恐、诈骗、侵权等），违规将封禁使用资格，情节严重者将依法向有关部门报告。
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn-main" :class="{ disabled: uploading }" @click="submit">
        {{ uploading ? '上传中…' : '发 送' }}
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="showSuccess" class="mask" @click="closeSuccess">
      <view class="dialog" @click.stop>
        <image class="dlg-icon" src="/static/toast/successful.png" mode="aspectFit" />
        <view class="dlg-title">空投发送成功</view>
        <view class="dlg-code">{{ resultCode }}</view>
        <view class="dlg-sub">将取件码告诉对方，即可凭码取件</view>
        <view class="dlg-btns">
          <view class="dlg-btn copy" @click="copyCode">复制取件码</view>
          <view class="dlg-btn plain" @click="closeSuccess">完成</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { callCloud, uploadToCloud, makeCloudPath, getExt, formatSize, copyText } from '../../utils/cloud.js'
import { TEXT_MAX, IMAGE_MAX, VIDEO_MAX_DURATION, EXPIRE_OPTIONS, FILE_MAX_SIZE } from '../../utils/config.js'

const types = [
  { key: 'text', label: '文字', icon: 'typetext.png' },
  { key: 'images', label: '图片', icon: 'typepic.png' },
  { key: 'video', label: '视频', icon: 'typevideo.png' },
  { key: 'file', label: '文件', icon: 'typeprivate.png' }
]

const type = ref('text')
const textContent = ref('')
const images = ref([])
const video = ref({})
const file = ref({})
const days = ref(1)
const uploading = ref(false)
const showSuccess = ref(false)
const resultCode = ref('')

function switchType(key) {
  if (uploading.value) return
  type.value = key
}

/* ---------- 隐私授权前置检查（返回 true=已授权可继续） ---------- */
function ensurePrivacy() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: () => {
          // 用户拒绝/未声明隐私指引 → onNeedPrivacyAuthorization 已由组件接管弹窗
          resolve(wx.getPrivacySetting ? false : true)
        }
      })
    } else {
      resolve(true) // 低版本基础库无此接口，走旧逻辑
    }
    // #endif
    // #ifndef MP-WEIXIN
    resolve(true)
    // #endif
  })
}

/* ---------- 图片 ---------- */
async function chooseImages() {
  const ok = await ensurePrivacy()
  if (!ok) return
  const left = IMAGE_MAX - images.value.length
  uni.chooseImage({
    count: left,
    sizeType: ['compressed'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths].slice(0, IMAGE_MAX)
    }
  })
}
function removeImage(i) {
  images.value.splice(i, 1)
}
function previewImage(i) {
  uni.previewImage({ urls: images.value, current: i })
}

/* ---------- 视频 ---------- */
async function chooseVideo() {
  const ok = await ensurePrivacy()
  if (!ok) return
  uni.chooseVideo({
    maxDuration: VIDEO_MAX_DURATION,
    success: (res) => {
      if (res.size > FILE_MAX_SIZE) {
        uni.showToast({ title: '视频过大（限50MB）', icon: 'none' })
        return
      }
      video.value = { path: res.tempFilePath, size: res.size }
    }
  })
}
function removeVideo() {
  video.value = {}
}

/* ---------- 文件 ---------- */
async function chooseFile() {
  const ok = await ensurePrivacy()
  if (!ok) return
  // #ifdef MP-WEIXIN
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    success: (res) => {
      const f = res.tempFiles[0]
      if (!f) return
      if (f.size > FILE_MAX_SIZE) {
        uni.showToast({ title: '文件过大（限50MB）', icon: 'none' })
        return
      }
      file.value = { path: f.path, name: f.name, size: f.size }
    }
  })
  // #endif
}
function removeFile() {
  file.value = {}
}

/* ---------- 提交 ---------- */
async function submit() {
  if (uploading.value) return
  const t = type.value

  if (t === 'text') {
    if (!textContent.value.trim()) return uni.showToast({ title: '请输入内容', icon: 'none' })
    if (textContent.value.length > TEXT_MAX) {
      return uni.showToast({ title: `文字最多 ${TEXT_MAX} 字`, icon: 'none' })
    }
    await doSend({ type: 'text', content: textContent.value })
    return
  }
  if (t === 'images') {
    if (images.value.length === 0) return uni.showToast({ title: '请选择图片', icon: 'none' })
    const fileIDs = await uploadAll(images.value)
    await doSend({ type: 'images', fileIDs })
    return
  }
  if (t === 'video') {
    if (!video.value.path) return uni.showToast({ title: '请选择视频', icon: 'none' })
    const fid = await uploadOne(video.value.path)
    await doSend({ type: 'video', fileIDs: [fid] })
    return
  }
  if (t === 'file') {
    if (!file.value.path) return uni.showToast({ title: '请选择文件', icon: 'none' })
    const fid = await uploadOne(file.value.path, file.value.name)
    await doSend({ type: 'file', fileIDs: [fid], fileName: file.value.name, fileSize: file.value.size })
  }
}

/** 批量上传本地文件 → fileID 数组 */
async function uploadAll(paths) {
  uploading.value = true
  uni.showLoading({ title: `上传中 0/${paths.length}`, mask: true })
  try {
    let done = 0
    const tasks = paths.map((p) =>
      uploadToCloud(makeCloudPath(getExt(p)), p).then((fid) => {
        done++
        uni.showLoading({ title: `上传中 ${done}/${paths.length}`, mask: true })
        return fid
      })
    )
    return await Promise.all(tasks)
  } catch (e) {
    uni.hideLoading()
    uploading.value = false
    uni.showToast({ title: '上传失败，请检查网络后重试', icon: 'none' })
    throw e
  }
}

/** 上传单个文件 → fileID */
async function uploadOne(path, name) {
  uploading.value = true
  uni.showLoading({ title: '上传中…', mask: true })
  try {
    return await uploadToCloud(makeCloudPath(getExt(path, name)), path)
  } catch (e) {
    uni.hideLoading()
    uploading.value = false
    uni.showToast({ title: '上传失败，请检查网络后重试', icon: 'none' })
    throw e
  }
}

/** 调用云函数生成取件码 */
async function doSend(payload) {
  try {
    const data = await callCloud('send', { ...payload, days: days.value }, { loading: false, tip: '' })
    uni.hideLoading()
    uploading.value = false
    resultCode.value = data.code
    showSuccess.value = true
    // 重置表单
    textContent.value = ''
    images.value = []
    video.value = {}
    file.value = {}
  } catch (e) {
    uploading.value = false
  }
}

function copyCode() {
  copyText(resultCode.value)
}
function closeSuccess() {
  showSuccess.value = false
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding-bottom: 80rpx;
}

/* ===== 类型分段器（iOS segmented 风） ===== */
.type-row {
  margin: 20rpx 32rpx 0;
  background: rgba(120, 120, 128, 0.10);
  border-radius: 24rpx;
  padding: 8rpx;
  display: flex;
  gap: 6rpx;
}
.type-card {
  flex: 1;
  border-radius: 18rpx;
  padding: 20rpx 0 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.15s ease;
}
.type-card.active {
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(28, 28, 30, 0.10);
}
.type-icon {
  width: 56rpx;
  height: 56rpx;
  opacity: 0.45;
}
.type-card.active .type-icon {
  opacity: 1;
}
.type-name {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8E8E93;
  font-weight: 500;
}
.type-card.active .type-name {
  color: #1C1C1E;
  font-weight: 700;
}

/* ===== 内容卡片 ===== */
.content-card {
  min-height: 320rpx;
  margin-top: 20rpx;
}
.text-area {
  width: 100%;
  min-height: 280rpx;
  font-size: 30rpx;
  line-height: 1.7;
  color: #1C1C1E;
}
.counter {
  margin-top: 16rpx;
  text-align: right;
  font-size: 24rpx;
  color: #AEAEB2;
  font-family: 'SF Mono', Menlo, monospace;
}
.counter.over {
  color: #FF3B30;
}
.type-tip {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #007AFF;
}

/* ===== 图片九宫格 ===== */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.grid-item {
  position: relative;
  width: 196rpx;
  height: 196rpx;
  border-radius: 20rpx;
  overflow: hidden;
}
.grid-item image {
  width: 100%;
  height: 100%;
}
.grid-item.add {
  border: none;
  background: rgba(120, 120, 128, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  color: #AEAEB2;
  font-weight: 200;
}
.del {
  position: absolute;
  top: 0;
  right: 0;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border-radius: 0 0 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

/* ===== 视频 / 文件选择占位 ===== */
.picker-box {
  height: 280rpx;
  border-radius: 24rpx;
  background: rgba(120, 120, 128, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.picker-plus {
  font-size: 64rpx;
  color: #AEAEB2;
  font-weight: 200;
  line-height: 1;
}
.video-box {
  position: relative;
}
.video {
  width: 100%;
  height: 380rpx;
  border-radius: 20rpx;
}
.video-del {
  top: 14rpx;
  right: 14rpx;
  border-radius: 50%;
}
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
  word-break: break-all;
  font-weight: 600;
}

/* ===== 有效期（iOS 胶囊） ===== */
.expire-row {
  display: flex;
  gap: 12rpx;
}
.expire-item {
  flex: 1;
  border-radius: 20rpx;
  padding: 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  background: rgba(120, 120, 128, 0.08);
  transition: all 0.15s ease;
}
.expire-item.active {
  background: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(28, 28, 30, 0.10),
              inset 0 0 0 2rpx #007AFF;
}
.expire-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1C1E;
}
.expire-item.active .expire-label {
  color: #007AFF;
}
.expire-desc {
  font-size: 20rpx;
  color: #8E8E93;
}

.notice {
  margin: 24rpx 44rpx 0;
  font-size: 22rpx;
  color: #8E8E93;
  line-height: 1.8;
  text-align: center;
}

.actions {
  margin-top: 48rpx;
  padding: 0 48rpx;
}

/* ===== 成功弹窗（iOS 弹窗风） ===== */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 620rpx;
  background: rgba(249, 249, 251, 0.96);
  backdrop-filter: blur(60rpx) saturate(1.8);
  border-radius: 44rpx;
  padding: 56rpx 48rpx 44rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: popIn 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes popIn {
  from { transform: scale(0.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.dlg-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: rgba(52, 199, 89, 0.12);
  padding: 16rpx;
}
.dlg-title {
  margin-top: 24rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.dlg-code {
  margin-top: 28rpx;
  font-size: 80rpx;
  font-weight: 800;
  letter-spacing: 14rpx;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
}
.dlg-sub {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #8E8E93;
}
.dlg-btns {
  margin-top: 44rpx;
  width: 100%;
  display: flex;
  gap: 16rpx;
}
.dlg-btn {
  flex: 1;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 46rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.dlg-btn.copy {
  background: #007AFF;
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.28);
}
.dlg-btn.plain {
  background: rgba(120, 120, 128, 0.12);
  color: #1C1C1E;
}
</style>
