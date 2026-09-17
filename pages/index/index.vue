<template>
  <view class="page">
    <!-- 状态栏占位（首页为自定义导航） -->
    <view :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- iOS 大标题导航 -->
    <view class="nav">
      <text class="nav-large">苒晴空投</text>
      <text class="nav-caption">文件临时中转 · 到期即焚</text>
    </view>

    <!-- 主操作 -->
    <view class="actions">
      <view class="send-card" @click="goSend">
        <view class="send-icon-wrap">
          <text class="send-icon">↑</text>
        </view>
        <view class="send-texts">
          <text class="send-title">发送空投</text>
          <text class="send-sub">文字 / 图片 / 视频 / 文件</text>
        </view>
        <text class="send-chevron">›</text>
      </view>

      <view class="recv-card" @click="goReceive">
        <view class="recv-icon-wrap">
          <text class="recv-icon">↓</text>
        </view>
        <view class="send-texts">
          <text class="send-title">接收空投</text>
          <text class="send-sub">输入 6 位取件码</text>
        </view>
        <text class="send-chevron">›</text>
      </view>
    </view>

    <!-- 最近一条我的空投 -->
    <view class="card latest-card">
      <block v-if="latest">
        <view class="latest-row1">
          <text class="latest-label">最近空投</text>
          <text class="tag" :class="latest.expired ? 'tag-red' : 'tag-blue'">
            {{ latest.expired ? '已过期' : formatLeft(latest.expireAt) }}
          </text>
        </view>
        <view class="latest-row2">
          <text class="latest-code">{{ latest.code }}</text>
          <view class="copy-btn" @click="copyCode">复制</view>
        </view>
        <view class="latest-row3">
          <text class="text-sub">
            {{ typeLabel(latest.type) }}<template v-if="latest.preview"> · {{ latest.preview }}</template>
          </text>
          <text class="text-sub">{{ formatTime(latest.createdAt) }}</text>
        </view>
      </block>
      <block v-else>
        <view class="latest-row1">
          <text class="latest-label">最近空投</text>
        </view>
        <view class="latest-empty" @click="goSend">
          <text>还没有空投，去发一个 →</text>
        </view>
      </block>
    </view>

    <!-- 使用说明入口 -->
    <view class="guide-entry card" @click="goGuide">
      <text class="guide-title">使用说明</text>
      <text class="guide-sub">怎么发 · 怎么收 · 常见问题</text>
      <text class="send-chevron">›</text>
    </view>

    <!-- 服务条款摘要 -->
    <view class="terms">
      使用本服务即表示同意遵守相关法律法规。禁止传播违法违规内容，一切后果由发送者本人承担；本平台仅提供临时中转，内容到期自动删除。
    </view>

    <!-- 底部导航（iOS 风格 tabbar） -->
    <view class="tabbar">
      <view class="tabbar-item" @click="noop">
        <text class="tab-icon active">⌂</text>
        <text class="tab-text active">首页</text>
      </view>
      <view class="tabbar-item" @click="goProfile">
        <text class="tab-icon">◍</text>
        <text class="tab-text">我的</text>
      </view>
    </view>

    <!-- 卡密兑换弹窗（仅卡密模式渲染；免费开放模式完全不显示） -->
    <view v-if="showInvite && cardMode" class="mask" @click="showInvite = false">
      <view class="invite-dialog" @click.stop>
        <view class="invite-grab"></view>
        <view class="invite-title">兑换卡密</view>
        <view class="invite-sub">发送空投需先兑换卡密，获得对应使用时长</view>
        <view class="invite-input-row">
          <input
            v-model="inviteInput"
            class="invite-input"
            placeholder="如 RQ7D-XXXX-XXXX"
            :maxlength="20"
            placeholder-class="invite-ph"
          />
        </view>
        <view class="invite-btn" :class="{ disabled: verifying }" @click="submitInviteCode(inviteInput)">
          {{ verifying ? '兑换中…' : '立即兑换' }}
        </view>
        <view class="invite-getcard" @click="goGetCard">没有卡密？去获取 →</view>
        <view class="invite-close" @click="showInvite = false">暂不使用</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callCloud, formatTime, formatLeft, copyText } from '../../utils/cloud.js'

const statusBarHeight = ref(20)
const latest = ref(null)
const userVerified = ref(true)
// 卡密门槛：默认 false（审核安全方向）——login 未返回或失败时按免费模式展示，不弹卡密窗
// 真实拦截在 send 云函数云端校验，前端展示只是引导层
const cardMode = ref(false)
const showInvite = ref(false)
const inviteInput = ref('')
const verifying = ref(false)

onShow(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
  // 静默登录建档 + 使用资格探测（不弹窗、不提示，点"发送"时才引导）
  callCloud('login', {}, { loading: false, silent: true })
    .then((u) => {
      cardMode.value = u.cardMode === true // 仅显式返回 true 才开启（旧版云函数无此字段=免费）
      userVerified.value = !!u.hasAccess
    })
    .catch(() => {
      // login 失败：按免费模式（审核安全），不弹任何卡密 UI
      cardMode.value = false
      userVerified.value = false
    })
  // 拉取最近一条我的空投（未验证时静默失败，不提示）
  callCloud('listMine', {}, { loading: false, silent: true })
    .then((data) => {
      latest.value = data.list[0] || null
    })
    .catch(() => {})
})

function goSend() {
  // 免费开放模式（cardMode=false）不拦截，也不弹卡密窗
  if (cardMode.value && !userVerified.value) {
    showInvite.value = true
    return
  }
  uni.navigateTo({ url: '/pages/send/send' })
}
function goReceive() {
  uni.navigateTo({ url: '/pages/receive/receive' })
}
function goProfile() {
  uni.navigateTo({ url: '/pages/profile/profile' })
}
function goGuide() {
  uni.navigateTo({ url: '/pages/guide/guide' })
}
function noop() {}

