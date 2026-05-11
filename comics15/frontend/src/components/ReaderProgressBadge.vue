<script setup>
import { ref } from 'vue'
import JumpPageModal from './JumpPageModal.vue'

defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['jump'])
const showJumpModal = ref(false)

function confirmJump(page) {
  showJumpModal.value = false
  emit('jump', page)
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
    <div class="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 p-2 shadow-2xl backdrop-blur">
      <button data-progress="true" class="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white" @click="showJumpModal = true">
        {{ currentPage }} / {{ totalPages }}
      </button>
    </div>
  </div>

  <JumpPageModal
    v-if="showJumpModal"
    :current-page="currentPage"
    :total-pages="totalPages"
    @confirm="confirmJump"
    @close="showJumpModal = false"
  />
</template>
