<template>
  <view class="page">
    <!-- 使用流程 -->
    <view class="card">
      <view class="section-title">使用流程</view>

      <view class="step">
        <view class="step-num">1</view>
        <view class="step-body">
          <text class="step-title">发送空投</text>
          <text class="step-desc">首页点「发送空投」，选择内容类型：文字（≤1000字）、图片（≤9张）、视频（≤60秒）或文件（≤50MB），选好有效期后发送。</text>
        </view>
      </view>

      <view class="step">
        <view class="step-num">2</view>
        <view class="step-body">
          <text class="step-title">记住取件码</text>
          <text class="step-desc">发送成功后会生成 6 位数字取件码，复制发给好友，或口头告知。</text>
        </view>
      </view>

      <view class="step">
        <view class="step-num">3</view>
        <view class="step-body">
          <text class="step-title">好友取件</text>
          <text class="step-desc">对方打开小程序，点「接收空投」输入取件码，即可查看或下载内容。</text>
        </view>
      </view>
    </view>

    <!-- 发送说明 -->
    <view class="card">
      <view class="section-title">关于发送</view>
      <view class="qa">
        <view class="q">· 内容类型与限制</view>
        <view class="a">文字最长 1000 字；图片一次最多 9 张；视频最长 60 秒；文件从聊天记录选择，单个不超过 50MB。</view>
      </view>
      <view class="qa">
        <view class="q">· 有效期</view>
        <view class="a">发送时可选 1 / 7 / 15 天。到期后内容和文件自动销毁，无法恢复，请提醒对方及时取件。</view>
      </view>
      <view class="qa">
        <view class="q">· 内容审核</view>
        <view class="a">为遵守平台规范，文字和图片会经过微信内容安全审核，审核通过后才会生成取件码。</view>
      </view>
      <view class="qa">
        <view class="q">· 找回我的取件码</view>
        <view class="a">首页「最近空投」卡片可快速复制；「我的 - 我的空投」可查看全部历史取件码与剩余时间。</view>
      </view>
    </view>

    <!-- 接收说明 -->
    <view class="card">
      <view class="section-title">关于接收</view>
      <view class="qa">
        <view class="q">· 如何取件</view>
        <view class="a">首页点「接收空投」，输入 6 位数字取件码即可，接收不需要任何账号或资格。</view>
      </view>
      <view class="qa">
        <view class="q">· 保存内容</view>
        <view class="a">图片可长按保存到相册；文件点「打开文件」后可通过右上角菜单转发或保存；请务必在有效期内保存，过期即销毁。</view>
      </view>
      <view class="qa">
        <view class="q">· 查看过的空投</view>
        <view class="a">「我的 - 最近接收」记录你凭码查看过的空投，未过期的可点「再次查看」直达，不用重输取件码。</view>
      </view>
      <view class="qa">
        <view class="q">· 遇到违规内容</view>
        <view class="a">详情页点「举报此内容」，按提示截图留证并联系我们，核实后将立即删除并配合处理。</view>
      </view>
    </view>

    <!-- 常见问题 -->
    <view class="card">
      <view class="section-title">常见问题</view>
      <view class="qa">
        <view class="q">· 取件码提示无效？</view>
        <view class="a">请确认 6 位数字输入无误；空投可能已被发送者删除或已过有效期；过期的内容已销毁，无法找回。</view>
      </view>
      <view class="qa">
        <view class="q">· 文件打不开？</view>
        <view class="a">小程序内置预览支持常见文档格式（PDF/Word/Excel/PPT 等）；不支持的格式请下载后用对应应用打开。</view>
      </view>
      <view class="qa">
        <view class="q">· 发送失败？</view>
        <view class="a">检查网络后重试；文件过大（超 50MB）或内容未通过审核都会导致发送失败，请调整后重试。</view>
      </view>
      <view class="qa">
        <view class="q">· 内容安全吗？</view>
        <view class="a">所有内容仅通过取件码点对点分享，没有公开列表；到期内可随时由发送者删除；到期自动从服务器清除。</view>
      </view>
    </view>
  </view>
</template>

<script setup>
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding: 24rpx 0 60rpx;
}

/* ===== 步骤 ===== */
.step {
  display: flex;
  gap: 24rpx;
  padding: 20rpx 0;
}
.step + .step {
  border-top: 1rpx solid rgba(60, 60, 67, 0.08);
}
.step-num {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #007AFF;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.step-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.step-desc {
  font-size: 24rpx;
  color: #8E8E93;
  line-height: 1.7;
}

/* ===== Q&A ===== */
.qa {
  padding: 14rpx 0;
}
.qa + .qa {
  border-top: 1rpx solid rgba(60, 60, 67, 0.08);
}
.q {
  font-size: 27rpx;
  font-weight: 600;
  color: #1C1C1E;
  margin-bottom: 8rpx;
}
.a {
  font-size: 24rpx;
  color: #8E8E93;
  line-height: 1.7;
}
</style>
