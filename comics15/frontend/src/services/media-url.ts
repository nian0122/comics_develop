import type { MediaItem, MediaSource } from '@/types/api'

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
