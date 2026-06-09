<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useApi } from '../composables/useApi';
import MetricCard from '../components/MetricCard.vue';
import IssueHeatmap from '../components/IssueHeatmap.vue';
import UseActionPanel from '../components/UseActionPanel.vue';
import RecommendationCard from '../components/RecommendationCard.vue';

const { getOverview, getRecommendations, syncGhl } = useApi();
const overview = ref(null);
const recommendations = ref([]);
const loading = ref(true);
const syncing = ref(false);
const error = ref(null);
let pollTimer;

async function load() {
  try {
    const [ov, rec] = await Promise.all([getOverview(), getRecommendations()]);
    overview.value = ov;
    recommendations.value = rec.recommendations || [];
    error.value = null;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleSync() {
  syncing.value = true;
  try {
    await syncGhl();
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    syncing.value = false;
  }
}

function scoreClass(score) {
  if (score == null) return '';
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

onMounted(() => {
  load();
  pollTimer = setInterval(load, 10000);
});

onUnmounted(() => clearInterval(pollTimer));
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h2>Unified Observability Dashboard</h2>
        <p class="page-desc">Real-time performance across all Voice AI agents</p>
      </div>
      <button class="btn-sync" :disabled="syncing" @click="handleSync">
        {{ syncing ? 'Syncing…' : '↻ Sync from GHL' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="loading">Loading observability data…</p>

    <div v-if="overview && !loading && overview.totalCalls === 0" class="empty-state card">
      <h3>No transcripts yet</h3>
      <p>Make test calls to your Voice AI agent in the GHL sandbox, then either:</p>
      <ul>
        <li>Set up the <strong>Transcript Generated → Custom Webhook</strong> workflow, or</li>
        <li>Configure <strong>GHL_API_KEY</strong> and click <strong>Sync from GHL</strong></li>
      </ul>
      <p class="hint">See <code>docs/GHL_SANDBOX_SETUP.md</code> for step-by-step instructions.</p>
    </div>

    <template v-if="overview && !loading && overview.totalCalls > 0">
      <section class="metrics grid-3">
        <MetricCard label="Total Calls Monitored" :value="overview.totalCalls" sub="Across all agents" />
        <MetricCard
          label="Average Score"
          :value="overview.avgScore + '%'"
          :accent="overview.avgScore < 70 ? 'warning' : 'default'"
          sub="Weighted KPI performance"
        />
        <MetricCard label="Active Agents" :value="overview.agents.length" sub="Under observability" />
      </section>

      <section class="grid-2 section">
        <div class="card agents-card">
          <h3>Agent Performance</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Calls</th>
                <th>Score</th>
                <th>Top Issue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="agent in overview.agents" :key="agent.id">
                <td>
                  <strong>{{ agent.name }}</strong>
                  <span class="type">{{ agent.agentType }}</span>
                </td>
                <td>{{ agent.callCount }}</td>
                <td>
                  <span class="score" :class="scoreClass(agent.avgScore)">
                    {{ agent.avgScore != null ? agent.avgScore + '%' : '—' }}
                  </span>
                </td>
                <td class="issue">{{ agent.topIssue || '—' }}</td>
                <td>
                  <RouterLink :to="`/agents/${agent.id}`" class="btn-sm">Analyze →</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <IssueHeatmap :issues="overview.issueHeatmap" />
      </section>

      <section class="grid-2 section">
        <UseActionPanel :actions="overview.recentUseActions" />
        <div class="recs">
          <h3>Top Recommendations</h3>
          <p class="desc">Rule-based script and prompt adjustments from KPI failures</p>
          <div class="rec-list">
            <RecommendationCard
              v-for="rec in recommendations.slice(0, 4)"
              :key="rec.id"
              :rec="rec"
            />
            <p v-if="!recommendations.length" class="empty">No recommendations yet</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

h2 { font-size: 22px; margin-bottom: 4px; }
.page-desc { color: var(--text-muted); font-size: 14px; }

.btn-sync {
  background: var(--accent);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.btn-sync:hover:not(:disabled) { background: var(--accent-hover); }
.btn-sync:disabled { opacity: 0.6; cursor: not-allowed; }

.error { color: var(--danger); margin-bottom: 16px; }
.loading { color: var(--text-muted); }

.section { margin-top: 20px; }

h3 { font-size: 16px; margin-bottom: 12px; }
.desc { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.type {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: capitalize;
}

.score.good { color: var(--success); font-weight: 600; }
.score.warn { color: var(--warning); font-weight: 600; }
.score.bad { color: var(--danger); font-weight: 600; }

.issue {
  font-size: 13px;
  color: var(--text-muted);
}

.btn-sm {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-hover);
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty { color: var(--text-muted); font-size: 14px; }

.empty-state {
  margin-bottom: 20px;
  border-color: var(--accent);
}

.empty-state h3 { margin-bottom: 8px; }
.empty-state ul { margin: 12px 0 12px 20px; font-size: 14px; color: var(--text-muted); }
.empty-state .hint { font-size: 13px; color: var(--text-muted); }
</style>
