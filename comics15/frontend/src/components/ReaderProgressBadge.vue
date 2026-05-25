<script setup lang="ts">
import { ref } from 'vue'
import JumpPageModal from './JumpPageModal.vue'

defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  jump: [page: number]
}>()

const showJumpModal = ref(false)

function confirmJump(page: number) {
  showJumpModal.value = false
  emit('jump', page)
}
</script>

<template>
  <div class="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <button
        data-progress="true"
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
        "
        @click="showJumpModal = true"
      >
        {{ currentPage }} / {{ totalPages }}
      </button>
  </div>

  <JumpPageModal
    v-if="showJumpModal"
    :current-page="currentPage"
    :total-pages="totalPages"
    @confirm="confirmJump"
    @close="showJumpModal = false"
  />
</template>
