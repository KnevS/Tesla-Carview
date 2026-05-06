<template>
  <div class="card" :class="{ 'cursor-help': tooltip }" v-tooltip="tooltip">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-gray-400 text-sm">{{ label }}</p>
        <p class="text-2xl font-bold mt-1">{{ value }}</p>
        <p v-if="sub" class="text-gray-400 text-sm mt-1">{{ sub }}</p>
      </div>
      <span class="text-3xl">{{ icon }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label:   String,
  value:  [String, Number],
  sub:     String,
  icon:    String,
  tooltip: String,
});
</script>
