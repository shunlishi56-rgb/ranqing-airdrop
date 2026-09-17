// 云函数：cleanup —— 定时清理过期空投（数据库记录 + 云存储文件）
// 通过 config.json 的定时触发器每天凌晨 3 点自动执行
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const now = Date.now()
  let removedDocs = 0
  let removedFiles = 0
  let removedLogs = 0

  // 分批处理（单次最多 100 条，循环直到清完）
  for (let round = 0; round < 50; round++) {
    const expired = await db
      .collection('parcels')
      .where({ expireAt: _.lt(now) })
      .limit(100)
      .get()

    if (expired.data.length === 0) break

    // 汇总本批所有文件
    const fileIDs = expired.data.flatMap((p) =>
      Array.isArray(p.fileIDs) ? p.fileIDs : []
    )
    if (fileIDs.length > 0) {
      try {
        await cloud.deleteFile({ fileList: fileIDs })
        removedFiles += fileIDs.length
      } catch (e) {
        console.error('deleteFile error', e)
      }
    }

    // 逐条删除记录（云数据库无批量按查询删除，量小可接受）
    for (const p of expired.data) {
      try {
        await db.collection('parcels').doc(p._id).remove()
        removedDocs++
      } catch (e) {
        console.error('remove doc error', p._id, e)
      }
    }
  }

  // 顺带清理 30 天前的查看历史（快照保留期，避免 receiveLogs 无限增长）
  try {
    const logCutoff = now - 30 * 24 * 60 * 60 * 1000
    for (let round = 0; round < 10; round++) {
      const oldLogs = await db
        .collection('receiveLogs')
        .where({ viewedAt: _.lt(logCutoff) })
        .limit(100)
        .get()
      if (oldLogs.data.length === 0) break
      for (const log of oldLogs.data) {
        try {
          await db.collection('receiveLogs').doc(log._id).remove()
          removedLogs++
        } catch (e) {
          console.error('remove log error', log._id, e)
        }
      }
    }
  } catch (e) {
    console.error('clean receiveLogs error', e)
  }

  const summary = { removedDocs, removedFiles, removedLogs, finishedAt: new Date().toISOString() }
  console.log('cleanup done', summary)
  return summary
}
