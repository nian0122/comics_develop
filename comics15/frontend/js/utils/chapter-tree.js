import { naturalSort } from './natural-sort.js';

export function splitChapterPath(path) {
    return (path || '').replaceAll(String.fromCharCode(92), '/').split('/').filter(Boolean);
}

export function compareNaturalName(a, b) {
    const naturalKeysA = naturalSort(a);
    const naturalKeysB = naturalSort(b);

    for (let i = 0; i < Math.min(naturalKeysA.length, naturalKeysB.length); i++) {
        const keyA = naturalKeysA[i];
        const keyB = naturalKeysB[i];

        if (typeof keyA === 'number' && typeof keyB === 'number') {
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            continue;
        }

        const result = String(keyA).localeCompare(String(keyB), 'zh-CN', {
            numeric: true,
            sensitivity: 'base',
        });
        if (result !== 0) return result;
    }

    return naturalKeysA.length - naturalKeysB.length;
}

export function getChapterDisplayName(chapter) {
    const parts = splitChapterPath(chapter.path_id);
    return parts.at(-1) || chapter.name || '未命名章节';
}

export function getParentPath(path) {
    const parts = splitChapterPath(path);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
}

export function buildChapterTree(flatChapters) {
    const root = {
        name: 'root',
        path: '',
        type: 'directory',
        children: [],
    };

    flatChapters.forEach((chapter, index) => {
        const parts = splitChapterPath(chapter.path_id);
        let current = root;
        let fullPath = '';

        parts.forEach((part, partIndex) => {
            fullPath = fullPath ? `${fullPath}/${part}` : part;
            const isLeaf = partIndex === parts.length - 1;
            let node = current.children.find(child => child.name === part);

            if (!node) {
                node = {
                    name: part,
                    path: fullPath,
                    type: isLeaf ? 'chapter' : 'directory',
                    children: [],
                    flatIndex: isLeaf ? index : null,
                    path_id: isLeaf ? chapter.path_id : null,
                    chapter,
                };
                current.children.push(node);
            }

            if (isLeaf) {
                node.type = 'chapter';
                node.flatIndex = index;
                node.path_id = chapter.path_id;
                node.chapter = chapter;
            }

            current = node;
        });
    });

    sortTree(root);
    return root.children;
}

export function sortTree(node) {
    node.children.sort((a, b) => compareNaturalName(a.name, b.name));
    node.children.forEach(sortTree);
}

export function getLevelNodes(tree, currentPath = '') {
    if (!currentPath) return tree;

    const parts = splitChapterPath(currentPath);
    let nodes = tree;
    let current = null;

    for (const part of parts) {
        current = nodes.find(node => node.name === part);
        if (!current || current.type !== 'directory') return [];
        nodes = current.children;
    }

    return nodes;
}

export function formatChapterProgress(progress, totalPages = 0) {
    const pageSuffix = totalPages > 0 ? ` · ${totalPages} 页` : '';
    if (!progress || !progress.page) return `未读${pageSuffix}`;
    if (totalPages > 0 && progress.page >= totalPages) return `已读完${pageSuffix}`;
    return `读到 ${progress.page} 页${pageSuffix}`;
}
