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

  <div v-if="visible" class="fixed inset-x-0 bottom-4 z-50 flex justify-end px-4 pointer-events-none">
    <div class="flex flex-col items-end gap-2">
      <div v-if="menuOpen" class="flex flex-col items-end gap-2 rounded-full border border-white/30 bg-white/[0.08] p-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] relative overflow-hidden backdrop-blur-sm pointer-events-auto">
        <button data-back="true" class="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white transition" @click="emit('back'); closeMenu()">返回目录</button>
        <button 
          data-prev="true" 
          class="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white transition disabled:opacity-40" 
          :disabled="previousDisabled" 
          @click="emit('previous'); 
          closeMenu()">
          上一话
        </button>
        <button 
          data-next="true" 
          class="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white transition disabled:opacity-40" 
          :disabled="nextDisabled" 
          @click="emit('next'); 
          closeMenu()">
          下一话
        </button>
      </div>

      <button 
        data-menu-toggle="true"   
        class="
        rounded-full 
        border border-white/30 
        bg-white/[0.08] 
        px-5 py-2 
        text-sm font-medium text-white 
        shadow-[0_0_20px_rgba(255,255,255,0.15)] 
        relative overflow-hidden 
        before:absolute before:inset-0 
        before:rounded-full 
        before:bg-gradient-to-b 
        before:from-white/40 before:to-transparent 
        before:opacity-60 
        pointer-events-auto
        "  
        @click="toggleMenu">
        ⋯
      </button>
    </div>
  </div>
</template>
