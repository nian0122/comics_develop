import type { MediaItem, MediaSource } from '@/types/api'

/**
 * 从媒体项中解析真实播放 URL。优先级：
 * 视频：videoUrl > hqUrl
 * 图片：preferredUrl > LQ（回退 HQ）> HQ（回退 LQ）
 * LQ 加载失败时前端使用 fallbackUrl 切换到 HQ。
 */
export function getMediaSource(media: MediaItem = {}): MediaSource {
  const mediaType = media.mediaType ?? media.type ?? 'image'
  const videoUrl = media.videoUrl ?? media.video_url ?? ''
  const hqUrl = media?.hq?.url ?? media.hqUrl ?? ''
  const lqUrl = media?.lq?.url ?? media.lqUrl ?? ''
  const preferredSource = media.preferredSource ?? (media.preferredUrl ? 'hq' : '')

  if (mediaType === 'video' || videoUrl) {
    return {
      url: videoUrl || hqUrl,
      fallbackUrl: null,
      kind: 'video',
      mediaType: 'video'
    }
  }

  const preferredUrl = media.preferredUrl || (preferredSource === 'hq'
    ? hqUrl || lqUrl
    : lqUrl || hqUrl)

  return {
    url: preferredUrl,
    fallbackUrl: media.preferredUrl ? null : preferredSource === 'hq' ? lqUrl || null : hqUrl || null,
    kind: 'image',
    mediaType: 'image'
  }
}
