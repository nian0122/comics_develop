<script setup lang="ts">
import type { ToolInfo } from '@/types/tools'

const props = defineProps<{
  tool: ToolInfo
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

function updateField(key: string, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}
</script>

<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
    <h2 class="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">参数配置</h2>
    <div class="space-y-4">
      <label v-for="param in tool.params" :key="param.key" class="block space-y-2 text-sm text-slate-300">
        <span>{{ param.label }}</span>
        <select
          v-if="param.type === 'select'"
          :name="param.key"
          class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          :required="param.required"
          :value="modelValue[param.key] ?? param.default ?? ''"
          @change="updateField(param.key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">请选择</option>
          <option v-for="option in param.options ?? []" :key="String(option.value ?? option)" :value="option.value ?? option">
            {{ option.label ?? option }}
          </option>
          <option v-if="!param.options || param.options.length === 0" :value="modelValue[param.key] ?? param.default ?? ''">
            {{ modelValue[param.key] ?? param.default ?? '默认' }}
          </option>
        </select>
        <input
          v-else
          :name="param.key"
          class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          :type="param.type === 'number' ? 'number' : 'text'"
          :required="param.required"
          :value="modelValue[param.key] ?? param.default ?? ''"
          @input="updateField(param.key, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </section>
</template>
