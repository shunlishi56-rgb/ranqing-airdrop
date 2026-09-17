// 云函数：stats —— 管理员数据统计看板
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const dbCmd = cloud.database.command()
const $ = dbCmd.aggregate

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  // 权限校验
  const cfg = await db.collection('config').where({ key: 'app' }).limit(1).get()
  if (!cfg.data[0] || cfg.data[0].adminOpenid !== OPENID) {
    return { code: -1, msg: '无权限' }
  }

  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 并行查询各项统计
  const [totalParcels, todayParcels, totalUsers, activeParcels, viewsAgg] = await Promise.all([
    db.collection('parcels').count(),
    db.collection('parcels').where({ createdAt: dbCmd.gte(todayStart.getTime()) }).count(),
    db.collection('users').count(),
    db.collection('parcels').where({ expireAt: dbCmd.gt(now) }).count(),
    // 聚合：总浏览量（失败时兜底为 0，不阻塞看板）
    db
      .collection('parcels')
      .aggregate()
      .group({ _id: null, totalViews: $.sum('$views') })
      .end()
      .catch(() => ({ data: [] }))
  ])

  let totalViews = 0
  if (viewsAgg && viewsAgg.data && viewsAgg.data.length > 0) {
    totalViews = viewsAgg.data[0].totalViews || 0
  }

  return {
    code: 0,
    data: {
      totalParcels: totalParcels.total,
      todayParcels: todayParcels.total,
      activeParcels: activeParcels.total,
      totalUsers: totalUsers.total,
      totalViews
    }
  }
}
