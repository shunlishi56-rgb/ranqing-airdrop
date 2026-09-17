<template>
  <view class="page">
    <!-- 隐私授权弹窗（触发头像选择等隐私接口时自动弹出） -->
    <privacy-popup />

    <!-- 用户资料卡 -->
    <view class="card user-card">
      <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <image class="avatar" :src="avatarSrc" mode="aspectFill" />
        <view class="avatar-tip">换头像</view>
      </button>

      <view class="user-form">
        <view class="form-row">
          <text class="form-label">昵称</text>
          <input
            v-model="nickname"
            class="form-input"
            type="nickname"
            placeholder="点击输入昵称"
            :maxlength="12"
          />
        </view>
        <view class="save-btn" :class="{ disabled: saving }" @click="saveProfile">
          {{ saving ? '保存中…' : '保存资料' }}
        </view>
      </view>
    </view>

    <!-- 使用资格卡（仅卡密模式显示；免费开放模式隐藏整套卡密 UI） -->
    <view v-if="cardMode" class="card access-card">
      <view class="access-row">
        <view class="access-info">
          <text class="section-title access-title">使用资格</text>
          <view v-if="access.forever" class="tag tag-blue">永久有效</view>
          <view v-else-if="access.isTrial" class="tag tag-gold">体验中 · 剩 {{ accessLeftHours }} 小时</view>
          <view v-else-if="access.expireAt > 0" class="tag" :class="accessLeftDays > 3 ? 'tag-blue' : 'tag-red'">
            剩余 {{ accessLeftDays }} 天
          </view>
          <view v-else class="tag tag-red">未激活</view>
        </view>
        <view class="access-ops">
          <view class="tag tag-blue" @click="showGetCard = true">获取卡密</view>
        </view>
      </view>
      <view v-if="!access.forever && access.expireAt > 0" class="text-sub access-hint">
        {{ access.isTrial ? '体验结束后需兑换卡密继续使用，提前兑换时长顺延' : '到期时间：' + formatTime(access.expireAt) + '，到期前可再兑换卡密顺延' }}
      </view>
    </view>

    <!-- 我的空投 -->
    <view class="section-head">
      <text class="section-title">我的空投</text>
      <text class="text-sub" @click="refresh">刷新</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="list.length === 0" class="empty-tip">还没有发送过空投，去首页发一个吧</view>

    <view v-for="item in list" :key="item._id" class="card parcel-item">
      <view class="row1">
        <text class="item-code">{{ item.code }}</text>
        <text class="tag" :class="item.expired ? 'tag-red' : 'tag-blue'">
          {{ item.expired ? '已过期' : formatLeft(item.expireAt) }}
        </text>
      </view>
      <view class="row2">
        <text class="text-sub">
          {{ typeLabel(item.type) }}<template v-if="item.preview"> · {{ item.preview }}</template>
        </text>
        <text class="text-sub">{{ item.views }} 次浏览</text>
      </view>
      <view class="row3">
        <text class="text-sub">{{ formatTime(item.createdAt) }}</text>
        <view class="item-ops">
          <view v-if="!item.expired" class="tag tag-blue" @click="copyCode(item)">复制码</view>
          <view class="tag tag-red" @click="removeItem(item)">删除</view>
        </view>
      </view>
    </view>

    <!-- 最近接收 -->
    <view class="section-head recv-head">
      <text class="section-title">最近接收</text>
      <text class="text-sub">凭码查看过的空投</text>
    </view>

    <view v-if="recvLoading" class="loading">加载中…</view>
    <view v-else-if="recvList.length === 0" class="empty-tip">还没有接收过空投，输入取件码试试</view>

    <view v-for="item in recvList" :key="item.code" class="card parcel-item">
      <view class="row1">
        <text class="item-code">{{ item.code }}</text>
        <text class="tag" :class="item.expired ? 'tag-red' : 'tag-blue'">
          {{ item.expired ? '已失效' : '可查看' }}
        </text>
      </view>
      <view class="row2">
        <text class="text-sub">
          {{ typeLabel(item.type) }} · 来自 {{ item.senderName }}<template v-if="item.preview"> · {{ item.preview }}</template>
        </text>
      </view>
      <view class="row3">
        <text class="text-sub">查看于 {{ formatTime(item.viewedAt) }}</text>
        <view v-if="!item.expired" class="tag tag-blue" @click="viewAgain(item)">再次查看</view>
      </view>
    </view>

    <!-- 关于（连点 5 次唤出管理面板） -->
    <view class="about">
      <view @click="onAboutTap">苒晴空投 · 文件临时中转站</view>
      <view>内容到期自动销毁 · 仅供个人临时传阅</view>
      <view>违规内容举报：请附取件码及截图，发送至管理员邮箱</view>
    </view>

    <!-- 获取卡密弹窗（公众号展示） -->
    <view v-if="showGetCard" class="getcard-mask" @click="showGetCard = false">
      <view class="getcard-dialog" @click.stop>
        <view class="getcard-grab"></view>
        <view class="getcard-title">获取卡密</view>
        <image v-if="qrUrl" class="getcard-qr" :src="qrUrl" mode="aspectFit" @click="previewQr" />
        <view class="getcard-text">{{ qrText }}</view>
        <view class="getcard-sub">长按/点击二维码可保存，扫码关注后领取</view>
        <view class="getcard-close" @click="showGetCard = false">我知道了</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callCloud, uploadToCloud, formatTime, formatLeft, copyText } from '../../utils/cloud.js'

