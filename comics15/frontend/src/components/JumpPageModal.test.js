import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import JumpPageModal from './JumpPageModal.vue';

describe('JumpPageModal', () => {
    let wrapper;

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
        vi.clearAllMocks();
    });

    describe('DOM 结构', () => {
        it('渲染必要的 DOM ids: jumpModal, jumpPageInput, jumpCancelBtn, jumpConfirmBtn', () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            expect(wrapper.find('#jumpModal').exists()).toBe(true);
            expect(wrapper.find('#jumpPageInput').exists()).toBe(true);
            expect(wrapper.find('#jumpCancelBtn').exists()).toBe(true);
            expect(wrapper.find('#jumpConfirmBtn').exists()).toBe(true);
        });

        it('渲染 totalPages 显示元素', () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 50 }
            });

            const totalPagesEl = wrapper.find('#totalPages');
            expect(totalPagesEl.exists()).toBe(true);
            expect(totalPagesEl.text()).toBe('50');
        });

        it('visible=false 时 jumpModal 有 hidden 类', () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: false, totalPages: 100 }
            });

            const modal = wrapper.find('#jumpModal');
            expect(modal.classes()).toContain('hidden');
            expect(modal.classes()).not.toContain('flex');
        });

        it('visible=true 时 jumpModal 有 flex 类且无 hidden', () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const modal = wrapper.find('#jumpModal');
            expect(modal.classes()).toContain('flex');
            expect(modal.classes()).not.toContain('hidden');
        });
    });

    describe('页码输入验证', () => {
        it('输入有效页码并点击 confirm 触发 confirm emit', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('25');
            await wrapper.find('#jumpConfirmBtn').trigger('click');

            expect(wrapper.emitted('confirm')).toBeTruthy();
            expect(wrapper.emitted('confirm')[0]).toEqual([25]);
        });

        it('输入页码超出范围时不 emit confirm', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 50 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('100');
            await wrapper.find('#jumpConfirmBtn').trigger('click');

            expect(wrapper.emitted('confirm')).toBeFalsy();
        });

        it('输入页码小于 1时不 emit confirm', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 50 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('0');
            await wrapper.find('#jumpConfirmBtn').trigger('click');

            expect(wrapper.emitted('confirm')).toBeFalsy();
        });

        it('输入非数字时不 emit confirm', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 50 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('abc');
            await wrapper.find('#jumpConfirmBtn').trigger('click');

            expect(wrapper.emitted('confirm')).toBeFalsy();
        });
    });

    describe('取消/关闭行为', () => {
        it('点击 jumpCancelBtn 触发 cancel emit', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            await wrapper.find('#jumpCancelBtn').trigger('click');

            expect(wrapper.emitted('cancel')).toBeTruthy();
            expect(wrapper.emitted('cancel').length).toBe(1);
        });

        it('在 jumpPageInput 上按 Escape 触发 cancel emit', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.trigger('keydown', { key: 'Escape' });

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('点击 jumpModal 背景（模态框外部）触发 cancel emit', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const modal = wrapper.find('#jumpModal');
            await modal.trigger('click');

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('点击模态框内部内容区域不触发 cancel', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const innerDiv = wrapper.find('#jumpModal > div');
            await innerDiv.trigger('click');

            expect(wrapper.emitted('cancel')).toBeFalsy();
        });
    });

    describe('Enter 键确认', () => {
        it('在 jumpPageInput 上按 Enter 触发 confirm emit（有效页码）', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 100 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('30');
            await input.trigger('keydown', { key: 'Enter' });

            expect(wrapper.emitted('confirm')).toBeTruthy();
            expect(wrapper.emitted('confirm')[0]).toEqual([30]);
        });

        it('Enter 键无效页码时不 emit confirm', async () => {
            wrapper = mount(JumpPageModal, {
                props: { visible: true, totalPages: 50 }
            });

            const input = wrapper.find('#jumpPageInput');
            await input.setValue('200');
            await input.trigger('keydown', { key: 'Enter' });

            expect(wrapper.emitted('confirm')).toBeFalsy();
        });
    });
});