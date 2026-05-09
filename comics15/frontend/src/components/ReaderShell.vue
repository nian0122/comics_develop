<template>
  <section id="readerView">
    <button id="readerMenuBtn" :class="{ hidden: !menuVisible }" @click="$emit('toggle-menu')">
      菜单
    </button>
    <div id="readerActions" :class="{ hidden: !actionsVisible }">
      <button id="backToDirectoryBtn" @click="$emit('back')">返回目录</button>
      <button id="prevBtn" :disabled="!canPrev" @click="$emit('prev')">上一章</button>
      <button id="nextBtn" :disabled="!canNext" @click="$emit('next')">下一章</button>
    </div>
    <button id="progressStatus" @click="$emit('jump')">{{ progressText }}</button>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

defineProps({
    canPrev: {
        type: Boolean,
        default: false
    },
    canNext: {
        type: Boolean,
        default: false
    },
    progressText: {
        type: String,
        default: '0 / 0'
    },
    menuVisible: {
        type: Boolean,
        default: false
    },
    actionsVisible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['prev', 'next', 'back', 'jump', 'toggle-menu']);

function handleKeydown(event) {
    if (document.activeElement?.tagName === 'INPUT') return;

    if (event.key === 'ArrowLeft') {
        emit('prev');
        event.preventDefault();
    }
    if (event.key === 'ArrowRight') {
        emit('next');
        event.preventDefault();
    }
    if ((event.key === 'g' || event.key === 'G') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        emit('jump');
        event.preventDefault();
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
});
</script>
