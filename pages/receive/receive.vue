<template>
  <view class="page">
    <!-- 顶部渐变头 -->
    <view class="hero">
      <view class="hero-icon">📦</view>
      <text class="hero-title">输入取件码</text>
      <text class="hero-sub">6 位数字</text>
    </view>

    <!-- 分格输入 -->
    <view class="card input-card">
      <view class="code-slots" @click="focusInput">
        <view v-for="i in 6" :key="i" class="slot" :class="{ filled: code.length >= i, current: code.length === i - 1 }">
          <text class="slot-char">{{ code[i - 1] || '' }}</text>
        </view>
      </view>
      <input
        ref="hiddenInput"
        v-model="code"
        class="hidden-input"
        type="number"
        :maxlength="6"
        :focus="autoFocus"
        @input="onInput"
      />
      <view class="hint">发送空投时会产生一个 6 位取件码</view>
      <view class="btn-main receive-btn" :class="{ disabled: code.length < 6 }" @click="doReceive">
        接 收
      </view>
    </view>

    <!-- 说明 -->
    <view class="intro card">
      <view class="intro-title">什么是空投？</view>
      <view class="intro-text">
        发送方将文字/图片/视频/文件临时存入苒晴空投，得到 6 位取件码；接收方输入取件码即可取出内容。
        内容有有效期（1/7/15 天），到期自动销毁，仅供个人临时传阅使用。
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const code = ref('')
const autoFocus = ref(true)

function focusInput() {
  autoFocus.value = false
  nextTick(() => {
    autoFocus.value = true
  })
}

function onInput(e) {
  // 只保留数字（纯数字取件码）
  code.value = String(e.detail.value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 6)
}

function doReceive() {
  const c = code.value.trim()
  if (c.length < 6) {
    uni.showToast({ title: '请输入完整 6 位取件码', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/detail/detail?code=${c}` })
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding-bottom: 60rpx;
}

/* ===== 大标题 ===== */
.hero {
  padding: 40rpx 44rpx 24rpx;
}
.hero-icon {
  font-size: 72rpx;
}
.hero-title {
  margin-top: 16rpx;
  font-size: 64rpx;
  font-weight: 800;
  color: #1C1C1E;
  letter-spacing: 1rpx;
}
.hero-sub {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #8E8E93;
  font-weight: 500;
}

/* ===== 分格输入 ===== */
.input-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.code-slots {
  display: flex;
  gap: 16rpx;
}
.slot {
  width: 92rpx;
  height: 112rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.slot.filled {
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(28, 28, 30, 0.08);
}
.slot.current {
  box-shadow: inset 0 0 0 3rpx #007AFF;
  background: #ffffff;
}
.slot-char {
  font-size: 48rpx;
  font-weight: 700;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
}
.hidden-input {
  position: absolute;
  left: -9999rpx;
  width: 10rpx;
  height: 10rpx;
  opacity: 0;
}
.hint {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #8E8E93;
}
.receive-btn {
  width: 100%;
  margin-top: 40rpx;
}

/* ===== 说明 ===== */
.intro {
  margin-top: 20rpx;
}
.intro-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
  margin-bottom: 14rpx;
}
.intro-text {
  font-size: 24rpx;
  color: #8E8E93;
  line-height: 1.8;
}
</style>
