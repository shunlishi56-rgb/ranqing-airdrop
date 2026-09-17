// 云函数：adminDelete —— 管理员删除任意空投（连带云存储文件）
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

  const { id } = event
  if (!id) return { code: -1, msg: '参数缺失' }

  const res = await db.collection('parcels').doc(id).get()
  const parcel = res.data
  if (!parcel) return { code: -1, msg: '空投不存在' }

  // 先删云存储文件，再删记录
  if (Array.isArray(parcel.fileIDs) && parcel.fileIDs.length > 0) {
    try {
      await cloud.deleteFile({ fileList: parcel.fileIDs })
    } catch (e) {
      console.error('deleteFile error', e)
    }
  }
  await db.collection('parcels').doc(id).remove()

  return { code: 0, data: {} }
}
