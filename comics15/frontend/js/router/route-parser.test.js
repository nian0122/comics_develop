import { describe, expect, test } from 'vitest';
import { parseRoute } from './route-parser.js';

describe('route-parser', () => {
    test('parses the series list route', () => {
        expect(parseRoute('/')).toEqual({ name: 'seriesList' });
    });

    test('parses encoded series directory routes', () => {
        expect(parseRoute('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B')).toEqual({
            name: 'directory',
            series: '海贼王',
            path: '',
        });
    });

    test('parses nested directory paths by segment', () => {
        expect(parseRoute('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E5%8D%B7')).toEqual({
            name: 'directory',
            series: '海贼王',
            path: '东海篇/第001卷',
        });
    });

    test('parses nested reader chapter paths', () => {
        expect(parseRoute('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D')).toEqual({
            name: 'reader',
            series: '海贼王',
            path: '东海篇/第001话',
        });
    });

    test('returns notFound for unsupported paths', () => {
        expect(parseRoute('/unknown/path')).toEqual({ name: 'notFound' });
        expect(parseRoute('/series')).toEqual({ name: 'notFound' });
    });

    test('returns notFound instead of throwing for malformed encodings', () => {
        expect(parseRoute('/series/%E0%A4%A')).toEqual({ name: 'notFound' });
        expect(parseRoute('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E0%A4%A')).toEqual({ name: 'notFound' });
    });
});
