// 云函数：adminCards —— 管理员发卡系统：批量生成/列表/作废卡密
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 时长映射（days: 0 = 永久）
const DURATION_MAP = {
  1: 'RQ1D',   // 1天卡
  7: 'RQ7D',   // 7天卡
  30: 'RQ30D', // 30天卡
  0: 'RQFOREVER' // 永久卡
}

async function isAdmin(openid) {
  const cfg = await db.collection('config').where({ key: 'app' }).limit(1).get()
  return !!(cfg.data[0] && cfg.data[0].adminOpenid === openid)
}

/** 生成随机段（大写字母+数字，去易混淆） */
function seg(len = 4) {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]
  return s
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await isAdmin(OPENID))) {
    return { code: -1, msg: '无权限' }
  }

  const action = event.action || ''

  // ---- 批量发卡 ----
  if (action === 'generate') {
    const days = Number(event.days)
    const count = Math.min(Math.max(Number(event.count) || 1, 1), 50) // 单次最多50张
    if (!(days in DURATION_MAP)) {
      return { code: -1, msg: '时长仅支持 1/7/30 天或永久' }
    }
    const remark = String(event.remark || '').slice(0, 30)

    const cards = []
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      const code = `${DURATION_MAP[days]}-${seg()}-${seg()}`
      await db.collection('cards').add({
        data: {
          code,
          days,
          status: 'unused', // unused=未使用 used=已兑换 voided=已作废
          usedBy: '',
          usedAt: 0,
          remark,
          createdAt: now
        }
      })
      cards.push(code)
    }
    return { code: 0, data: { cards, count: cards.length, days } }
  }

  // ---- 卡列表（可按状态筛选） ----
  if (action === 'list') {
    const status = event.status // '' = 全部
    let query = db.collection('cards').orderBy('createdAt', 'desc').limit(100)
    if (status && ['unused', 'used', 'voided'].includes(status)) {
      query = query.where({ status })
    }
    const res = await query.get()
    const list = res.data.map((c) => ({
      code: c.code,
      days: c.days,
      status: c.status,
      usedBy: c.usedBy ? c.usedBy.slice(-8) : '', // 只展示openid后8位，避免泄露
      usedAt: c.usedAt,
      remark: c.remark || '',
      createdAt: c.createdAt
    }))
    return { code: 0, data: { list } }
  }

  // ---- 作废卡（仅未使用的可作废） ----
  if (action === 'void') {
    const cardCode = String(event.code || '').trim()
    const found = await db.collection('cards').where({ code: cardCode }).limit(1).get()
    if (found.data.length === 0) return { code: -1, msg: '卡密不存在' }
    const card = found.data[0]
    if (card.status !== 'unused') return { code: -1, msg: '仅未使用的卡可作废' }
    await db.collection('cards').doc(card._id).update({
      data: { status: 'voided' }
    })
    return { code: 0, data: {} }
  }

  return { code: -1, msg: '未知操作' }
}
