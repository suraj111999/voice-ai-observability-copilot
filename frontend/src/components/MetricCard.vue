<script setup>
defineProps({
  label: String,
  value: [String, Number],
  sub: String,
  trend: String,
  accent: { type: String, default: 'default' },
});
</script>

<template>
  <div class="metric card" :class="accent">
    <p class="label">{{ label }}</p>
    <p class="value">{{ value ?? '—' }}</p>
    <p v-if="sub" class="sub">{{ sub }}</p>
    <p v-if="trend" class="trend">{{ trend }}</p>
  </div>
</template>

<style scoped>
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}

.sub {
  font-size: 12px;
  color: var(--text-muted);
}

.trend {
  font-size: 12px;
  color: var(--success);
}

.metric.warning .value { color: var(--warning); }
.metric.danger .value { color: var(--danger); }
</style>
