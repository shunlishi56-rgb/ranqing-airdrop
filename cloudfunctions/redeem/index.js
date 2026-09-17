// 云函数：redeem —— 用户兑换卡密，获得/延长使用资格
// 并发安全：先原子更新卡状态（unused→used 才算抢到），再延长用户资格
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 永久资格的时间戳上限（2286年，足够当"永久"）
const FOREVER = 9999999999999

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const cardCode = String(event.code || '').trim().toUpperCase()

  if (!/^(RQ1D|RQ7D|RQ30D|RQFOREVER)-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(cardCode)) {
    return { code: -1, msg: '卡密格式不正确' }
  }

  // 1. 查卡
  const found = await db.collection('cards').where({ code: cardCode }).limit(1).get()
  if (found.data.length === 0) {
    return { code: -1, msg: '卡密不存在' }
  }
  const card = found.data[0]
  if (card.status === 'voided') return { code: -1, msg: '该卡已作废' }
  if (card.status === 'used') return { code: -1, msg: '该卡已被使用' }

  // 2. 原子抢占卡（防止两台手机同时兑同一张卡）
  const grab = await db
    .collection('cards')
    .where({ _id: card._id, status: 'unused' })
    .update({
      data: { status: 'used', usedBy: OPENID, usedAt: Date.now() }
    })
  if (!grab.stats || grab.stats.updated === 0) {
    return { code: -1, msg: '该卡已被使用' } // 被并发抢走
  }

  // 3. 延长用户使用资格
  const users = db.collection('users')
  const userRes = await users.where({ _openid: OPENID }).limit(1).get()

  if (userRes.data.length === 0) {
    // 兑换前必须先建档（login 会建档，这里兜底）
    const now = Date.now()
    await users.add({
      data: {
        _openid: OPENID,
        nickname: `空投用户${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        avatarFileID: '',
        expireAt: card.days === 0 ? FOREVER : now + card.days * 86400000,
        createdAt: now,
        updatedAt: now
      }
    })
  } else {
    const user = userRes.data[0]
    const now = Date.now()
    const current = user.expireAt || 0

    let newExpire
    if (current >= FOREVER) {
      newExpire = FOREVER // 已是永久，不再变化
    } else if (card.days === 0) {
      newExpire = FOREVER // 永久卡直接置永久
    } else {
      // 叠加：从当前到期时间或现在中较大者起算
      const base = Math.max(current, now)
      newExpire = base + card.days * 86400000
    }

    await users.doc(user._id).update({
      data: { expireAt: newExpire, updatedAt: now }
    })
  }

  // 4. 返回新资格信息
  const finalUser = await users.where({ _openid: OPENID }).limit(1).get()
  const expireAt = finalUser.data[0].expireAt || 0

  return {
    code: 0,
    data: {
      expireAt,
      forever: expireAt >= FOREVER,
      days: card.days
    }
  }
}
