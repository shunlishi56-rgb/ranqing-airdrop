// 云函数：adminConfig —— 管理员系统配置：邀请码/开关/管理员绑定
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getConfig() {
  const cfg = await db.collection('config').where({ key: 'app' }).limit(1).get()
  return cfg.data[0] || null
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const config = await getConfig()

  const action = event.action || ''

  // ---- 首次绑定管理员（adminOpenid 为空时） ----
  if (action === 'bind' && config && !config.adminOpenid) {
    const key = String(event.adminBindKey || '')
    if (!key || key !== (config.adminBindKey || 'RQ-ADMIN-2026')) {
      return { code: -1, msg: '绑定密钥不正确' }
    }
    await db.collection('config').doc(config._id).update({
      data: { adminOpenid: OPENID }
    })
    return { code: 0, data: { bound: true } }
  }

  // ---- 以下操作仅管理员 ----
  if (!config || config.adminOpenid !== OPENID) {
    return { code: -1, msg: '无权限' }
  }

  // 修改邀请码
  if (action === 'setInviteCode') {
    const code = String(event.inviteCode || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{4,10}$/.test(code)) {
      return { code: -1, msg: '邀请码需为 4-10 位字母/数字' }
    }
    await db.collection('config').doc(config._id).update({
      data: { inviteCode: code }
    })
    return { code: 0, data: { inviteCode: code } }
  }

  // 邀请制开关（关闭后新用户免验）
  if (action === 'setInviteEnabled') {
    const enabled = !!event.enabled
    await db.collection('config').doc(config._id).update({
      data: { inviteEnabled: enabled }
    })
    return { code: 0, data: { inviteEnabled: enabled } }
  }

  // 公众号配置（二维码图 + 引导文案）
  if (action === 'setQrcode') {
    const qrFileID = String(event.qrFileID || '')
    const qrText = String(event.qrText || '').slice(0, 50)
    await db.collection('config').doc(config._id).update({
      data: { qrFileID, qrText }
    })
    return { code: 0, data: { qrFileID, qrText } }
  }

  // 举报指引图配置（用户点举报时展示此图）
  if (action === 'setReportImg') {
    const reportImgFileID = String(event.reportImgFileID || '')
    await db.collection('config').doc(config._id).update({
      data: { reportImgFileID }
    })
    return { code: 0, data: { reportImgFileID } }
  }

  // 默认：返回完整配置信息
  return {
    code: 0,
    data: {
      inviteCode: config.inviteCode || '',
      inviteEnabled: config.inviteEnabled !== false, // 兼容老数据：无字段视为开启
      adminBound: !!config.adminOpenid,
      myOpenid: OPENID,
      qrFileID: config.qrFileID || '',
      qrText: config.qrText || '',
      reportImgFileID: config.reportImgFileID || ''
    }
  }
}
