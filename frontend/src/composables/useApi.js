const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  console.warn("⚠️ VITE_API_URL is not set. API calls will fail.");
}

export async function api(path, options = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
  });

  if (!res.ok) {
    let errorMessage = 'Request failed';

    try {
      const err = await res.json();
      errorMessage = err.error || err.message || errorMessage;
    } catch (e) {
      errorMessage = res.statusText;
    }

    throw new Error(errorMessage);
  }

  return res.json();
}

export function useApi() {
  return {
    getOverview: () => api('/api/dashboard/overview'),

    getRecommendations: (agentId) =>
      api(
        `/api/dashboard/recommendations${
          agentId ? `?agentId=${agentId}` : ''
        }`
      ),

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
