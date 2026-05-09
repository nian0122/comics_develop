<template>
  <div
    id="jumpModal"
    :class="[visible ? 'flex' : 'hidden']"
    @click.self="$emit('cancel')"
  >
    <div>
      <span class="title">跳转到页码</span>
      <span>总页数：<span id="totalPages">{{ totalPages }}</span></span>
      <input
        id="jumpPageInput"
        type="number"
        min="1"
        :max="totalPages"
        v-model="inputValue"
        @keydown="handleKeyDown"
      />
      <button id="jumpCancelBtn" @click="$emit('cancel')">取消</button>
      <button id="jumpConfirmBtn" @click="confirm">确定</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    totalPages: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['confirm', 'cancel']);

const inputValue = ref('');

function validatePageNumber(value) {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return null;
    if (num < 1) return null;
    if (num > props.totalPages) return null;
    return num;
}

function confirm() {
    const pageNum = validatePageNumber(inputValue.value);
    if (pageNum !== null) {
        emit('confirm', pageNum);
    }
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        confirm();
    }
    if (event.key === 'Escape') {
        emit('cancel');
    }
}


</script>