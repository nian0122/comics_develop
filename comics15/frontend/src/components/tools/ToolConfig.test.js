import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ToolConfig from './ToolConfig.vue'

describe('ToolConfig', () => {
  it('根据参数渲染输入项并触发更新', async () => {
    const wrapper = mount(ToolConfig, {
      props: {
        tool: {
          name: 'image-optimizer',
          params: [
            { key: 'rootDir', label: '根目录', type: 'text', required: false, default: '' },
            { key: 'workers', label: '并发数', type: 'number', required: false, default: '8' }
          ]
        },
        modelValue: {
          rootDir: 'D:/demo',
          workers: '8'
        }
      }
    })

    expect(wrapper.text()).toContain('根目录')
    expect(wrapper.text()).toContain('并发数')

    await wrapper.get('input[name="rootDir"]').setValue('D:/comic')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
})
