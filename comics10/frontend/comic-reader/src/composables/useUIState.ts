/**
 * - Header/Footer 隐藏/显示逻辑 (reader.addEventListener('scroll', ...))
 * - Sidebar 响应式控制 (isMobileView(), updateSidebarState(), toggleSidebar())
 * - 键盘事件控制 (document.addEventListener('keydown', ...))
 * - 常量: SCROLL_DIRECTION_THRESHOLD, SCROLL_LOAD_THRESHOLD
 *
 * 职责: UI 状态管理（Header/Footer/Sidebar 显示隐藏、键盘快捷键）
 */

import {ref, computed} from 'vue';
import {CONSTANTS} from '@/types';

export interface UseUIStateReturn {
    headerVisible: ReturnType<typeof ref<boolean>>;
    footerVisible: ReturnType<typeof ref<boolean>>;
    sidebarVisible: ReturnType<typeof ref<boolean>>;
    isMobile: ReturnType<typeof ref<boolean>>;
    lastScrollPos: ReturnType<typeof ref<number>>;
    handleScroll: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
    toggleSidebar: () => void;
    updateSidebarState: () => void;
    isNearBottom: (scrollTop: number, scrollHeight: number, clientHeight: number) => boolean;
}

export function useUIState(): UseUIStateReturn {
    // ============== State ==============
    const headerVisible = ref<boolean>(true);
    const footerVisible = ref<boolean>(true);
    const sidebarVisible = ref<boolean>(false);
    const isMobile = ref<boolean>(false);
    const lastScrollPos = ref<number>(0);

    // ============== 移动端检测 ==============

    /**
     * 检测是否为移动端视图
     * 对应原 HTML: function isMobileView()
     */
    function checkMobile(): boolean {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    /**
     * 更新侧边栏状态
     * 对应原 HTML: function updateSidebarState()
     */
    function updateSidebarState(): void {
        isMobile.value = checkMobile();

        if (isMobile.value) {
            // 移动端默认隐藏
            sidebarVisible.value = false;
        } else {
            // 桌面端默认显示
            sidebarVisible.value = true;
        }

        console.log(`[useUIState] Mobile: ${isMobile.value}, Sidebar: ${sidebarVisible.value}`);
    }

    /**
     * 切换侧边栏显示/隐藏
     * 对应原 HTML: function toggleSidebar()
     */
    function toggleSidebar(): void {
        if (isMobile.value) {
            sidebarVisible.value = !sidebarVisible.value;
            console.log(`[useUIState] Toggled sidebar: ${sidebarVisible.value}`);
        }
    }

    // ============== 滚动处理 ==============

    /**
     * 处理滚动事件，控制 Header/Footer 显示/隐藏
     * 对应原 HTML: reader.addEventListener('scroll', ...)
     */
    function handleScroll(scrollTop: number, _scrollHeight: number, _clientHeight: number): void {
        const deltaY = scrollTop - lastScrollPos.value;

        // 只在滚动距离超过阈值时处理
        if (Math.abs(deltaY) > CONSTANTS.SCROLL_DIRECTION_THRESHOLD) {
            // 滚动到顶部附近时显示
            if (scrollTop < 10) {
                headerVisible.value = true;
                footerVisible.value = true;
            }
            // 向下滚动时隐藏
            else if (deltaY > 0 && headerVisible.value) {
                headerVisible.value = false;
                footerVisible.value = false;
            }
            // 向上滚动时显示
            else if (deltaY < 0 && !headerVisible.value) {
                headerVisible.value = true;
                footerVisible.value = true;
            }

            lastScrollPos.value = scrollTop;
        }
    }

    /**
     * 检查是否接近底部（用于触发加载更多）
     * 对应原 HTML: const isNearBottom = reader.scrollTop + reader.clientHeight >= reader.scrollHeight - SCROLL_LOAD_THRESHOLD
     */
    function isNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
        return scrollTop + clientHeight >= scrollHeight - CONSTANTS.SCROLL_LOAD_THRESHOLD;
    }

    // 初始化
    updateSidebarState();

    return {
        headerVisible: computed(() => headerVisible.value),
        footerVisible: computed(() => footerVisible.value),
        sidebarVisible: computed(() => sidebarVisible.value),
        isMobile: computed(() => isMobile.value),
        lastScrollPos: computed(() => lastScrollPos.value),
        handleScroll,
        toggleSidebar,
        updateSidebarState,
        isNearBottom,
    };
}