import { describe, expect, it } from 'vitest';
import { getCoverLoadPolicy, isIOSWebKitLike } from './cover-load-policy.js';

function navigatorLike({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
    return { userAgent, platform, maxTouchPoints };
}

describe('cover-load-policy', () => {
    it('识别 iPhone 和 iPadOS 触控 Mac 平台为 iOS WebKit 环境', () => {
        expect(isIOSWebKitLike(navigatorLike({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' }))).toBe(true);
        expect(isIOSWebKitLike(navigatorLike({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 }))).toBe(true);
        expect(isIOSWebKitLike(navigatorLike({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' }))).toBe(false);
    });

    it('iOS 低内存策略收紧封面并发、预加载距离和活跃图片数量', () => {
        expect(getCoverLoadPolicy(navigatorLike({ platform: 'iPhone' }))).toEqual({
            maxConcurrent: 1,
            rootMargin: '0px',
            unloadDelayMs: 1200,
            maxActiveCovers: 4,
            autoLoadCovers: false,
        });
    });

    it('非 iOS 环境保持默认封面加载策略', () => {
        expect(getCoverLoadPolicy(navigatorLike({ platform: 'Win32' }))).toEqual({
            maxConcurrent: 3,
            rootMargin: '80px 0px',
            unloadDelayMs: 0,
            maxActiveCovers: Number.POSITIVE_INFINITY,
            autoLoadCovers: true,
        });
    });
});
