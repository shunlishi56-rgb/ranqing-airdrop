<script>
import { CLOUD_ENV } from './utils/config.js'

export default {
  onLaunch() {
    // #ifdef MP-WEIXIN
    if (!wx.cloud) {
      console.error('基础库版本过低（需 2.2.3+），无法使用云能力')
      uni.showModal({ title: '提示', content: '当前微信版本过低，请升级微信后使用', showCancel: false })
      return
    }
    wx.cloud.init({
      env: CLOUD_ENV || undefined,
      traceUser: true
    })

    // ===== 微信隐私协议（2023.9.15 起强制）=====
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        uni.$emit('privacy-needed', { resolve })
      })
    }
    // #endif
  }
}
</script>

<style>
/* ================= 设计令牌：iOS 磨砂玻璃极简风 ================= */
page {
  background: #F2F3F7;
  font-size: 28rpx;
  color: #1C1C1E;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2rpx;
}

/* ---------- 玻璃卡片（磨砂分组） ---------- */
.card {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(40rpx) saturate(1.8);
  -webkit-backdrop-filter: blur(40rpx) saturate(1.8);
  border-radius: 32rpx;
  margin: 20rpx 32rpx;
  padding: 36rpx 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(28, 28, 30, 0.04),
              inset 0 0 0 1rpx rgba(255, 255, 255, 0.6);
}

/* ---------- 主按钮（iOS 蓝，实心胶囊） ---------- */
.btn-main {
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  letter-spacing: 4rpx;
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.btn-main:active {
  opacity: 0.75;
  transform: scale(0.98);
}
.btn-main.disabled {
  background: rgba(0, 122, 255, 0.32);
}

/* ---------- 次按钮（玻璃描边） ---------- */
.btn-ghost {
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20rpx);
  color: #007AFF;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  letter-spacing: 4rpx;
  box-shadow: inset 0 0 0 1.5rpx rgba(0, 122, 255, 0.28);
  transition: opacity 0.12s ease;
}
.btn-ghost:active {
  opacity: 0.75;
}

/* ---------- 小标签 ---------- */
.tag {
  display: inline-flex;
  align-items: center;
  font-size: 22rpx;
  color: #8E8E93;
  background: rgba(120, 120, 128, 0.12);
  border-radius: 12rpx;
  padding: 6rpx 16rpx;
  font-weight: 500;
}
.tag-blue {
  color: #007AFF;
  background: rgba(0, 122, 255, 0.10);
}
.tag-red {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.10);
}
.tag-gold {
  color: #C77C00;
  background: rgba(199, 124, 0, 0.10);
}
.tag-green {
  color: #34C759;
  background: rgba(52, 199, 89, 0.12);
}

.text-main { color: #007AFF; }
.text-sub { color: #8E8E93; font-size: 24rpx; }
.text-red { color: #FF3B30; }

/* ---------- 分区大标题（iOS Large Title） ---------- */
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
  margin-bottom: 24rpx;
  letter-spacing: 0.5rpx;
}

/* ---------- 输入框 ---------- */
.input-soft {
  height: 96rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 20rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  color: #1C1C1E;
}
</style>
