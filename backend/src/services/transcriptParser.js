/**
 * Normalizes GHL Voice AI / workflow webhook payloads into structured transcript segments.
 * Supports: JSON arrays, workflow "full transcript" plain text, conversation message format.
 */

const SPEAKER_PATTERNS = [
  /^(agent|ai|assistant|bot)\s*:\s*(.+)$/i,
  /^(caller|user|customer|contact|human)\s*:\s*(.+)$/i,
];

export function parseTranscriptFromPayload(body) {
  if (body.transcript && Array.isArray(body.transcript)) {
    return normalizeSegments(body.transcript);
  }

  if (body.messages && Array.isArray(body.messages)) {
    return normalizeSegments(body.messages);
  }

  const fullText =
    body.full_transcript ||
    body.fullTranscript ||
    body['Full Transcript'] ||
    body.transcript_text ||
    body.transcriptText ||
    (typeof body.transcript === 'string' ? body.transcript : null);

  if (fullText) {
    return parsePlainTranscript(fullText);
  }

  return [];
}

export function parsePlainTranscript(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const segments = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of SPEAKER_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        const role = /agent|ai|assistant|bot/i.test(m[1]) ? 'agent' : 'caller';
        segments.push({ role, text: m[2].trim(), timestamp: segments.length * 2 });
        matched = true;
        break;
      }
    }
    if (!matched && segments.length) {
      segments[segments.length - 1].text += ' ' + line;
    } else if (!matched) {
      segments.push({ role: 'agent', text: line, timestamp: 0 });
    }
  }

  return segments;
}

function normalizeSegments(raw) {
  return raw.map((seg, i) => {
    const roleRaw = seg.role || seg.speaker || seg.type || seg.direction || '';
    let role = 'agent';
    if (/caller|user|customer|contact|inbound|human/i.test(String(roleRaw))) {
      role = 'caller';
    } else if (/agent|ai|assistant|bot|outbound/i.test(String(roleRaw))) {
      role = 'agent';
    }

    return {
      role,
      text: seg.text || seg.content || seg.message || seg.body || '',
      timestamp: seg.timestamp ?? seg.startTime ?? seg.time ?? i * 2,
    };
  }).filter((s) => s.text);
}

export function extractWebhookFields(body) {
  const custom = body.customData || body.custom_data || body.data || {};

  return {
    agentId:
      body.agentId ||
      body.voiceAiAgentId ||
      body.voice_ai_agent_id ||
      custom.agentId ||
      custom.voice_ai_agent_id,
    callId:
      body.callId ||
      body.call_id ||
      body.messageId ||
      body.message_id ||
      custom.call_id ||
      custom.message_id,
    locationId:
      body.locationId ||
      body.location_id ||
      custom.location_id ||
      body.location?.id,
    contactName:
      body.contactName ||
      body.contact_name ||
      body.contact?.name ||
      custom.contact_name ||
      custom.full_name ||
      'Unknown',
    durationSeconds:
      Number(body.durationSeconds || body.duration || body.call_duration || custom.call_duration || 0),
    summary:
      body.summary ||
      body.callSummary ||
      body.call_summary ||
      custom.call_summary ||
      custom.summary ||
      '',
    outcome: body.outcome || body.status || body.call_status || 'completed',
    agentName: body.agentName || body.agent_name || custom.agent_name,
  };
}
