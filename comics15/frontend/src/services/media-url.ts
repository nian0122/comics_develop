import type { MediaItem, MediaSource } from '@/types/api'

export function getMediaSource(media: MediaItem): MediaSource {
  const isVideo = media.type === 'video'

  return {
    url: media.url,
    fallbackUrl: isVideo ? null : media.fallbackUrl,
    kind: isVideo ? 'video' : 'image',
    mediaType: media.type
  }
}
