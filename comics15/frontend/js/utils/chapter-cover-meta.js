import { api } from '../services/api.js';

export function getChapterCoverMeta(chapter, seriesName) {
    const totalPages = Number.parseInt(chapter?.total_files, 10);
    if (!chapter?.cover_file || !chapter.cover_source) {
        return {
            totalPages: Number.isNaN(totalPages) ? 0 : totalPages,
            files: [],
            coverUrl: '',
            coverSource: '',
        };
    }

    const coverUrl = chapter.cover_source === 'lq'
        ? api.buildLQImageUrl(seriesName, chapter.cover_file, chapter.path_id)
        : api.buildHQImageUrl(seriesName, chapter.cover_file, chapter.path_id);

    return {
        totalPages: Number.isNaN(totalPages) ? 0 : totalPages,
        files: [],
        coverUrl,
        coverSource: chapter.cover_source,
    };
}
