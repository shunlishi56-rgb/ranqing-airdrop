// 云函数：listMine —— 我发送的空投列表（取件码找回/状态查看）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const res = await db
    .collection('parcels')
    .where({ senderOpenid: OPENID })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .field({
      code: true,
      type: true,
      fileName: true,
      views: true,
      createdAt: true,
      expireAt: true,
      content: true
    })
    .get()

  const now = Date.now()
  const list = res.data.map((p) => ({
    _id: p._id,
    code: p.code,
    type: p.type,
    fileName: p.fileName || '',
    views: p.views,
    createdAt: p.createdAt,
    expireAt: p.expireAt,
    expired: p.expireAt < now,
    // 列表预览：文字取前 12 字，文件显示文件名
    preview:
      p.type === 'text'
        ? (p.content || '').slice(0, 12)
        : p.type === 'file'
          ? p.fileName
          : ''
  }))

  return { code: 0, data: { list } }
}
