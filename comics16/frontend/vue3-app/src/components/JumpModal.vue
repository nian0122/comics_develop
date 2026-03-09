<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  totalPages: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  totalPages: 0,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'jump', page: number): void
}>()

const inputValue = ref('')
const inputError = ref('')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      inputValue.value = ''
      inputError.value = ''
    }
  }
)

function handleConfirm() {
  const pageNum = parseInt(inputValue.value, 10)

  if (isNaN(pageNum) || pageNum < 1) {
    inputError.value = '请输入有效的页码'
    showInputError()
    return
  }

  if (pageNum > props.totalPages) {
    inputError.value = `页码超出范围，最大为 ${props.totalPages}`
    showInputError()
    return
  }

  emit('jump', pageNum)
  emit('update:modelValue', false)
}

function handleCancel() {
  emit('update:modelValue', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  }
  if (e.key === 'Escape') {
    handleCancel()
  }
}

function showInputError() {
  const input = document.getElementById('jumpPageInput')
  if (input) {
    input.classList.add('border-red-500', 'ring-2', 'ring-red-200')
    
    // 晃动动画
    input.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' },
      ],
      {
        duration: 300,
        easing: 'ease-in-out',
      }
    )

    setTimeout(() => {
      input.classList.remove('border-red-500', 'ring-2', 'ring-red-200')
    }, 500)
  }
}

</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center modal-enter-active"
      @click.self="handleCancel"
    >
      <div class="glass-strong rounded-2xl p-6 w-72 shadow-2xl">
        <div class="text-center mb-4">
          <div class="title text-lg">跳转页码</div>
          <div class="chapter-title text-sm mt-1">共 <span>{{ totalPages }}</span> 页</div>
        </div>

        <input
          id="jumpPageInput"
          ref="setInputRef"
          v-model="inputValue"
          type="number"
          min="1"
          :max="totalPages"
          class="w-full glass-input rounded-xl text-center text-lg mb-4"
          placeholder="输入页码"
          @keydown="handleKeydown"
        />

        <div class="flex space-x-3">
          <button class="flex-1 glass-btn rounded-xl" @click="handleCancel">
            取消
          </button>
          <button class="flex-1 primary-btn rounded-xl" @click="handleConfirm">
            跳转
          </button>
        </div>

        <div class="mt-3 text-center">
          <span class="text-xs status-text opacity-50">按 G 键或点击状态栏打开跳转</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
