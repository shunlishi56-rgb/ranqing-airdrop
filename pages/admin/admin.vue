<template>
  <view class="page">
    <!-- 隐私授权弹窗（管理页选二维码/举报图会触发隐私检查） -->
    <privacy-popup />
    <!-- 未绑定管理员：首次绑定 -->
    <view v-if="mode === 'bind'" class="card bind-card">
      <view class="bind-title">绑定管理员</view>
      <view class="bind-sub">首次使用请输入绑定密钥，将当前微信号绑定为管理员</view>
      <input
        v-model="bindKey"
        class="bind-input"
        placeholder="请输入绑定密钥"
        :maxlength="30"
      />
      <view class="bind-btn" @click="doBind">绑定</view>
    </view>

    <!-- 管理面板 -->
    <block v-else-if="mode === 'admin'">
      <!-- 数据看板 -->
      <view class="board">
        <view class="board-row">
          <view class="board-item">
            <text class="board-num">{{ stats.totalParcels }}</text>
            <text class="board-label">总空投</text>
          </view>
          <view class="board-item">
            <text class="board-num">{{ stats.todayParcels }}</text>
            <text class="board-label">今日新增</text>
          </view>
          <view class="board-item">
            <text class="board-num">{{ stats.activeParcels }}</text>
            <text class="board-label">有效中</text>
          </view>
        </view>
        <view class="board-row">
          <view class="board-item">
            <text class="board-num">{{ stats.totalUsers }}</text>
            <text class="board-label">用户数</text>
          </view>
          <view class="board-item">
            <text class="board-num">{{ stats.totalViews }}</text>
            <text class="board-label">总浏览量</text>
          </view>
          <view class="board-item" @click="refreshAll">
            <text class="board-num refresh-icon">↻</text>
            <text class="board-label">刷新</text>
          </view>
        </view>
      </view>

      <!-- 卡密系统 -->
      <view class="card">
        <view class="section-title">卡密系统</view>
        <view class="switch-row">
          <view class="switch-info">
            <text class="switch-label">卡密门槛</text>
            <text class="text-sub">{{ inviteEnabled ? '开启中：发送空投需兑换卡密（新用户12小时体验）' : '已关闭：所有人免费使用（提审时请保持此状态）' }}</text>
          </view>
          <switch :checked="inviteEnabled" color="#3D7BF4" @change="toggleInvite" />
        </view>

        <block v-if="inviteEnabled">
          <!-- 发卡 -->
          <view class="card-sub-title">批量发卡</view>
          <view class="gen-row">
            <view class="gen-item" :class="{ active: genDays === 1 }" @click="genDays = 1">1天</view>
            <view class="gen-item" :class="{ active: genDays === 7 }" @click="genDays = 7">7天</view>
            <view class="gen-item" :class="{ active: genDays === 30 }" @click="genDays = 30">30天</view>
            <view class="gen-item" :class="{ active: genDays === 0 }" @click="genDays = 0">永久</view>
          </view>
          <view class="invite-row" style="margin-top: 16rpx">
            <input v-model="genCount" class="invite-input" type="number" placeholder="数量（1-50）" :maxlength="2" />
            <view class="invite-save" @click="generateCards">生成</view>
          </view>

          <!-- 生成结果 -->
          <view v-if="genResult.length > 0" class="gen-result">
            <view class="text-sub">已生成 {{ genResult.length }} 张（长按可复制）：</view>
            <view class="gen-codes" @longpress="copyCards">{{ genResult.join('\n') }}</view>
            <view class="tag tag-blue" @click="copyCards">一键复制全部</view>
          </view>

          <!-- 卡列表 -->
          <view class="card-sub-title">卡密记录</view>
          <view class="card-filter">
            <view class="filter-item" :class="{ active: cardFilter === '' }" @click="cardFilter = ''; loadCards()">全部</view>
            <view class="filter-item" :class="{ active: cardFilter === 'unused' }" @click="cardFilter = 'unused'; loadCards()">未使用</view>
            <view class="filter-item" :class="{ active: cardFilter === 'used' }" @click="cardFilter = 'used'; loadCards()">已兑换</view>
          </view>
          <view v-if="cardsLoading" class="loading">加载中…</view>
          <view v-else-if="cards.length === 0" class="empty-tip">暂无卡密</view>
          <view v-for="c in cards" :key="c.code" class="card-item">
            <view class="card-item-row1">
              <text class="card-code">{{ c.code }}</text>
              <text class="tag" :class="c.status === 'unused' ? 'tag-blue' : (c.status === 'used' ? 'tag' : 'tag-red')">
                {{ c.status === 'unused' ? '未使用' : (c.status === 'used' ? '已兑换' : '已作废') }}
              </text>
            </view>
            <view class="card-item-row2">
              <text class="text-sub">{{ c.days === 0 ? '永久' : c.days + '天' }}{{ c.remark ? ' · ' + c.remark : '' }}</text>
              <view v-if="c.status === 'unused'" class="tag tag-red" @click="voidCard(c)">作废</view>
            </view>
          </view>
        </block>
      </view>

      <!-- 公众号配置 -->
      <view class="card">
        <view class="section-title">公众号引流</view>
        <view class="invite-row">
          <button class="qr-pick-btn" @click="chooseQr">{{ qrFileName || '选择公众号二维码图片' }}</button>
          <view class="invite-save" @click="saveQrcode">保存</view>
        </view>
        <input v-model="qrText" class="invite-input" style="margin-top: 16rpx" placeholder="引导文案，如：关注公众号回复卡密" :maxlength="50" />
        <view class="text-sub" style="margin-top: 12rpx">用户在「我的-使用资格-获取卡密」处看到此二维码与文案</view>
      </view>

      <!-- 举报指引配置 -->
      <view class="card">
        <view class="section-title">举报指引</view>
        <view class="invite-row">
          <button class="qr-pick-btn" @click="chooseReportImg">{{ reportImgName || '选择举报指引图片' }}</button>
          <view class="invite-save" @click="saveReportImg">保存</view>
        </view>
        <view class="text-sub" style="margin-top: 12rpx">用户点详情页「举报此内容」时展示此图（如腾讯举报入口二维码/指引截图）；未配置时显示文字指引</view>
      </view>

      <!-- 搜索 -->
      <view class="card">
        <view class="invite-row">
          <input
            v-model="keyword"
            class="invite-input"
            placeholder="按取件码搜索（6位）"
            :maxlength="6"
          />
          <view class="invite-save" @click="search">搜索</view>
        </view>
        <view class="text-sub">留空搜索 = 显示全部（最新 100 条，共 {{ total }} 条）</view>
      </view>

      <!-- 空投列表 -->
      <view v-if="loading" class="loading">加载中…</view>
      <view v-else-if="list.length === 0" class="empty-tip">暂无数据</view>

      <view v-for="item in list" :key="item._id" class="card parcel-item">
        <view class="row1">
          <text class="item-code">{{ item.code }}</text>
          <text class="tag" :class="item.expired ? 'tag-red' : 'tag-blue'">
            {{ item.expired ? '已过期' : '有效' }}
          </text>
        </view>
        <view class="row2">
          <text class="text-sub">{{ typeLabel(item.type) }} · {{ item.senderName }}</text>
          <text class="text-sub">{{ item.views }} 次浏览</text>
        </view>
        <view v-if="item.content || item.fileName" class="row-preview">
          <text class="preview-text">{{ item.content || item.fileName }}</text>
        </view>
        <view class="row3">
          <text class="text-sub">{{ formatTime(item.createdAt) }}</text>
          <view class="tag tag-red" @click="removeItem(item)">删除</view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { callCloud, uploadToCloud, formatTime, copyText } from '../../utils/cloud.js'

