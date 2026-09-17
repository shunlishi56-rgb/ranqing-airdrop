/**
 * 云函数调用封装：统一 loading 与错误提示
 * 用法：const res = await callCloud('send', { ... })
 * opts.silent: 静默模式——不弹任何 toast，由调用方自行处理错误提示
 */
/**
 * 云调用失败 → 可读诊断提示
 * 区分三类常见问题：云函数未部署 / 数据库集合未创建 / 超时
 */
function cloudErrMsg(err, name) {
  const raw = String((err && (err.errMsg || err.message)) || '') + ' ' + String((err && err.errCode) || '')
  if (/function\s*not\s*found|invalid\s*function|FunctionNameNotFound/i.test(raw)) {
    return `云函数 ${name} 未部署`
  }
  if (/collection\s*not\s*exists|DATABASE_COLLECTION/i.test(raw)) {
    return '数据库集合未创建'
  }
  if (/timeout|timed?\s*out|exceeded/i.test(raw)) {
    return '云函数执行超时'
  }
  const brief = String((err && (err.errMsg || err.message)) || '').slice(0, 20)
  return brief ? `请求失败：${brief}` : '网络异常，请稍后重试'
}

export function callCloud(name, data = {}, { loading = true, tip = '处理中…', silent = false } = {}) {
  return new Promise((resolve, reject) => {
    if (loading) uni.showLoading({ title: tip, mask: true })
    // #ifdef MP-WEIXIN
    wx.cloud
      .callFunction({ name, data })
      .then((r) => {
        uni.hideLoading()
        const res = r.result || {}
        if (res.code === 0) {
          resolve(res.data)
        } else {
          const msg = res.msg || '操作失败，请稍后重试'
          if (!silent) uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      })
      .catch((err) => {
        uni.hideLoading()
        console.error(`[cloud:${name}]`, err)
        if (!silent) uni.showToast({ title: cloudErrMsg(err, name), icon: 'none' })
        reject(err)
      })
    // #endif
    // #ifndef MP-WEIXIN
    uni.hideLoading()
    reject(new Error('仅支持微信小程序端'))
    // #endif
  })
}

/** 上传单个文件到云存储，返回 fileID */
export function uploadToCloud(cloudPath, filePath) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.cloud
      .uploadFile({ cloudPath, filePath })
      .then((r) => resolve(r.fileID))
      .catch((err) => {
        console.error('[upload]', err)
        reject(err)
      })
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('仅支持微信小程序端'))
    // #endif
  })
}

/** 生成云存储路径：parcels/时间戳-随机串.扩展名 */
export function makeCloudPath(ext = '') {
  const t = Date.now()
  const r = Math.random().toString(36).slice(2, 10)
  const safeExt = (ext || '').replace(/[^a-zA-Z0-9.]/g, '')
  return `parcels/${t}-${r}${safeExt}`
}

/** 从本地路径提取扩展名（含点），如 .png */
export function getExt(path = '', name = '') {
  const fromName = (name.match(/\.[a-zA-Z0-9]+$/) || [])[0]
  if (fromName) return fromName
  return (path.match(/\.[a-zA-Z0-9]+$/) || [''])[0]
}

/**
 * 复制文本到剪贴板（统一封装）
 * 注意：写入剪贴板属微信隐私接口，需在 mp 后台「用户隐私保护指引」声明「剪贴板」，
 * 未声明时调用会被平台拦截（fail: api scope is not declared in the privacy agreement）
 */
export function copyText(text) {
  uni.setClipboardData({
    data: String(text ?? ''),
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
    fail: (err) => {
      console.error('[copy]', err)
      const msg = String((err && err.errMsg) || '')
      if (/privacy|not declared/i.test(msg)) {
        uni.showToast({ title: '剪贴板权限未在隐私指引声明', icon: 'none' })
      } else {
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    }
  })
}

/** 文件大小格式化 */
export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + 'GB'
}

/** 剩余有效期格式化 */
export function formatLeft(expireAt) {
  const diff = expireAt - Date.now()
  if (diff <= 0) return '已过期'
  const h = Math.floor(diff / 1000 / 60 / 60)
  if (h < 1) return '即将过期'
  if (h < 24) return `剩 ${h} 小时`
  return `剩 ${Math.floor(h / 24)} 天`
}

/** 时间格式化 MM-DD HH:mm */
export function formatTime(ts) {
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
