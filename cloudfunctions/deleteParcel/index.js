// 云函数：deleteParcel —— 删除自己的空投（连带清理云存储文件）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event
  if (!id) return { code: -1, msg: '参数缺失' }

  const res = await db.collection('parcels').doc(id).get()
  const parcel = res.data
  if (!parcel) return { code: -1, msg: '空投不存在' }

  // 权限校验：仅本人可删除
  if (parcel.senderOpenid !== OPENID) {
    return { code: -1, msg: '只能删除自己发送的空投' }
  }

  // 先删云存储文件，再删数据库记录
  if (Array.isArray(parcel.fileIDs) && parcel.fileIDs.length > 0) {
    try {
      await cloud.deleteFile({ fileList: parcel.fileIDs })
    } catch (e) {
      console.error('deleteFile error', e) // 文件删除失败不阻塞记录删除，cleanup 会兜底
    }
  }
  await db.collection('parcels').doc(id).remove()

  return { code: 0, data: {} }
}
