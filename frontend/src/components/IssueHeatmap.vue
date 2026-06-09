<script setup>
defineProps({
  issues: { type: Array, default: () => [] },
});

function barWidth(count, max) {
  return max ? Math.max(8, (count / max) * 100) : 0;
}
</script>

<template>
  <div class="heatmap card">
    <h3>Issue Heatmap</h3>
    <p class="desc">KPI failures across all agents (last 100 calls)</p>
    <div v-if="!issues.length" class="empty">No issues detected yet</div>
    <div v-else class="bars">
      <div v-for="issue in issues" :key="issue.kpiId" class="bar-row">
        <span class="name">{{ issue.kpiName }}</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="issue.severity"
            :style="{ width: barWidth(issue.failureCount, issues[0]?.failureCount) + '%' }"
          />
        </div>
        <span class="count">{{ issue.failureCount }}</span>
        <span class="badge" :class="'badge-' + issue.severity">{{ issue.severity }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty {
  color: var(--text-muted);
  font-size: 14px;
  padding: 20px 0;
}

.bar-row {
  display: grid;
  grid-template-columns: 140px 1fr 32px 72px;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 8px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--warning);
  transition: width 0.4s ease;
}

.bar-fill.high, .bar-fill.critical {
  background: var(--danger);
}

.count {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}
</style>
