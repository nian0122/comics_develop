import { LAZY_LOAD_CONFIG } from '../config/constants.js';

export function isIOSWebKitLike(navigatorLike = window.navigator) {
    const platform = navigatorLike?.platform || '';
    const userAgent = navigatorLike?.userAgent || '';
    const maxTouchPoints = navigatorLike?.maxTouchPoints || 0;

    return /iPad|iPhone|iPod/.test(platform)
        || /iPad|iPhone|iPod/.test(userAgent)
        || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function getCoverLoadPolicy(navigatorLike = window.navigator) {
    if (isIOSWebKitLike(navigatorLike)) {
        return {
            maxConcurrent: 1,
            rootMargin: '0px',
            unloadDelayMs: 1200,
            maxActiveCovers: 4,
            autoLoadCovers: false,
        };
    }

    return {
        maxConcurrent: LAZY_LOAD_CONFIG.COVER_MAX_CONCURRENT,
        rootMargin: LAZY_LOAD_CONFIG.COVER_ROOT_MARGIN,
        unloadDelayMs: 0,
        maxActiveCovers: Number.POSITIVE_INFINITY,
        autoLoadCovers: true,
    };
}