function typeLabel(t) {
  const map = { text: '文字', images: '图片', video: '视频', file: '文件' }
  return map[t] || '未知'
}

function copyCode() {
  copyText(latest.value.code)
}

/** 兑换卡密 */
function submitInviteCode(code) {
  if (verifying.value) return
  const c = String(code || '').trim().toUpperCase()
  if (!c) {
    uni.showToast({ title: '请输入卡密', icon: 'none' })
    return
  }
  verifying.value = true
  // silent 模式：错误由本函数统一提示，避免多处重复 toast
  callCloud('redeem', { code: c }, { loading: false, silent: true })
    .then((data) => {
      userVerified.value = true
      showInvite.value = false
      verifying.value = false
      uni.showToast({
        title: data.forever ? '兑换成功，永久有效' : '兑换成功',
        icon: 'success'
      })
    })
    .catch((err) => {
      verifying.value = false
      const msg = (err && err.message) || ''
      uni.showToast({ title: msg.includes('网络') ? '网络异常，请重试' : (msg || '卡密不正确'), icon: 'none' })
    })
}

/** 跳到我的页获取卡密 */
function goGetCard() {
  showInvite.value = false
  uni.navigateTo({ url: '/pages/profile/profile' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  display: flex;
  flex-direction: column;
  padding-bottom: 200rpx;
}

/* ===== iOS 大标题导航 ===== */
.nav {
  padding: 24rpx 44rpx 8rpx;
}
.nav-large {
  font-size: 68rpx;
  font-weight: 800;
  color: #1C1C1E;
  letter-spacing: 1rpx;
}
.nav-caption {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #8E8E93;
  font-weight: 500;
}

/* ===== 主操作卡片 ===== */
.actions {
  margin: 36rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.send-card,
.recv-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 36rpx 36rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(40rpx) saturate(1.8);
  box-shadow: 0 2rpx 12rpx rgba(28, 28, 30, 0.04),
              inset 0 0 0 1rpx rgba(255, 255, 255, 0.6);
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.send-card:active,
.recv-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}
.send-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 30rpx;
  background: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0, 122, 255, 0.30);
}
.send-icon {
  font-size: 52rpx;
  color: #ffffff;
  font-weight: 300;
}
.recv-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 30rpx;
  background: rgba(0, 122, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.recv-icon {
  font-size: 52rpx;
  color: #007AFF;
  font-weight: 300;
}
.send-texts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.send-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.send-sub {
  font-size: 24rpx;
  color: #8E8E93;
}
.send-chevron {
  font-size: 48rpx;
  color: #C7C7CC;
  font-weight: 300;
}

/* ===== 最近空投卡片 ===== */
.latest-card {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.latest-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.latest-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #8E8E93;
}
.latest-row2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.latest-code {
  font-size: 52rpx;
  font-weight: 700;
  letter-spacing: 12rpx;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
}
.copy-btn {
  font-size: 24rpx;
  color: #007AFF;
  background: rgba(0, 122, 255, 0.10);
  border-radius: 28rpx;
  padding: 10rpx 30rpx;
  font-weight: 600;
}
.copy-btn:active {
  opacity: 0.7;
}
.latest-row3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.latest-empty {
  padding: 28rpx 0 10rpx;
  text-align: center;
  font-size: 26rpx;
  color: #8E8E93;
}

/* ===== 使用说明入口 ===== */
.guide-entry {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx 32rpx;
}
.guide-entry:active {
  opacity: 0.8;
}
.guide-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.guide-sub {
  flex: 1;
  font-size: 24rpx;
  color: #8E8E93;
}

/* ===== 服务条款摘要 ===== */
.terms {
  margin: 36rpx 60rpx 0;
  text-align: center;
  font-size: 20rpx;
  color: #AEAEB2;
  line-height: 1.7;
}

/* ===== 底部导航（iOS tabbar） ===== */
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(110rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(249, 249, 251, 0.88);
  backdrop-filter: blur(40rpx) saturate(1.8);
  border-top: 1rpx solid rgba(60, 60, 67, 0.12);
  display: flex;
}
.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}
.tab-icon {
  font-size: 40rpx;
  color: #B0B0B5;
  line-height: 1.1;
}
.tab-icon.active {
  color: #007AFF;
}
.tab-text {
  font-size: 20rpx;
  color: #8E8E93;
  font-weight: 500;
}
.tab-text.active {
  color: #007AFF;
  font-weight: 600;
}

/* ===== 卡密兑换弹窗（iOS sheet 风） ===== */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.invite-dialog {
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
.invite-grab {
  width: 72rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: rgba(60, 60, 67, 0.22);
  margin-bottom: 28rpx;
}
.invite-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.invite-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8E8E93;
}
.invite-input-row {
  width: 100%;
  margin-top: 40rpx;
}
.invite-input {
  width: 100%;
  height: 108rpx;
  background: rgba(120, 120, 128, 0.10);
  border-radius: 24rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
  color: #1C1C1E;
}
.invite-ph {
  font-size: 26rpx;
  font-weight: normal;
  letter-spacing: 0;
  color: #B0B0B5;
}
.invite-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  margin-top: 32rpx;
  text-align: center;
  border-radius: 50rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.28);
}
.invite-btn.disabled {
  background: rgba(0, 122, 255, 0.32);
  box-shadow: none;
}
.invite-btn:active {
  opacity: 0.8;
}
.invite-getcard {
  margin-top: 28rpx;
  font-size: 26rpx;
  color: #007AFF;
  font-weight: 600;
}
.invite-close {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #8E8E93;
}
</style>
