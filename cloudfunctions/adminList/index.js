// 云函数：adminList —— 管理员查看全部空投列表（支持按取件码搜索）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function isAdmin(openid) {
  const cfg = await db.collection('config').where({ key: 'app' }).limit(1).get()
  return !!(cfg.data[0] && cfg.data[0].adminOpenid === openid)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await isAdmin(OPENID))) {
    return { code: -1, msg: '无权限' }
  }

  const keyword = String(event.keyword || '').trim()
  const now = Date.now()

  let query = db.collection('parcels')
  let where = {}
  if (/^[0-9]{6}$/.test(keyword)) {
    // 精确取件码搜索
    where = { code: keyword }
  }
  query = query.where(where).orderBy('createdAt', 'desc').limit(100)

  const res = await query.get()
  const list = res.data.map((p) => ({
    _id: p._id,
    code: p.code,
    type: p.type,
    content: p.type === 'text' ? (p.content || '').slice(0, 30) : '',
    fileName: p.fileName || '',
    senderName: p.senderName,
    senderOpenid: p.senderOpenid,
    views: p.views,
    createdAt: p.createdAt,
    expireAt: p.expireAt,
    expired: p.expireAt < now
  }))

  const total = await db.collection('parcels').where(where).count()
  return { code: 0, data: { list, total: total.total } }
}