const mode = ref('loading') // loading | bind | admin
const bindKey = ref('')
const inviteCode = ref('')
const inviteEnabled = ref(true)
const keyword = ref('')
const list = ref([])
const total = ref(0)
const loading = ref(false)
const stats = ref({
  totalParcels: 0,
  todayParcels: 0,
  activeParcels: 0,
  totalUsers: 0,
  totalViews: 0
})

// 卡密系统
const genDays = ref(7)
const genCount = ref('10')
const genResult = ref([])
const cardFilter = ref('')
const cards = ref([])
const cardsLoading = ref(false)
const qrText = ref('')
const qrFileName = ref('')
const pendingQrPath = ref('')
const reportImgName = ref('')
const pendingReportImgPath = ref('')

onLoad(async () => {
  await init()
})

onPullDownRefresh(() => {
  refreshAll().finally(() => uni.stopPullDownRefresh())
})

async function init() {
  try {
    // silent：非管理员/未验证用户进入时静默切到绑定页，不弹"无权限"等提示
    const data = await callCloud('adminConfig', {}, { loading: false, silent: true })
    // 正常返回 = 已是管理员
    mode.value = 'admin'
    inviteCode.value = data.inviteCode || ''
    inviteEnabled.value = data.inviteEnabled !== false
    qrText.value = data.qrText || ''
    await Promise.all([loadList(), loadStats(), loadCards()])
  } catch (e) {
    // 无权限：可能是未绑定管理员 → 检查是否可绑定
    mode.value = 'bind'
  }
}

