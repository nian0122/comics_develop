import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ReaderShell from './ReaderShell.vue';

describe('ReaderShell', () => {
    let wrapper;

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.clearAllMocks();
    });

    describe('DOM 结构', () => {
        it('渲染必要的 DOM ids: readerMenuBtn, readerActions, backToDirectoryBtn, prevBtn, nextBtn, progressStatus', () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            expect(wrapper.find('#readerMenuBtn').exists()).toBe(true);
            expect(wrapper.find('#readerActions').exists()).toBe(true);
            expect(wrapper.find('#backToDirectoryBtn').exists()).toBe(true);
            expect(wrapper.find('#prevBtn').exists()).toBe(true);
            expect(wrapper.find('#nextBtn').exists()).toBe(true);
            expect(wrapper.find('#progressStatus').exists()).toBe(true);
        });

        it('progressStatus 显示传入的 progressText', () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '5 / 24',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            const status = wrapper.find('#progressStatus');
            expect(status.text()).toBe('5 / 24');
        });

        it('prevBtn 根据 canPrev prop 设置 disabled 状态', () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: false,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            const prevBtn = wrapper.find('#prevBtn');
            expect(prevBtn.attributes('disabled')).toBeDefined();
        });

        it('nextBtn 根据 canNext prop 设置 disabled 状态', () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: false,
                    progressText: '10 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            const nextBtn = wrapper.find('#nextBtn');
            expect(nextBtn.attributes('disabled')).toBeDefined();
        });

        it('readerActions 根据 actionsVisible prop 控制显示/隐藏', () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: true
                }
            });

            const actions = wrapper.find('#readerActions');
            expect(actions.classes()).not.toContain('hidden');
        });
    });

    describe('按钮事件 emit', () => {
        it('点击 prevBtn emit prev 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            await wrapper.find('#prevBtn').trigger('click');

            expect(wrapper.emitted('prev')).toBeTruthy();
            expect(wrapper.emitted('prev').length).toBe(1);
        });

        it('点击 nextBtn emit next 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            await wrapper.find('#nextBtn').trigger('click');

            expect(wrapper.emitted('next')).toBeTruthy();
            expect(wrapper.emitted('next').length).toBe(1);
        });

        it('点击 backToDirectoryBtn emit back 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            await wrapper.find('#backToDirectoryBtn').trigger('click');

            expect(wrapper.emitted('back')).toBeTruthy();
            expect(wrapper.emitted('back').length).toBe(1);
        });

        it('点击 progressStatus emit jump 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            await wrapper.find('#progressStatus').trigger('click');

            expect(wrapper.emitted('jump')).toBeTruthy();
            expect(wrapper.emitted('jump').length).toBe(1);
        });

        it('点击 readerMenuBtn emit toggle-menu 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: true,
                    actionsVisible: false
                }
            });

            await wrapper.find('#readerMenuBtn').trigger('click');

            expect(wrapper.emitted('toggle-menu')).toBeTruthy();
        });
    });

    describe('键盘事件监听', () => {
        it('ArrowLeft 键 emit prev 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                },
                attachTo: document.body
            });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

            expect(wrapper.emitted('prev')).toBeTruthy();
        });

        it('ArrowRight 键 emit next 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                },
                attachTo: document.body
            });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

            expect(wrapper.emitted('next')).toBeTruthy();
        });

        it('G 键 emit jump 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                },
                attachTo: document.body
            });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'G' }));

            expect(wrapper.emitted('jump')).toBeTruthy();
        });

        it('小写 g 键 emit jump 事件', async () => {
            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                },
                attachTo: document.body
            });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));

            expect(wrapper.emitted('jump')).toBeTruthy();
        });

        it('unmount 后移除 keydown 监听器', async () => {
            const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
            const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                }
            });

            expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

            wrapper.unmount();
            wrapper = null;

            expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        it('当 activeElement 是 INPUT 时不响应键盘事件', async () => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            wrapper = mount(ReaderShell, {
                props: {
                    canPrev: true,
                    canNext: true,
                    progressText: '1 / 10',
                    menuVisible: false,
                    actionsVisible: false
                },
                attachTo: document.body
            });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

            expect(wrapper.emitted('prev')).toBeFalsy();

            document.body.removeChild(input);
        });
    });
});
