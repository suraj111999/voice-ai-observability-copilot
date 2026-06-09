<script setup>
import { RouterLink } from 'vue-router';

defineProps({
  actions: { type: Array, default: () => [] },
});

const reasonLabels = {
  missed_kpi: 'Missed KPI',
  escalation: 'Escalation',
  confusion: 'Confusion',
  compliance: 'Compliance',
};
</script>

<template>
  <div class="panel card">
    <h3>Use Actions</h3>
    <p class="desc">Segments requiring human intervention or script training</p>
    <div v-if="!actions.length" class="empty">No use actions flagged</div>
    <div v-else class="list">
      <div v-for="action in actions" :key="action.id" class="item">
        <div class="item-header">
          <span class="badge" :class="'badge-' + action.severity">{{ action.severity }}</span>
          <span class="reason">{{ reasonLabels[action.reason] || action.reason }}</span>
          <RouterLink v-if="action.callId" :to="`/calls/${action.callId}`" class="link">
            View call →
          </RouterLink>
        </div>
        <p class="agent" v-if="action.agentName">{{ action.agentName }} · {{ action.contactName }}</p>
        <blockquote class="segment">"{{ action.segment }}"</blockquote>
        <p class="suggestion">{{ action.suggestion }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
h3 { font-size: 16px; margin-bottom: 4px; }
.desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.empty { color: var(--text-muted); font-size: 14px; }

.item {
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.item:last-child { border-bottom: none; }

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.reason {
  font-size: 12px;
  color: var(--text-muted);
  flex: 1;
}

.link {
  font-size: 12px;
  font-weight: 500;
}

.agent {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.segment {
  font-size: 14px;
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--text);
  font-style: italic;
}

.suggestion {
  font-size: 13px;
  color: var(--accent-hover);
}
</style>