/** 加载统计看板 */
async function loadStats() {
  try {
    const data = await callCloud('stats', {}, { loading: false, silent: true })
    stats.value = data
  } catch (e) { /* 静默 */ }
}

/** 刷新全部 */
async function refreshAll() {
  await Promise.all([loadList(), loadStats(), loadCards()])
}

/** 批量生成卡密 */
async function generateCards() {
  const count = parseInt(genCount.value, 10)
  if (!count || count < 1 || count > 50) {
    return uni.showToast({ title: '数量需 1-50', icon: 'none' })
  }
  if (genDays.value === 0) {
    const confirmForever = await new Promise((resolve) => {
      uni.showModal({
        title: '生成永久卡',
        content: `将生成 ${count} 张永久卡，不可撤回兑换效果，确认？`,
        success: (r) => resolve(r.confirm)
      })
    })
    if (!confirmForever) return
  }
  try {
    const data = await callCloud('adminCards', {
      action: 'generate',
      days: genDays.value,
      count
    }, { tip: '生成中…' })
    genResult.value = data.cards
    loadCards()
    uni.showToast({ title: `已生成 ${data.count} 张`, icon: 'success' })
  } catch (e) { /* 已有 toast */ }
}

/** 复制卡密 */
function copyCards() {
  if (genResult.value.length === 0) return
  copyText(genResult.value.join('\n'))
}

/** 加载卡列表 */
async function loadCards() {
  cardsLoading.value = true
  try {
    const data = await callCloud('adminCards', {
      action: 'list',
      status: cardFilter.value
    }, { loading: false, silent: true })
    cards.value = data.list
  } catch (e) { /* 静默 */ } finally {
    cardsLoading.value = false
  }
}

/** 作废卡 */
function voidCard(c) {
  uni.showModal({
    title: '作废卡密',
    content: `作废 ${c.code}？未使用的卡作废后无法兑换。`,
    confirmColor: '#E5484D',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await callCloud('adminCards', { action: 'void', code: c.code }, { tip: '作废中…' })
        loadCards()
        uni.showToast({ title: '已作废', icon: 'success' })
      } catch (e) { /* 已有 toast */ }
    }
  })
}

/** 选择公众号二维码 */
function chooseQr() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      pendingQrPath.value = res.tempFilePaths[0]
      qrFileName.value = '已选择图片（待保存）'
    }
  })
}

