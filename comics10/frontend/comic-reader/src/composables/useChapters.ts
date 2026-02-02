/**
 * - buildChapterTree(): 构建章节树形结构
 * - renderChapters(): 渲染章节列表
 * - toggleVolume(): 切换卷展开/折叠
 * - findNodeInTree(): 在树中查找节点
 * - containsFilteredChapters(): 判断是否包含过滤后的章节
 * - filterInput 事件监听
 * - localStorage expandedPaths 保存/恢复
 *
 * 职责: 章节树形结构构建、搜索过滤、展开状态管理
 */

import {ref, computed} from 'vue';
import {comicApi} from '@/api/comicApi';
import {naturalSort, type ChapterInfo, type ChapterNode} from '@/types';

export interface UseChaptersReturn {
    flatChapters: ReturnType<typeof ref<ChapterInfo[]>>;
    chapterTree: ReturnType<typeof ref<ChapterNode[]>>;
    filterText: ReturnType<typeof ref<string>>;
    expandedPaths: ReturnType<typeof ref<Record<string, boolean>>>;
    buildTree: (flatChapters: ChapterInfo[]) => void;
    toggleVolume: (fullPath: string, tree: ChapterNode[]) => void;
    findNode: (tree: ChapterNode[], fullPath: string) => ChapterNode | null;
    loadChapters: (seriesName: string) => Promise<ChapterInfo[] | null>;
}

export function useChapters(): UseChaptersReturn {
    // ============== State ==============
    const flatChapters = ref<ChapterInfo[]>([]);
    const chapterTree = ref<ChapterNode[]>([]);
    const filterText = ref<string>('');
    const expandedPaths = ref<Record<string, boolean>>({});

    // 从 localStorage 加载展开状态
    try {
        const saved = localStorage.getItem('expandedPaths');
        if (saved) {
            expandedPaths.value = JSON.parse(saved);
        }
    } catch {
        expandedPaths.value = {};
    }

    // ============== Actions ==============

    /**
     * 加载章节列表
     * 对应原 HTML: fetchAndRenderChapters() 中的章节加载部分
     */
    async function loadChapters(seriesName: string): Promise<ChapterInfo[] | null> {
        try {
            const chapters = await comicApi.getChapters(seriesName);
            flatChapters.value = chapters;
            console.log(`[useChapters] Loaded ${chapters.length} chapters for ${seriesName}`);
            return chapters;
        } catch (err) {
            console.error('[useChapters] Error loading chapters:', err);
            flatChapters.value = [];
            chapterTree.value = [];
            return null;
        }
    }

    /**
     * 根据扁平章节列表构建树形结构
     * 对应原 HTML: function buildChapterTree(flatChapters)
     */
    function buildTree(flatChapters: ChapterInfo[]): void {
        const root: {
            name: string;
            children: Record<string, ChapterNode>;
        } = {
            name: 'root',
            children: {},
        };

        flatChapters.forEach((chapter, index) => {
            // 分割路径: path_id 可能包含 / 或 \
            const parts = chapter.path_id.split(/[\\/]/).filter((p) => p);
            let current = root;
            let fullPath = '';

            parts.forEach((part, i) => {
                fullPath = fullPath ? `${fullPath}/${part}` : part;

                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        fullPath: fullPath,
                        children: [],
                        isChapter: i === parts.length - 1,
                        flatIndex: i === parts.length - 1 ? index : null,
                        path_id: i === parts.length - 1 ? chapter.path_id : null,
                        isExpanded: expandedPaths.value[fullPath] !== false,
                    };
                }
                current = current.children[part] as unknown as typeof root;
            });
        });

        // 递归排序子节点
        const sortChildren = (node: { children: Record<string, ChapterNode> }): ChapterNode[] => {
            const childrenArray = Object.values(node.children);

            childrenArray.sort((a, b) => {
                // 目录排在前面
                if (!a.isChapter && b.isChapter) return -1;
                if (a.isChapter && !b.isChapter) return 1;

                // 自然排序
                const naturalKeysA = naturalSort(a.name);
                const naturalKeysB = naturalSort(b.name);

                for (let i = 0; i < Math.min(naturalKeysA.length, naturalKeysB.length); i++) {
                    if (naturalKeysA[i] < naturalKeysB[i]) return -1;
                    if (naturalKeysA[i] > naturalKeysB[i]) return 1;
                }
                return naturalKeysA.length - naturalKeysB.length;
            });

            childrenArray.forEach((child) => {
                if (child.children.length > 0) {
                    child.children = sortChildren({children: child.children as unknown as Record<string, ChapterNode>});
                }
            });

            return childrenArray;
        };

        chapterTree.value = sortChildren(root);
        console.log(`[useChapters] Built tree with ${chapterTree.value.length} root nodes`);
    }

    /**
     * 在树中查找节点
     * 对应原 HTML: function findNodeInTree(tree, fullPath)
     */
    function findNode(tree: ChapterNode[], fullPath: string): ChapterNode | null {
        for (const node of tree) {
            if (node.fullPath === fullPath) {
                return node;
            }
            if (node.children.length > 0 && !node.isChapter) {
                const found = findNode(node.children, fullPath);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * 切换卷的展开/折叠状态
     * 对应原 HTML: function toggleVolume(fullPath)
     */
    function toggleVolume(fullPath: string, tree: ChapterNode[]): void {
        const node = findNode(tree, fullPath);
        if (node) {
            node.isExpanded = !node.isExpanded;
            expandedPaths.value[fullPath] = node.isExpanded;

            // 保存到 localStorage
            localStorage.setItem('expandedPaths', JSON.stringify(expandedPaths.value));

            // 触发响应式更新
            chapterTree.value = [...tree];

            console.log(`[useChapters] Toggled volume ${fullPath}: ${node.isExpanded}`);
        }
    }

    return {
        flatChapters: computed(() => flatChapters.value),
        chapterTree: computed(() => chapterTree.value),
        filterText: computed({
            get: () => filterText.value,
            set: (val) => {
                filterText.value = val;
            },
        }),
        expandedPaths: computed(() => expandedPaths.value),
        buildTree,
        toggleVolume,
        findNode,
        loadChapters,
    };
}