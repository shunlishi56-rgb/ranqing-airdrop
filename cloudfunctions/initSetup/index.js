// 云函数：initSetup —— 一次性初始化配置集合（只需手动调用一次）
// 作用：在 config 集合写入初始文档：邀请码 + 管理员 openid
// 用法：部署后，在微信开发者工具云函数面板中右键 initSetup → 云端测试（无参数执行）
//      执行后到云开发控制台 config 集合里，把 adminOpenid 字段改成你自己的 openid
//      （首次 login 后，在云函数 login 的日志中可看到你的 openid）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const config = db.collection('config')
  const found = await config.where({ key: 'app' }).limit(1).get()

  if (found.data.length > 0) {
    return { code: 0, msg: '配置已存在，无需重复初始化', data: found.data[0] }
  }

  // 默认邀请码，管理员可随时在小程序管理页修改
  await config.add({
    data: {
      key: 'app',
      inviteCode: 'RQ8888',          // 初始邀请码，上线前务必修改
      inviteEnabled: true,           // 邀请制开关：false = 新用户免验直接用
      adminOpenid: '',               // 部署后填写你的 openid（login 日志中获取）
      createdAt: Date.now()
    }
  })

  return { code: 0, msg: '初始化完成：请在 config 集合中填写 adminOpenid', data: {} }
}
