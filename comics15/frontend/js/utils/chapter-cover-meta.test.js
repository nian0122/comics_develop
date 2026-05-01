import { describe, expect, it } from 'vitest';
import { getChapterCoverMeta } from './chapter-cover-meta.js';

describe('chapter cover metadata', () => {
    it('优先使用 /api/chapters 返回的 LQ 首图元数据', () => {
        const chapter = {
            path_id: '第一卷/第 1 话',
            cover_file: '001.jpg',
            cover_source: 'lq',
            total_files: '32',
        };

        expect(getChapterCoverMeta(chapter, '测试系列')).toEqual({
            totalPages: 32,
            files: [],
            coverUrl: '/lq_image/%E6%B5%8B%E8%AF%95%E7%B3%BB%E5%88%97/%E7%AC%AC%E4%B8%80%E5%8D%B7/%E7%AC%AC%201%20%E8%AF%9D/001.webp',
            coverSource: 'lq',
        });
    });

    it('使用 HQ 首图元数据时构建 HQ 静态地址', () => {
        const chapter = {
            path_id: '第 2 话',
            cover_file: '001.png',
            cover_source: 'hq',
            total_files: '8',
        };

        expect(getChapterCoverMeta(chapter, 'Series')).toEqual({
            totalPages: 8,
            files: [],
            coverUrl: '/hq_image/Series/%E7%AC%AC%202%20%E8%AF%9D/001.png',
            coverSource: 'hq',
        });
    });

    it('缺少首图字段时返回 null 以便走旧链路回退', () => {
        expect(getChapterCoverMeta({ path_id: '第 3 话' }, 'Series')).toBeNull();
    });
});
