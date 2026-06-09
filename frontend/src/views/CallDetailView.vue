<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useApi } from '../composables/useApi';

const route = useRoute();
const { getCall } = useApi();
const call = ref(null);
const loading = ref(true);

const useActionIndices = computed(() => {
  if (!call.value?.useActions) return new Set();
  return new Set(call.value.useActions.map((a) => a.segment_index));
});

async function load() {
  loading.value = true;
  try {
    call.value = await getCall(route.params.id);
  } finally {
    loading.value = false;
  }
}

function isFlagged(index) {
  return useActionIndices.value.has(index);
}

function getActionForSegment(index) {
  return call.value?.useActions?.find((a) => a.segment_index === index);
}

onMounted(load);
watch(() => route.params.id, load);
</script>

<template>
  <div class="call-detail">
    <RouterLink :to="call ? `/agents/${call.agent_id}` : '/'" class="back">
      ← Back to agent
    </RouterLink>

    <p v-if="loading" class="loading">Loading call…</p>

    <template v-if="call && !loading">
      <div class="header card">
        <div>
          <h2>{{ call.contact_name }}</h2>
          <p class="meta">
            {{ Math.floor(call.duration_seconds / 60) }}m {{ call.duration_seconds % 60 }}s
            · {{ call.outcome }}
            · {{ new Date(call.ingested_at).toLocaleString() }}
          </p>
          <p v-if="call.summary" class="summary">{{ call.summary }}</p>
        </div>
        <div v-if="call.analysis" class="score-box">
          <span class="score-val">{{ call.analysis.overall_score }}%</span>
          <span class="score-lbl">Overall Score</span>
        </div>
      </div>

      <section class="grid-2 section">
        <div class="card transcript-card">
          <h3>Transcript</h3>
          <div class="transcript">
            <div
              v-for="(seg, i) in call.transcript"
              :key="i"
              class="segment"
              :class="{ flagged: isFlagged(i), [seg.role]: true }"
            >
              <div class="seg-header">
                <span class="role">{{ seg.role }}</span>
                <span v-if="isFlagged(i)" class="flag">Use Action</span>
              </div>
              <p class="text">{{ seg.text }}</p>
              <div v-if="getActionForSegment(i)" class="action-hint">
                <span class="badge" :class="'badge-' + getActionForSegment(i).severity">
                  {{ getActionForSegment(i).severity }}
                </span>
                {{ getActionForSegment(i).suggestion }}
              </div>
            </div>
          </div>
        </div>

        <div class="side">
          <div class="card">
            <h3>KPI Breakdown</h3>
            <div v-if="call.analysis" class="kpi-scores">
              <div
                v-for="(kpi, id) in call.analysis.kpi_scores"
                :key="id"
                class="kpi-row"
                :class="{ failed: !kpi.passed }"
              >
                <div class="kpi-top">
                  <span>{{ kpi.name }}</span>
                  <span class="kpi-score" :class="{ fail: !kpi.passed }">{{ kpi.score }}%</span>
                </div>
                <p class="evidence">{{ kpi.evidence }}</p>
              </div>
            </div>
          </div>

          <div v-if="call.analysis?.deviations?.length" class="card section-sm">
            <h3>Deviations</h3>
            <div v-for="(dev, i) in call.analysis.deviations" :key="i" class="deviation">
              <span class="badge" :class="'badge-' + dev.severity">{{ dev.severity }}</span>
              <strong>{{ dev.kpiName }}</strong>
              <p>{{ dev.message }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back { font-size: 13px; color: var(--text-muted); display: inline-block; margin-bottom: 16px; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

h2 { font-size: 20px; margin-bottom: 4px; }
.meta { font-size: 13px; color: var(--text-muted); }
.summary { font-size: 14px; margin-top: 8px; color: var(--text-muted); }

.score-box {
  text-align: center;
  padding: 12px 20px;
  background: var(--surface-2);
  border-radius: 8px;
}

.score-val { display: block; font-size: 32px; font-weight: 700; color: var(--accent); }
.score-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

.section { margin-top: 16px; }
h3 { font-size: 15px; margin-bottom: 12px; }

.transcript { display: flex; flex-direction: column; gap: 10px; max-height: 600px; overflow-y: auto; }

.segment {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-2);
}

.segment.flagged {
  border: 1px solid var(--danger);
  background: rgba(239, 68, 68, 0.08);
}

.seg-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.role {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--text-muted);
}

.segment.agent .role { color: var(--accent); }

.flag {
  font-size: 10px;
  background: var(--danger);
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.text { font-size: 14px; }

.action-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--accent-hover);
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.side { display: flex; flex-direction: column; gap: 16px; }

.kpi-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.kpi-row.failed { border-left: 3px solid var(--danger); padding-left: 8px; }

.kpi-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
}

.kpi-score { font-weight: 700; color: var(--success); }
.kpi-score.fail { color: var(--danger); }

.evidence { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.section-sm { margin-top: 0; }

.deviation {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.deviation p { color: var(--text-muted); margin-top: 4px; }

.loading { color: var(--text-muted); }
</style>
