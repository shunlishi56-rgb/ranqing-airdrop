<template>
  <view v-if="show" class="privacy-mask">
    <view class="privacy-dialog">
      <view class="privacy-deco"></view>
      <view class="privacy-icon">🛡️</view>
      <view class="privacy-title">用户隐私保护提示</view>
      <view class="privacy-text">
        在使用苒晴空投前，请阅读
        <text class="privacy-link" @click="openAgreement">《用户隐私保护指引》</text>
        。如您同意，请点击"同意"开始接受服务。
      </view>
      <view class="privacy-detail">
        为提供空投服务，我们将在你主动使用时收集：微信昵称与头像（用于空投展示）、你上传的内容（到期自动销毁）。
      </view>
      <view class="privacy-btns">
        <view class="privacy-btn reject" @click="onReject">拒绝</view>
        <!-- 必须用原生 button + open-type="agreePrivacyAuthorization"，
             微信靠点击该按钮记录授权，view 模拟按钮会导致同意后接口仍被拦截 -->
        <button
          class="privacy-btn agree"
          id="agree-btn"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onAgree"
        >同意</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const show = ref(false)
let pendingResolve = null

onMounted(() => {
  // App.vue 里 wx.onNeedPrivacyAuthorization 触发时广播此事件
  uni.$on('privacy-needed', ({ resolve }) => {
    pendingResolve = resolve
    show.value = true
  })
})

onUnmounted(() => {
  uni.$off('privacy-needed')
})

function onAgree() {
  // 用户点击官方授权按钮（open-type="agreePrivacyAuthorization"）：
  // 微信已自动记录同意，这里只需关弹窗并放行被挂起的隐私接口
  show.value = false
  if (pendingResolve) {
    pendingResolve({ buttonId: 'agree-btn', event: 'agree' })
    pendingResolve = null
  }
}

function onReject() {
  show.value = false
  if (pendingResolve) {
    pendingResolve({ event: 'disagree' })
    pendingResolve = null
  }
  uni.showToast({ title: '需同意隐私协议后才能使用该功能', icon: 'none' })
}

function openAgreement() {
  // 跳转到隐私协议页（微信内置协议页）
  // #ifdef MP-WEIXIN
  if (wx.openPrivacyContract) {
    wx.openPrivacyContract({
      fail: () => {
        uni.showToast({ title: '暂无法打开协议，请在设置中查看', icon: 'none' })
      }
    })
  }
  // #endif
}
</script>

<style scoped>
.privacy-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 26, 46, 0.55);
  backdrop-filter: blur(8rpx);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.privacy-dialog {
  width: 640rpx;
  background: #ffffff;
  border-radius: 36rpx;
  padding: 52rpx 44rpx 40rpx;
  position: relative;
  overflow: hidden;
  animation: privacyIn 0.25s ease;
}
@keyframes privacyIn {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.privacy-deco {
  position: absolute;
  top: -110rpx;
  right: -110rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8F1FF, #D6E7FF);
}
.privacy-icon {
  font-size: 64rpx;
  text-align: center;
  position: relative;
}
.privacy-title {
  margin-top: 20rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #1A2233;
  text-align: center;
  position: relative;
}
.privacy-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #4A586C;
  line-height: 1.8;
  position: relative;
}
.privacy-link {
  color: #3D7BF4;
  font-weight: 600;
}
.privacy-detail {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: #9AA7B8;
  line-height: 1.7;
  background: #F6FAFF;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  position: relative;
}
.privacy-btns {
  margin-top: 40rpx;
  display: flex;
  gap: 20rpx;
  position: relative;
}
.privacy-btn {
  flex: 1;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 46rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.privacy-btn.reject {
  background: #EFF3F9;
  color: #6B7A90;
}
.privacy-btn.agree {
  background: linear-gradient(135deg, #4C9BFF 0%, #3D7BF4 100%);
  color: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(61, 123, 244, 0.32);
}
.privacy-btn:active {
  transform: scale(0.98);
}

/* 原生 button 默认样式重置（去边框/边距/固定宽，融入胶囊按钮风格） */
.privacy-btn.agree {
  margin: 0;
  padding: 0;
  width: auto;
}
.privacy-btn.agree::after {
  border: none;
}
</style>
