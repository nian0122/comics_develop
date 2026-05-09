import { describe, expect, test } from 'vitest';
import {
    encodePathSegments,
    toSeriesListUrl,
    toSeriesUrl,
    toDirectoryUrl,
    toReaderUrl
} from './index.js';

describe('encodePathSegments', () => {
    test('normalizes Windows backslash to forward slash', () => {
        const windowsPath = ['东海篇', '第001话'].join(String.fromCharCode(92));
        const result = encodePathSegments(windowsPath);
        expect(result).toBe('%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D');
        expect(result).not.toContain('%2F');
    });

    test('encodes each segment separately without encoding slash', () => {
        const path = '东海篇/第001卷';
        const result = encodePathSegments(path);
        expect(result).toBe('%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7');
        expect(result).not.toContain('%2F');
    });

    test('filters empty segments from path', () => {
        const path = '/东海篇//第001卷/';
        const result = encodePathSegments(path);
        expect(result).toBe('%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7');
    });

    test('returns empty string for null or empty input', () => {
        expect(encodePathSegments(null)).toBe('');
        expect(encodePathSegments('')).toBe('');
        expect(encodePathSegments(undefined)).toBe('');
    });
});

describe('toSeriesListUrl', () => {
    test('returns root path', () => {
        expect(toSeriesListUrl()).toBe('/');
    });
});

describe('toSeriesUrl', () => {
    test('encodes Chinese series names by URL segment', () => {
        expect(toSeriesUrl('海贼王')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
    });

    test('preserves ASCII series names', () => {
        expect(toSeriesUrl('OnePiece')).toBe('/series/OnePiece');
    });
});

describe('toDirectoryUrl', () => {
    test('builds root directory URL without path', () => {
        expect(toDirectoryUrl('海贼王')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
    });

    test('builds root directory URL with empty path', () => {
        expect(toDirectoryUrl('海贼王', '')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
    });

    test('builds nested directory URL', () => {
        expect(toDirectoryUrl('海贼王', '东海篇/第001卷')).toBe(
            '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7'
        );
    });

    test('normalizes Windows separators in directory path', () => {
        const windowsPath = ['东海篇', '第001卷'].join(String.fromCharCode(92));
        expect(toDirectoryUrl('海贼王', windowsPath)).toBe(
            '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7'
        );
    });
});

describe('toReaderUrl', () => {
    test('builds reader URL with chapter path', () => {
        expect(toReaderUrl('海贼王', '东海篇/第001话')).toBe(
            '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D'
        );
    });

    test('normalizes Windows separators in reader URLs', () => {
        const windowsPath = ['东海篇', '第001话'].join(String.fromCharCode(92));
        expect(toReaderUrl('海贼王', windowsPath)).toBe(
            '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D'
        );
        expect(toReaderUrl('海贼王', windowsPath)).not.toContain('%2F');
    });
});