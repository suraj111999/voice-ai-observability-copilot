const API_BASE =  'https://voice-ai-observability-copilot-production.up.railway.app';

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function useApi() {
  return {
    getOverview: () => api('/api/dashboard/overview'),
    getRecommendations: (agentId) =>
      api(`/api/dashboard/recommendations${agentId ? `?agentId=${agentId}` : ''}`),
    getAgents: () => api('/api/agents'),
    getAgent: (id) => api(`/api/agents/${id}`),
    getCall: (id) => api(`/api/calls/${id}`),
    getCalls: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api(`/api/calls${q ? `?${q}` : ''}`);
    },
    getHealth: () => api('/api/health'),
    syncGhl: () => api('/api/sync/ghl', { method: 'POST' }),
    updateKpis: (agentId, kpis) =>
      api(`/api/agents/${agentId}/kpis`, {
        method: 'PUT',
        body: JSON.stringify({ kpis }),
      }),
  };
}
