import { describe, expect, test } from 'vitest';
import { toDirectoryUrl, toReaderUrl, toSeriesListUrl, toSeriesUrl } from './route-builder.js';

describe('route-builder', () => {
    test('builds the series list URL', () => {
        expect(toSeriesListUrl()).toBe('/');
    });

    test('encodes Chinese series names by URL segment', () => {
        expect(toSeriesUrl('海贼王')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
    });

    test('builds root and nested directory URLs', () => {
        expect(toDirectoryUrl('海贼王')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
        expect(toDirectoryUrl('海贼王', '东海篇/第001卷')).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7');
    });

    test('normalizes Windows separators in reader URLs', () => {
        const windowsPath = ['东海篇', '第001话'].join(String.fromCharCode(92));
        expect(toReaderUrl('海贼王', windowsPath)).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D');
    });
});