const user = ref({})
const nickname = ref('')
const avatarFileID = ref('')
const pendingAvatar = ref('') // 新选的头像临时路径
const saving = ref(false)
const list = ref([])
const loading = ref(false)
const recvList = ref([])
const recvLoading = ref(false)
const access = ref({ expireAt: 0, forever: false, isTrial: false })
const cardMode = ref(false) // 卡密门槛：默认隐藏（审核安全方向），login 显式返回 true 才展示
const showGetCard = ref(false)
const qrUrl = ref('')
const qrText = ref('关注公众号获取卡密')
let aboutTapCount = 0
let aboutTapTimer = null

const avatarSrc = computed(() => pendingAvatar.value || avatarFileID.value || '/static/avatar.png')

const accessLeftDays = computed(() => {
  const diff = access.value.expireAt - Date.now()
  return diff <= 0 ? 0 : Math.max(1, Math.ceil(diff / 86400000))
})

const accessLeftHours = computed(() => {
  const diff = access.value.expireAt - Date.now()
  return diff <= 0 ? 0 : Math.max(1, Math.ceil(diff / 3600000))
})

onShow(() => load())

async function load() {
  // 静默探测：未验证用户不弹任何提示
  try {
    const u = await callCloud('login', {}, { loading: false, silent: true })
    user.value = u
    nickname.value = u.nickname || ''
    avatarFileID.value = u.avatarFileID || ''
    access.value = { expireAt: u.expireAt || 0, forever: !!u.forever, isTrial: !!u.isTrial }
    cardMode.value = u.cardMode === true // 仅显式返回 true 才展示资格卡（旧版云函数无此字段=隐藏）
    qrText.value = u.qrText || '关注公众号获取卡密'
    // 二维码是云存储 fileID，转临时链接展示
    if (u.qrFileID) {
      try {
        const r = await wx.cloud.getTempFileURL({ fileList: [u.qrFileID] })
        qrUrl.value = r.fileList[0].tempFileURL || ''
      } catch (e) { /* 静默 */ }
    }
  } catch (e) {
    // login 失败：隐藏资格卡（审核安全方向）
    cardMode.value = false
  }
  loadRecv()
}

/** 加载最近接收列表 */
async function loadRecv() {
  recvLoading.value = true
  try {
    const data = await callCloud('received', {}, { loading: false, silent: true })
    recvList.value = data.list
  } catch (e) { /* 静默：未验证用户不弹提示 */ } finally {
    recvLoading.value = false
  }
}

/** 再次查看某条接收过的空投 */
function viewAgain(item) {
  uni.navigateTo({ url: `/pages/detail/detail?code=${item.code}` })
}

/** 关于区连点 5 次唤出管理面板（非管理员进入也无数据，无安全风险） */
function onAboutTap() {
  aboutTapCount++
  clearTimeout(aboutTapTimer)
  aboutTapTimer = setTimeout(() => {
    if (aboutTapCount >= 5) {
      uni.navigateTo({ url: '/pages/admin/admin' })
    }
    aboutTapCount = 0
  }, 600)
  if (aboutTapCount >= 5) {
    clearTimeout(aboutTapTimer)
    aboutTapCount = 0
    uni.navigateTo({ url: '/pages/admin/admin' })
  }
}

