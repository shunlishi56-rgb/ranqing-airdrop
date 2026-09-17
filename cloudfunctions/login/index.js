// 云函数：login —— 微信静默登录，检查使用资格
// 逻辑：
//   1. 已有用户：返回用户信息 + 使用资格状态（expired 字段）
//   2. 新用户：直接建档（无资格），返回 code: 401 提示需兑换卡密
//   3. config.inviteEnabled === false → 免费开放，所有人可用（资格永不过期）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const FOREVER = 9999999999999

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const users = db.collection('users')

  // 读取全局配置（开关 + 公众号信息顺带给前端）
  const cfg = await db.collection('config').where({ key: 'app' }).limit(1).get()
  const config = cfg.data[0] || {}
  const isAdmin = !!(config.adminOpenid && config.adminOpenid === OPENID)
  const freeAccess = config.inviteEnabled === false // 开关关闭 = 免费开放

  const found = await users.where({ _openid: OPENID }).limit(1).get()

  // ---- 已有用户 ----
  if (found.data.length > 0) {
    const u = found.data[0]
    const expireAt = u.expireAt || 0
    const hasAccess =
      freeAccess || isAdmin || expireAt >= FOREVER || expireAt > Date.now()
    return {
      code: 0,
      data: {
        ...u,
        isAdmin,
        cardMode: !freeAccess, // 卡密门槛开关（false=免费开放模式，前端隐藏卡密 UI）
        hasAccess,           // 当前是否有发送资格
        expireAt: expireAt >= FOREVER ? FOREVER : expireAt,
        forever: expireAt >= FOREVER,
        isTrial: !!(u.trialUsed && !u.expireAtOriginal && expireAt < FOREVER && expireAt > Date.now() && u.expireAt - u.createdAt <= 12 * 3600000 + 60000),
        accessExpired: !hasAccess, // 资格是否已到期（前端提示用）
        qrFileID: config.qrFileID || '',       // 公众号二维码（云存储 fileID）
        qrText: config.qrText || '关注公众号获取卡密', // 引导文案
        reportImgFileID: config.reportImgFileID || ''  // 举报指引图（云存储 fileID）
      }
    }
  }

  // ---- 新用户：免费开放=永久资格；管理员=永久资格；卡密制=12小时体验资格 ----
  const TRIAL_MS = 12 * 60 * 60 * 1000 // 新用户体验 12 小时
  const now = Date.now()
  const doc = {
    _openid: OPENID,
    nickname: `空投用户${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    avatarFileID: '',
    // 免费开放 = 永久资格；管理员 = 永久资格；否则 12 小时体验
    expireAt: freeAccess || isAdmin ? FOREVER : now + TRIAL_MS,
    trialUsed: !(freeAccess || isAdmin), // 标记已领过体验（防止删记录薅体验）
    createdAt: now,
    updatedAt: now
  }
  const added = await users.add({ data: doc })

  return {
    code: 0,
    data: {
      _id: added._id,
      ...doc,
      isAdmin,
      cardMode: !freeAccess,
      hasAccess: true, // 刚建档必然在体验期内
      expireAt: doc.expireAt,
      forever: freeAccess || isAdmin,
      isTrial: !(freeAccess || isAdmin), // 前端可展示"体验中"
      accessExpired: false,
      qrFileID: config.qrFileID || '',
      qrText: config.qrText || '关注公众号获取卡密',
      reportImgFileID: config.reportImgFileID || ''
    }
  }
}