/** 保存公众号配置 */
async function saveQrcode() {
  try {
    let qrFileID = undefined
    if (pendingQrPath.value) {
      uni.showLoading({ title: '上传二维码…', mask: true })
      qrFileID = await uploadToCloud(`qrcode/gzh-${Date.now()}.png`, pendingQrPath.value)
      uni.hideLoading()
    }
    const data = await callCloud('adminConfig', {
      action: 'setQrcode',
      qrFileID: qrFileID || undefined,
      qrText: qrText.value.trim()
    }, { tip: '保存中…' })
    qrText.value = data.qrText
    qrFileName.value = ''
    pendingQrPath.value = ''
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { /* 已有 toast */ }
}

/** 选择举报指引图 */
function chooseReportImg() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      pendingReportImgPath.value = res.tempFilePaths[0]
      reportImgName.value = '已选择图片（待保存）'
    }
  })
}

/** 保存举报指引图 */
async function saveReportImg() {
  try {
    let reportImgFileID = undefined
    if (pendingReportImgPath.value) {
      uni.showLoading({ title: '上传图片…', mask: true })
      reportImgFileID = await uploadToCloud(`qrcode/report-${Date.now()}.png`, pendingReportImgPath.value)
      uni.hideLoading()
    }
    await callCloud('adminConfig', {
      action: 'setReportImg',
      reportImgFileID: reportImgFileID || undefined
    }, { tip: '保存中…' })
    reportImgName.value = ''
    pendingReportImgPath.value = ''
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { /* 已有 toast */ }
}

/** 首次绑定管理员 */
async function doBind() {
  if (!bindKey.value.trim()) return uni.showToast({ title: '请输入绑定密钥', icon: 'none' })
  try {
    await callCloud('adminConfig', {
      action: 'bind',
      adminBindKey: bindKey.value.trim()
    }, { tip: '绑定中…' })
    uni.showToast({ title: '绑定成功', icon: 'success' })
    mode.value = 'admin'
    await init()
  } catch (e) { /* 已有 toast */ }
}

/** 切换邀请制开关 */
async function toggleInvite(e) {
  const enabled = e.detail.value
  try {
    const data = await callCloud('adminConfig', {
      action: 'setInviteEnabled',
      enabled
    }, { tip: '设置中…' })
    inviteEnabled.value = data.inviteEnabled
    uni.showToast({
      title: data.inviteEnabled ? '邀请制已开启' : '邀请制已关闭',
      icon: 'none'
    })
  } catch (err) {
    // 失败回滚开关状态
    inviteEnabled.value = !enabled
  }
}

/** 保存新邀请码 */
async function saveInviteCode() {
  const code = inviteCode.value.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,10}$/.test(code)) {
    return uni.showToast({ title: '需为 4-10 位字母/数字', icon: 'none' })
  }
  try {
    const data = await callCloud('adminConfig', {
      action: 'setInviteCode',
      inviteCode: code
    }, { tip: '保存中…' })
    inviteCode.value = data.inviteCode
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { /* 已有 toast */ }
}

/** 加载列表 */
async function loadList() {
  loading.value = true
  try {
    const data = await callCloud('adminList', { keyword: keyword.value.trim() }, { loading: false, silent: true })
    list.value = data.list
    total.value = data.total
  } catch (e) { /* 静默：无权限不提示 */ } finally {
    loading.value = false
  }
}

function search() {
  loadList()
}

function typeLabel(t) {
  const map = { text: '文字', images: '图片', video: '视频', file: '文件' }
  return map[t] || '未知'
}

/** 删除空投 */
function removeItem(item) {
  uni.showModal({
    title: '管理员删除',
    content: `删除取件码 ${item.code}？云存储文件将一并销毁。`,
    confirmColor: '#E65353',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await callCloud('adminDelete', { id: item._id }, { tip: '删除中…' })
        list.value = list.value.filter((x) => x._id !== item._id)
        total.value = Math.max(0, total.value - 1)
        uni.showToast({ title: '已删除', icon: 'success' })
        loadStats() // 顺带刷新统计
      } catch (e) { /* 已有 toast */ }
    }
  })
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: #F2F3F7;
  padding: 24rpx 0 80rpx;
}

