import { api } from '../services/api.js';

export function getChapterCoverMeta(chapter, seriesName) {
    if (!chapter?.cover_file || !chapter.cover_source) return null;

    const coverUrl = chapter.cover_source === 'lq'
        ? api.buildLQImageUrl(seriesName, chapter.cover_file, chapter.path_id)
        : api.buildHQImageUrl(seriesName, chapter.cover_file, chapter.path_id);
    const totalPages = Number.parseInt(chapter.total_files, 10);

    return {
        totalPages: Number.isNaN(totalPages) ? 0 : totalPages,
        files: [],
        coverUrl,
        coverSource: chapter.cover_source,
    };
}
