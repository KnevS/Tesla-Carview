<template>
  <span
    v-tooltip="text"
    class="info-tip"
    tabindex="0"
    role="img"
    :aria-label="text"
  >ⓘ</span>
</template>

<script setup>
defineProps({
  text: { type: String, required: true },
});
</script>

<style scoped>
.info-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  line-height: 1;
  color: #6b7280;
  cursor: help;
  transition: color 0.15s;
  user-select: none;
  vertical-align: middle;
}
.info-tip:hover,
.info-tip:focus {
  color: #d1d5db;
  outline: none;
}
</style>