/* ===== 绑定 ===== */
.bind-card {
  margin-top: 180rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.bind-title {
  font-size: 40rpx;
  font-weight: 800;
  text-align: center;
  color: #1C1C1E;
}
.bind-sub {
  font-size: 24rpx;
  color: #8E8E93;
  text-align: center;
  line-height: 1.7;
}
.bind-input {
  height: 104rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 22rpx;
  padding: 0 32rpx;
  font-size: 30rpx;
  color: #1C1C1E;
}
.bind-btn {
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  border-radius: 50rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.28);
}
.bind-btn:active {
  opacity: 0.8;
}

/* ===== 数据看板（iOS 深色卡） ===== */
.board {
  margin: 0 32rpx 20rpx;
  background: rgba(28, 28, 30, 0.92);
  backdrop-filter: blur(40rpx);
  border-radius: 32rpx;
  padding: 36rpx 24rpx 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(28, 28, 30, 0.20);
}
.board-row {
  display: flex;
}
.board-row + .board-row {
  margin-top: 28rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.10);
}
.board-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.board-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
}
.board-num.refresh-icon {
  font-size: 44rpx;
  line-height: 1.2;
  color: #0A84FF;
}
.board-label {
  font-size: 22rpx;
  color: rgba(235, 235, 245, 0.60);
}

/* ===== 开关行 ===== */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.switch-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.switch-label {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
}

/* ===== 输入行 ===== */
.invite-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.invite-input {
  flex: 1;
  height: 92rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 22rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  letter-spacing: 4rpx;
  color: #1C1C1E;
}
.invite-save {
  width: 160rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 22rpx;
  background: #007AFF;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(0, 122, 255, 0.25);
}
.invite-save:active {
  opacity: 0.8;
}

/* ===== 卡密系统 ===== */
.card-sub-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #8E8E93;
  margin: 28rpx 0 16rpx;
}
.gen-row {
  display: flex;
  gap: 10rpx;
}
.gen-item {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 16rpx;
  background: rgba(120, 120, 128, 0.08);
  font-size: 26rpx;
  color: #8E8E93;
  font-weight: 500;
}
.gen-item.active {
  background: #ffffff;
  color: #007AFF;
  font-weight: 700;
  box-shadow: inset 0 0 0 2rpx #007AFF,
              0 2rpx 10rpx rgba(28, 28, 30, 0.08);
}
.gen-result {
  margin-top: 20rpx;
  background: rgba(120, 120, 128, 0.06);
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  align-items: center;
}
.gen-codes {
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 24rpx;
  color: #1C1C1E;
  line-height: 1.8;
  text-align: center;
  word-break: break-all;
}
.card-filter {
  display: flex;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.filter-item {
  flex: 1;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border-radius: 14rpx;
  background: rgba(120, 120, 128, 0.08);
  font-size: 24rpx;
  color: #8E8E93;
}
.filter-item.active {
  background: #ffffff;
  color: #007AFF;
  font-weight: 700;
  box-shadow: inset 0 0 0 2rpx #007AFF;
}
.card-item {
  background: rgba(120, 120, 128, 0.06);
  border-radius: 20rpx;
  padding: 22rpx 26rpx;
  margin-bottom: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.card-item-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-code {
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 26rpx;
  font-weight: 600;
  color: #1C1C1E;
  word-break: break-all;
}
.card-item-row2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.qr-pick-btn {
  flex: 1;
  height: 92rpx;
  line-height: 92rpx;
  background: rgba(120, 120, 128, 0.08);
  border-radius: 22rpx;
  font-size: 26rpx;
  color: #1C1C1E;
  padding: 0 30rpx;
  text-align: left;
  margin: 0;
}
.qr-pick-btn::after {
  border: none;
}

/* ===== 列表 ===== */
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
  gap: 14rpx;
}
.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-code {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
  color: #1C1C1E;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
}
.row2,
.row3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.row-preview {
  background: rgba(120, 120, 128, 0.06);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.preview-text {
  font-size: 24rpx;
  color: #3A3A3C;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
