<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useApi } from '../composables/useApi';
import RecommendationCard from '../components/RecommendationCard.vue';

const route = useRoute();
const { getAgent } = useApi();
const agent = ref(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    agent.value = await getAgent(route.params.id);
  } finally {
    loading.value = false;
  }
}

function scoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

onMounted(load);
watch(() => route.params.id, load);
</script>

<template>
  <div class="agent-detail">
    <RouterLink to="/" class="back">← Back to dashboard</RouterLink>

    <p v-if="loading" class="loading">Loading agent…</p>

    <template v-if="agent && !loading">
      <div class="header">
        <div>
          <h2>{{ agent.name }}</h2>
          <p class="script">{{ agent.script_summary }}</p>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="val">{{ agent.call_count }}</span>
            <span class="lbl">Calls</span>
          </div>
          <div class="stat">
            <span class="val" :class="scoreClass(agent.avg_score)">
              {{ agent.avg_score ? Math.round(agent.avg_score) + '%' : '—' }}
            </span>
            <span class="lbl">Avg Score</span>
          </div>
        </div>
      </div>

      <section class="grid-2 section">
        <div class="card">
          <h3>Observability KPIs</h3>
          <div class="kpi-list">
            <div v-for="kpi in agent.kpis" :key="kpi.id" class="kpi">
              <div class="kpi-header">
                <strong>{{ kpi.name }}</strong>
                <span class="weight">{{ kpi.weight }}%</span>
              </div>
              <p class="criteria">{{ kpi.criteria }}</p>
              <span v-if="kpi.required" class="badge badge-high">Required</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Recommendations</h3>
          <div class="rec-list">
            <RecommendationCard v-for="rec in agent.recommendations" :key="rec.id" :rec="rec" />
            <p v-if="!agent.recommendations?.length" class="empty">No recommendations</p>
          </div>
        </div>
      </section>

      <section class="card section">
        <h3>Recent Calls</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Duration</th>
              <th>Score</th>
              <th>Issues</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="call in agent.recentCalls" :key="call.id">
              <td>{{ call.contact_name }}</td>
              <td>{{ Math.floor(call.duration_seconds / 60) }}m {{ call.duration_seconds % 60 }}s</td>
              <td>
                <span class="score" :class="scoreClass(call.overall_score)">
                  {{ call.overall_score }}%
                </span>
              </td>
              <td class="issues">
                <span v-for="d in call.deviations.slice(0, 2)" :key="d.kpiId" class="tag">
                  {{ d.kpiName }}
                </span>
              </td>
              <td class="date">{{ new Date(call.ingested_at).toLocaleDateString() }}</td>
              <td><RouterLink :to="`/calls/${call.id}`">View →</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back {
  font-size: 13px;
  color: var(--text-muted);
  display: inline-block;
  margin-bottom: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

h2 { font-size: 22px; margin-bottom: 6px; }
.script { color: var(--text-muted); font-size: 14px; max-width: 600px; }

.stats { display: flex; gap: 24px; }

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.val { font-size: 28px; font-weight: 700; }
.lbl { font-size: 12px; color: var(--text-muted); }

.val.good { color: var(--success); }
.val.warn { color: var(--warning); }
.val.bad { color: var(--danger); }

.section { margin-top: 20px; }
h3 { font-size: 16px; margin-bottom: 12px; }

.kpi {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.weight { font-size: 12px; color: var(--accent); font-weight: 600; }
.criteria { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }

.table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; font-size: 12px; color: var(--text-muted); padding: 8px 12px; border-bottom: 1px solid var(--border); }
td { padding: 12px; border-bottom: 1px solid var(--border); }

.score.good { color: var(--success); font-weight: 600; }
.score.warn { color: var(--warning); font-weight: 600; }
.score.bad { color: var(--danger); font-weight: 600; }

.tag {
  display: inline-block;
  font-size: 11px;
  background: var(--surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
}

.date { font-size: 13px; color: var(--text-muted); }
.rec-list { display: flex; flex-direction: column; gap: 12px; }
.empty, .loading { color: var(--text-muted); }
</style>
