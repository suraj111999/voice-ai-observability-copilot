<script setup>
defineProps({
  rec: Object,
});
</script>

<template>
  <div class="rec card">
    <div class="rec-header">
      <span class="badge" :class="'badge-' + rec.priority">{{ rec.priority }}</span>
      <span class="category">{{ rec.category }}</span>
    </div>
    <h4>{{ rec.title }}</h4>
    <p class="desc">{{ rec.description }}</p>
    <div v-if="rec.suggested_prompt_change" class="prompt-box">
      <p class="prompt-label">Suggested prompt change</p>
      <pre>{{ rec.suggested_prompt_change }}</pre>
    </div>
  </div>
</template>

<style scoped>
.rec-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.category {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: capitalize;
}

h4 {
  font-size: 15px;
  margin-bottom: 6px;
}

.desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.prompt-box {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 12px;
}

.prompt-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

pre {
  font-size: 13px;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.5;
}
</style>
