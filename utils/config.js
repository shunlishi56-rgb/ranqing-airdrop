/**
 * 全局配置
 * CLOUD_ENV: 微信云开发环境ID
 *   开通云开发后，在开发者工具顶部「云开发」面板中可看到环境ID（形如 xxx-1a2b3c）
 *   生产环境务必填写，否则可能指向默认环境之外
 */
export const CLOUD_ENV = 'cloudbase-d6gcaca38ed7b5adb'

/** 单条文字最大字数（与原版一致） */
export const TEXT_MAX = 1000

/** 图片最多张数（与原版一致） */
export const IMAGE_MAX = 9

/** 视频最大时长（秒，与原版一致） */
export const VIDEO_MAX_DURATION = 60

/** 文件大小上限：50MB（云存储单文件 100MB，保守限制提高成功率） */
export const FILE_MAX_SIZE = 50 * 1024 * 1024

/** 有效期选项（天） */
export const EXPIRE_OPTIONS = [
  { label: '1 天', days: 1, desc: '适合临时传一下' },
  { label: '7 天', days: 7, desc: '一周内有效' },
  { label: '15 天', days: 15, desc: '长期有效' }
]
