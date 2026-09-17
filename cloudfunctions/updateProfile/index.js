// 云函数：updateProfile —— 修改昵称/头像
// 头像：前端通过 button open-type="chooseAvatar" 拿到临时路径后，
//       先上传云存储得到 fileID，再传 avatarFileID 到本函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatarFileID = '' } = event

  const name = String(nickname || '').trim()
  if (!name) return { code: -1, msg: '昵称不能为空' }
  if (name.length > 12) return { code: -1, msg: '昵称最多 12 个字' }

  const users = db.collection('users')
  const user = await users.where({ _openid: OPENID }).limit(1).get()
  if (user.data.length === 0) {
    return { code: -1, msg: '用户不存在，请重新进入小程序' }
  }

  const data = { nickname: name, updatedAt: Date.now() }
  if (avatarFileID) data.avatarFileID = avatarFileID

  await users.doc(user.data[0]._id).update({ data })
  return { code: 0, data: { nickname: name, avatarFileID: data.avatarFileID || user.data[0].avatarFileID } }
}
