// 云函数：received —— 我查看过的空投历史（最近接收）
// 数据来源：receiveLogs 集合（receive 云函数在成功取件时自动写入）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const now = Date.now()

  // 取我最近的查看记录（按时间倒序，最多 20 条）
  const logs = await db
    .collection('receiveLogs')
    .where({ viewerOpenid: OPENID })
    .orderBy('viewedAt', 'desc')
    .limit(20)
    .get()

  if (logs.data.length === 0) {
    return { code: 0, data: { list: [] } }
  }

  // 用记录里的快照直接渲染（避免再查 parcels 表）；
  // 快照在取件时已保存：code/type/fileName/content 摘要/senderName 等
  const seen = new Set()
  const list = []
  for (const log of logs.data) {
    // 同一取件码只保留最近一次查看
    if (seen.has(log.code)) continue
    seen.add(log.code)
    list.push({
      code: log.code,
      type: log.type,
      senderName: log.senderName || '空投用户',
      preview:
        log.type === 'text'
          ? (log.contentPreview || '').slice(0, 16)
          : log.type === 'file'
            ? (log.fileName || '')
            : '',
      viewedAt: log.viewedAt,
      // 过期时间快照 + 当前判断
      expired: (log.expireAt || 0) < now
    })
  }

  return { code: 0, data: { list } }
}
