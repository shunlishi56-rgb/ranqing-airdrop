// 云函数：send —— 发送空投（文字/图片/视频/文件），生成唯一取件码
// 相比原版 PHP 的修复：
//   1. 云数据库参数化查询，杜绝 SQL 注入
//   2. 文字/图片接入微信内容安全审核（UGC 合规）
//   3. 取件码带过期时间，超期不可取
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 去掉易混淆字符的字符集已改为纯数字（便于数字键盘输入与口头传达）
const CHARS = '0123456789'
const ALLOWED_DAYS = [1, 7, 15]

function genCode(len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]
  return s
}

/** 生成不重复的取件码 */
async function genUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = genCode()
    const dup = await db.collection('parcels').where({ code }).count()
    if (dup.total === 0) return code
  }
  throw new Error('取件码生成失败，请重试')
}

/** 文字内容安全审核（msgSecCheck v2） */
async function checkText(openid, content) {
  try {
    await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 1, // 1=资料 2=评论 3=论坛
      openid,
      content
    })
  } catch (e) {
    if (e.errCode === 87014) throw new Error('内容包含违规信息，请修改后重试')
    // 审核服务偶发异常时放行记录日志（避免误杀正常用户）
    console.error('msgSecCheck error', e)
  }
}

/** 图片内容安全审核（imgSecCheck，单张 ≤1MB） */
async function checkImage(fileID) {
  try {
    const dl = await cloud.downloadFile({ fileID })
    // 按扩展名确定 contentType（png/jpg 走 imgSecCheck，其他格式跳过同步审核）
    const m = fileID.match(/\.(png|jpe?g)$/i)
    if (!m) {
      console.warn('imgSecCheck skip (format):', fileID)
      return
    }
    const contentType = m[1].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg'
    await cloud.openapi.security.imgSecCheck({
      media: { contentType, value: dl.fileContent }
    })
  } catch (e) {
    if (e.errCode === 87014) throw new Error('图片包含违规内容，请更换后重试')
    if (e.errCode === 41005 || e.errCode === 40006) throw new Error('图片格式不支持，请更换后重试')
    console.error('imgSecCheck error', e)
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // ===== 使用资格校验（云端强制，防绕过前端） =====
  const FOREVER = 9999999999999
  const cfgRes = await db.collection('config').where({ key: 'app' }).limit(1).get()
  const config = cfgRes.data[0] || {}
  const freeAccess = config.inviteEnabled === false

  if (!freeAccess) {
    const isAdmin = !!(config.adminOpenid && config.adminOpenid === OPENID)
    if (!isAdmin) {
      const userRes = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
      const user = userRes.data[0] || {}
      const expireAt = user.expireAt || 0
      if (!(expireAt >= FOREVER || expireAt > Date.now())) {
        return { code: 401, msg: '使用资格未激活或已过期，请兑换卡密后使用' }
      }
    }
  }

  // 参数校验
  const { type, content = '', fileIDs = [], fileName = '', fileSize = 0, days } = event
  if (!['text', 'images', 'video', 'file'].includes(type)) {
    return { code: -1, msg: '不支持的空投类型' }
  }
  if (!ALLOWED_DAYS.includes(Number(days))) {
    return { code: -1, msg: '请选择有效期（1/7/15天）' }
  }

  // 按类型校验内容
  if (type === 'text') {
    if (!content || !content.trim()) return { code: -1, msg: '文字内容不能为空' }
    if (content.length > 1000) return { code: -1, msg: '文字最多 1000 字' }
  }
  if (type === 'images') {
    if (!Array.isArray(fileIDs) || fileIDs.length === 0 || fileIDs.length > 9) {
      return { code: -1, msg: '请上传 1~9 张图片' }
    }
  }
  if (type === 'video') {
    if (!Array.isArray(fileIDs) || fileIDs.length !== 1) {
      return { code: -1, msg: '请上传 1 个视频' }
    }
  }
  if (type === 'file') {
    if (!Array.isArray(fileIDs) || fileIDs.length !== 1) {
      return { code: -1, msg: '请上传 1 个文件' }
    }
    if (!fileName) return { code: -1, msg: '文件名缺失' }
  }

  // 安全校验：fileID 必须是本环境 parcels/ 路径下的文件（防伪造他人文件ID）
  const validFileIDs = fileIDs.every(
    (fid) => typeof fid === 'string' && /^cloud:\/\/[^/]+\/parcels\/[\w.-]+$/.test(fid)
  )
  if (!validFileIDs) {
    return { code: -1, msg: '文件参数不合法' }
  }

  // 内容安全审核（文字 + 图片，图片并行审核提速防超时）
  try {
    if (type === 'text') await checkText(OPENID, content)
    if (type === 'images') {
      await Promise.all(fileIDs.map((fid) => checkImage(fid)))
    }
  } catch (e) {
    return { code: -1, msg: e.message || '内容审核未通过' }
  }

  // 发送者昵称/头像（详情页展示用）
  const users = db.collection('users')
  const user = await users.where({ _openid: OPENID }).limit(1).get()
  const sender = user.data[0] || {}

  // 生成取件码并落库
  const code = await genUniqueCode()
  const now = Date.now()
  const expireAt = now + Number(days) * 24 * 60 * 60 * 1000

  const doc = {
    code,
    type,
    content: type === 'text' ? content.trim() : '',
    fileIDs: ['images', 'video', 'file'].includes(type) ? fileIDs : [],
    fileName: type === 'file' ? fileName : '',
    fileSize: type === 'file' ? Number(fileSize) : 0,
    senderOpenid: OPENID,
    senderName: sender.nickname || '空投用户',
    senderAvatar: sender.avatarFileID || '',
    views: 0,
    createdAt: now,
    expireAt
  }
  await db.collection('parcels').add({ data: doc })

  return { code: 0, data: { code, expireAt } }
}
