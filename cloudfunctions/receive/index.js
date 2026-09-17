// 云函数：receive —— 凭取件码取件，浏览数自增，文件转临时链接
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const code = String(event.code || '').trim()
  if (!/^[0-9]{6}$/.test(code)) {
    return { code: -1, msg: '取件码格式不正确（6位数字）' }
  }

  const found = await db.collection('parcels').where({ code }).limit(1).get()
  if (found.data.length === 0) {
    return { code: -1, msg: '取件码无效或已被删除' }
  }

  const parcel = found.data[0]
  if (parcel.expireAt < Date.now()) {
    return { code: -1, msg: '该空投已过期，内容已销毁' }
  }

  // 浏览数 +1
  await db
    .collection('parcels')
    .doc(parcel._id)
    .update({ data: { views: db.command.inc(1) } })

  // 记录查看历史（快照方式：即使原空投后来被删/过期，历史列表仍可展示）
  // upsert 语义：同一用户查看同一空投只保留一条，反复查看仅刷新时间，避免集合膨胀
  try {
    const existed = await db
      .collection('receiveLogs')
      .where({ viewerOpenid: OPENID, code: parcel.code })
      .limit(1)
      .get()
    if (existed.data.length > 0) {
      await db.collection('receiveLogs').doc(existed.data[0]._id).update({
        data: { viewedAt: Date.now(), views: db.command.inc(1) }
      })
    } else {
      await db.collection('receiveLogs').add({
        data: {
          viewerOpenid: OPENID,
          parcelId: parcel._id,
          code: parcel.code,
          type: parcel.type,
          senderName: parcel.senderName || '空投用户',
          contentPreview: parcel.type === 'text' ? (parcel.content || '').slice(0, 30) : '',
          fileName: parcel.fileName || '',
          viewedAt: Date.now(),
          views: 1,
          expireAt: parcel.expireAt
        }
      })
    }
  } catch (e) {
    console.error('record receiveLog failed', e) // 历史记录失败不阻塞取件
  }

  // 云存储 fileID → 临时下载链接（默认 2 小时有效，仅取件人可见）
  let files = []
  if (Array.isArray(parcel.fileIDs) && parcel.fileIDs.length > 0) {
    const res = await cloud.getTempFileURL({ fileList: parcel.fileIDs })
    files = res.fileList.map((f) => ({
      fileID: f.fileID,
      url: f.tempFileURL,
      status: f.status,
      errMsg: f.errMsg
    }))
  }

  // 发送者头像若为云存储 fileID，同样转临时链接
  let senderAvatarUrl = ''
  if (parcel.senderAvatar) {
    try {
      const av = await cloud.getTempFileURL({ fileList: [parcel.senderAvatar] })
      senderAvatarUrl = av.fileList[0].tempFileURL || ''
    } catch (e) {
      senderAvatarUrl = ''
    }
  }

  return {
    code: 0,
    data: {
      _id: parcel._id,
      type: parcel.type,
      content: parcel.content,
      fileName: parcel.fileName,
      fileSize: parcel.fileSize,
      senderName: parcel.senderName,
      senderAvatarUrl,
      views: parcel.views + 1,
      createdAt: parcel.createdAt,
      expireAt: parcel.expireAt,
      files
    }
  }
}
