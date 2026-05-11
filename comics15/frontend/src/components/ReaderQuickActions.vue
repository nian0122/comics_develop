<script setup>
import { ref } from 'vue'

const props = defineProps({
  previousDisabled: {
    type: Boolean,
    default: false
  },
  nextDisabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['previous', 'next', 'back'])
const menuOpen = ref(false)
const visible = ref(true)

function toggleMenu() {
  visible.value = true
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
  visible.value = true
}
</script>

<template>
  <div v-if="menuOpen" data-reader-overlay="true" class="fixed inset-0 z-30 bg-transparent" @click="closeMenu"></div>

  <div v-if="visible" class="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-end px-4">
    <div class="pointer-events-auto flex flex-col items-end gap-2">
      <div v-if="menuOpen" class="flex flex-col items-end gap-2 rounded-3xl border border-slate-800 bg-slate-950/90 p-3 shadow-2xl backdrop-blur">
        <button data-back="true" class="rounded-full px-4 py-2 text-sm text-slate-300" @click="emit('back'); closeMenu()">返回目录</button>
        <button data-prev="true" class="rounded-full px-4 py-2 text-sm text-slate-300 disabled:opacity-40" :disabled="previousDisabled" @click="emit('previous'); closeMenu()">
          上一话
        </button>
        <button data-next="true" class="rounded-full px-4 py-2 text-sm text-slate-300 disabled:opacity-40" :disabled="nextDisabled" @click="emit('next'); closeMenu()">
          下一话
        </button>
      </div>

      <div class="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 p-2 shadow-2xl backdrop-blur">
        <button data-menu-toggle="true" class="rounded-full bg-slate-800 px-4 py-2 text-xl leading-none text-white" @click="toggleMenu">
          ⋯
        </button>
      </div>
    </div>
  </div>
</template>
