/**
 * 文件类型判断工具
 */

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const VIDEO_EXTENSIONS = ['.mp4', '.mov']
const GIF_EXTENSION = '.gif'

export function isImageFile(filename: string): boolean {
  const lowerFilename = filename.toLowerCase()
  return IMAGE_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))
}

export function isVideoFile(filename: string): boolean {
  const lowerFilename = filename.toLowerCase()
  return VIDEO_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))
}

export function isGifFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(GIF_EXTENSION)
}

/**
 * GIF 使用 video 路径但用 img 标签显示
 */
export function useVideoPath(filename: string): boolean {
  return isVideoFile(filename) || isGifFile(filename)
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts.pop()}` : ''
}
