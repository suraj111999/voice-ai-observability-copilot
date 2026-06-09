<script setup>
import { ref, onMounted } from 'vue';
import { useApi } from './composables/useApi';

const health = ref(null);
const { getHealth } = useApi();

onMounted(async () => {
  try {
    health.value = await getHealth();
  } catch {
    health.value = { status: 'offline' };
  }
});
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">◉</span>
          <div>
            <h1>Voice AI Observability</h1>
            <p class="subtitle">Validation Flywheel · Monitor → Analyze → Improve</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <span v-if="health" class="status-pill" :class="health.status">
          {{ health.dataSource === 'live' ? 'Live GHL Data' : health.mockMode ? 'Demo Mode' : 'Awaiting Transcripts' }}
          <span class="dot" />
        </span>
        <router-link to="/" class="nav-link">Dashboard</router-link>
      </div>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  color: var(--accent);
}

h1 {
  font-size: 18px;
  font-weight: 700;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
}

.status-pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
}

.status-pill.offline .dot {
  background: var(--danger);
}

.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.nav-link:hover {
  color: var(--text);
  text-decoration: none;
}

.main {
  padding: 24px 28px 48px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