async function refresh() {
  loading.value = true
  try {
    const data = await callCloud('listMine', {}, { loading: false, silent: true })
    list.value = data.list
  } catch (e) { /* 静默：未验证用户不弹提示 */ } finally {
    loading.value = false
  }
}

/** 选择微信头像（官方标准能力） */
function onChooseAvatar(e) {
  pendingAvatar.value = e.detail.avatarUrl
}

/** 保存资料：昵称 + （若有新头像）先上传云存储 */
async function saveProfile() {
  if (saving.value) return
  const name = nickname.value.trim()
  if (!name) return uni.showToast({ title: '昵称不能为空', icon: 'none' })

  saving.value = true
  try {
    let newFileID = ''
    if (pendingAvatar.value) {
      uni.showLoading({ title: '上传头像…', mask: true })
      newFileID = await uploadToCloud(`avatars/${user.value._id}.png`, pendingAvatar.value)
      uni.hideLoading()
    }
    const res = await callCloud(
      'updateProfile',
      { nickname: name, avatarFileID: newFileID || undefined },
      { loading: false }
    )
    if (res.avatarFileID) avatarFileID.value = res.avatarFileID
    pendingAvatar.value = ''
    nickname.value = res.nickname
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { /* 已有 toast */ } finally {
    saving.value = false
  }
}

function typeLabel(t) {
  const map = { text: '文字', images: '图片', video: '视频', file: '文件' }
  return map[t] || '未知'
}

function copyCode(item) {
  copyText(item.code)
}

function removeItem(item) {
  uni.showModal({
    title: '删除空投',
    content: `删除取件码 ${item.code}？对方将无法再取件，文件即刻销毁。`,
    confirmColor: '#E65353',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await callCloud('deleteParcel', { id: item._id }, { tip: '删除中…' })
        list.value = list.value.filter((x) => x._id !== item._id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { /* 已有 toast */ }
    }
  })
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding-bottom: 80rpx;
}

/* ===== 用户卡（iOS 设置页式） ===== */
.user-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 40rpx 32rpx;
}
.avatar-btn {
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  line-height: 1;
  width: 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.avatar-btn::after {
  border: none;
}
.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(120, 120, 128, 0.10);
}
.avatar-tip {
  font-size: 20rpx;
  color: #007AFF;
}
.user-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 22rpx;
  padding: 22rpx 28rpx;
}
.form-label {
  font-size: 26rpx;
  color: #8E8E93;
  font-weight: 600;
}
.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #1C1C1E;
}
.save-btn {
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(0, 122, 255, 0.25);
}
.save-btn.disabled {
  background: rgba(0, 122, 255, 0.32);
  box-shadow: none;
}

/* ===== 使用资格卡 ===== */
.access-card {
  padding: 30rpx 32rpx;
}
.access-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.access-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.access-title {
  margin-bottom: 0;
}
.access-hint {
  margin-top: 14rpx;
}

/* ===== 列表 ===== */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 48rpx 8rpx;
}
.section-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1C1C1E;
}
.section-head .text-sub {
  color: #007AFF;
  font-weight: 600;
}
.recv-head {
  margin-top: 24rpx;
}
.recv-head .text-sub {
  color: #8E8E93;
  font-weight: normal;
}
.loading,
.empty-tip {
  text-align: center;
  color: #8E8E93;
  font-size: 24rpx;
  padding: 48rpx 0;
}
.parcel-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-code {
  font-size: 42rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
}
.row2,
.row3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-ops {
  display: flex;
  gap: 16rpx;
}

/* ===== 关于 ===== */
.about {
  margin-top: 70rpx;
  text-align: center;
  font-size: 22rpx;
  color: #AEAEB2;
  line-height: 1.9;
}

/* ===== 获取卡密弹窗（iOS sheet） ===== */
.getcard-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.getcard-dialog {
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
.getcard-grab {
  width: 72rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: rgba(60, 60, 67, 0.22);
  margin-bottom: 28rpx;
}
.getcard-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.getcard-qr {
  margin-top: 32rpx;
  width: 380rpx;
  height: 380rpx;
  border-radius: 28rpx;
  background: rgba(120, 120, 128, 0.08);
}
.getcard-text {
  margin-top: 28rpx;
  font-size: 28rpx;
  color: #1C1C1E;
  font-weight: 600;
  text-align: center;
}
.getcard-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8E8E93;
}
.getcard-close {
  margin-top: 36rpx;
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
