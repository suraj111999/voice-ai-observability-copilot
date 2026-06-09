import { parsePlainTranscript } from './transcriptParser.js';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: '2023-02-21',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export function isGhlConfigured() {
  return !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

async function ghlFetch(path, { apiKey, method = 'GET', body } = {}) {
  const key = apiKey || process.env.GHL_API_KEY;
  if (!key) throw new Error('GHL_API_KEY missing');

  const response = await fetch(`${GHL_API_BASE}${path}`, {
    method,
    headers: authHeaders(key),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `GHL API ${response.status} ${path}: ${text.slice(0, 500)}`
    );
  }

  return data;
}

//
// ✅ CALL LOGS (FIXED ENDPOINT)
//
export async function fetchCallLogs({ limit = 50, agentId, locationId } = {}) {
  const loc = locationId || process.env.GHL_LOCATION_ID;
  if (!loc) throw new Error('GHL_LOCATION_ID required');

  const params = new URLSearchParams({
    locationId: loc,
  });

  if (agentId) params.set('agentId', agentId);

  const data = await ghlFetch(
    `/voice-ai/dashboard/call-logs?${params.toString()}`
  );

  return data.callLogs || data.data || data.calls || [];
}

//
// ⚠️ NO DIRECT CALL-BY-ID API EXISTS → FIXED APPROACH
//
export async function fetchCallById(callId, locationId) {
  const calls = await fetchCallLogs({ locationId });
  return calls.find(
    (c) => c.id === callId || c.callId === callId || c.messageId === callId
  );
}

//
// AGENTS
//
export async function fetchAgents(locationId) {
  const loc = locationId || process.env.GHL_LOCATION_ID;
  if (!loc) return [];

  const data = await ghlFetch(
    `/voice-ai/agents?locationId=${loc}`
  );

  return data.agents || data.data || [];
}

//
// CONVERSATION TRANSCRIPT (VALID ENDPOINT)
//
export async function fetchMessageTranscription(locationId, messageId) {
  return ghlFetch(
    `/conversations/locations/${locationId}/messages/${messageId}/transcription`
  );
}

//
// NORMALIZER (your logic is good — just cleaned slightly)
//
export function normalizeGhlCall(raw) {
  const transcriptSource =
    raw.transcript ||
    raw.messages ||
    raw.transcription ||
    raw.segments ||
    [];

  let transcript = [];

  if (Array.isArray(transcriptSource)) {
    transcript = transcriptSource.map((seg, i) => ({
      role: mapRole(seg.role || seg.speaker || seg.type || seg.channel),
      text: seg.text || seg.content || seg.message || seg.transcript || '',
      timestamp: seg.timestamp ?? seg.startTime ?? seg.start ?? i * 2,
    }));
  } else if (typeof transcriptSource === 'string' && transcriptSource.trim()) {
    transcript = parsePlainTranscript(transcriptSource);
  }

  if (!transcript.length && raw.fullTranscript) {
    transcript = parsePlainTranscript(raw.fullTranscript);
  }

  return {
    ghlCallId: raw.id || raw.callId || raw.messageId,
    agentId: raw.agentId || raw.voiceAiAgentId,
    locationId: raw.locationId || raw.location_id,
    contactName:
      raw.contactName ||
      raw.contact_name ||
      raw.contact?.name ||
      raw.contact?.fullName ||
      'Unknown',

    durationSeconds:
      raw.duration ||
      raw.durationSeconds ||
      raw.callDuration ||
      0,

    transcript: transcript.length
      ? transcript.filter((s) => s.text)
      : [
          {
            role: 'agent',
            text: raw.summary || '(transcript pending)',
            timestamp: 0,
          },
        ],

    summary: raw.summary || raw.callSummary || raw.aiSummary || '',
    outcome: raw.status || raw.outcome || raw.callStatus || 'completed',
  };
}

//
// ROLE MAPPER
//
function mapRole(role) {
  if (!role) return 'agent';
  const r = String(role).toLowerCase();

  if (/caller|user|customer|contact|inbound|human/.test(r)) {
    return 'caller';
  }

  return 'agent';
}