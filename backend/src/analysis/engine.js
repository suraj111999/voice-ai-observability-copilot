const NEGATIVE_PHRASES = [
  'not interested', 'stop calling', 'remove me', 'frustrated', 'angry',
  'doesn\'t work', 'waste of time', 'speak to a human', 'real person',
];

const OBJECTION_PHRASES = [
  'too expensive', 'can\'t afford', 'not sure', 'think about it',
  'call back later', 'already have', 'competitor',
];

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

function fullTranscriptText(transcript) {
  return transcript.map((s) => s.text).join(' ').toLowerCase();
}

function agentText(transcript) {
  return transcript
    .filter((s) => s.role === 'agent')
    .map((s) => s.text)
    .join(' ')
    .toLowerCase();
}

function scoreKeywordKpi(transcript, kpi) {
  const keywords = JSON.parse(kpi.keywords || '[]');
  const text = kpi.id === 'greeting' ? agentText(transcript).slice(0, 200) : fullTranscriptText(transcript);
  const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()));
  const ratio = keywords.length ? matched.length / keywords.length : 1;
  const passed = ratio >= 0.5;
  const score = Math.round(ratio * 100);
  return {
    score,
    passed,
    evidence: matched.length
      ? `Matched keywords: ${matched.join(', ')}`
      : `Missing expected phrases: ${keywords.join(', ')}`,
  };
}

function scoreGreeting(transcript) {
  const firstAgent = transcript.find((s) => s.role === 'agent');
  if (!firstAgent) {
    return { score: 0, passed: false, evidence: 'No agent greeting found' };
  }
  const text = normalizeText(firstAgent.text);
  const hasGreeting = /hello|hi |good (morning|afternoon|evening)|thank you for calling/.test(text);
  const hasIntro = /my name|this is|calling from|with /.test(text);
  const score = (hasGreeting ? 50 : 0) + (hasIntro ? 50 : 0);
  return {
    score,
    passed: score >= 80,
    evidence: firstAgent.text.slice(0, 120),
  };
}

function scoreQualification(transcript) {
  const text = fullTranscriptText(transcript);
  const signals = ['budget', 'timeline', 'need', 'looking for', 'help with', 'currently'];
  const found = signals.filter((s) => text.includes(s));
  const ratio = found.length / signals.length;
  return {
    score: Math.round(ratio * 100),
    passed: found.length >= 2,
    evidence: found.length ? `Qualification signals: ${found.join(', ')}` : 'No qualification questions detected',
  };
}

function scoreObjectionHandling(transcript) {
  const callerText = transcript.filter((s) => s.role === 'caller').map((s) => s.text.toLowerCase()).join(' ');
  const agentSegments = transcript.filter((s) => s.role === 'agent');
  const objections = OBJECTION_PHRASES.filter((p) => callerText.includes(p));

  if (!objections.length) {
    return { score: 100, passed: true, evidence: 'No objections raised' };
  }

  let handled = 0;
  for (let i = 0; i < transcript.length; i++) {
    const seg = transcript[i];
    if (seg.role !== 'caller') continue;
    const hasObjection = OBJECTION_PHRASES.some((p) => seg.text.toLowerCase().includes(p));
    if (!hasObjection) continue;
    const nextAgent = transcript.slice(i + 1).find((s) => s.role === 'agent');
    if (nextAgent && /understand|appreciate|however|option|value|help|offer|flexible/.test(nextAgent.text.toLowerCase())) {
      handled++;
    }
  }

  const score = Math.round((handled / objections.length) * 100);
  return {
    score,
    passed: score >= 60,
    evidence: `${handled}/${objections.length} objections addressed. Raised: ${objections.join(', ')}`,
  };
}

function scoreCta(transcript) {
  const text = agentText(transcript);
  const ctaPatterns = [
    'schedule', 'book', 'appointment', 'next step', 'sign up', 'get started',
    'send you', 'email', 'follow up', 'call you back',
  ];
  const found = ctaPatterns.filter((p) => text.includes(p));
  const score = Math.min(100, found.length * 35);
  return {
    score,
    passed: found.length >= 1,
    evidence: found.length ? `CTA phrases: ${found.join(', ')}` : 'No clear call-to-action detected',
  };
}

function scoreCompliance(transcript) {
  const text = agentText(transcript);
  const violations = [];
  if (/guarantee|100%|promise you will/.test(text)) violations.push('Unsubstantiated guarantee language');
  if (/don\'t need permission|no risk at all/.test(text)) violations.push('Potentially misleading claims');
  const score = violations.length ? Math.max(0, 100 - violations.length * 40) : 100;
  return {
    score,
    passed: violations.length === 0,
    evidence: violations.length ? violations.join('; ') : 'No compliance flags',
  };
}

const SCORERS = {
  greeting: scoreGreeting,
  qualification: scoreQualification,
  objection_handling: scoreObjectionHandling,
  cta: scoreCta,
  compliance: scoreCompliance,
};

function scoreKpi(transcript, kpi) {
  const scorer = SCORERS[kpi.id];
  if (scorer) return scorer(transcript);
  return scoreKeywordKpi(transcript, kpi);
}

export function analyzeCall(transcript, kpis) {
  const kpiScores = {};
  let weightedSum = 0;
  let totalWeight = 0;
  const deviations = [];

  for (const kpi of kpis) {
    const result = scoreKpi(transcript, kpi);
    kpiScores[kpi.id] = {
      name: kpi.name,
      score: result.score,
      passed: result.passed,
      evidence: result.evidence,
      required: !!kpi.required,
      weight: kpi.weight,
    };

    weightedSum += result.score * kpi.weight;
    totalWeight += kpi.weight;

    if (!result.passed) {
      deviations.push({
        kpiId: kpi.id,
        kpiName: kpi.name,
        severity: kpi.required ? 'high' : 'medium',
        message: result.evidence,
      });
    }
  }

  const overallScore = totalWeight ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  const callerText = transcript.filter((s) => s.role === 'caller').map((s) => s.text.toLowerCase()).join(' ');
  for (const phrase of NEGATIVE_PHRASES) {
    if (callerText.includes(phrase)) {
      deviations.push({
        kpiId: 'sentiment',
        kpiName: 'Caller Sentiment',
        severity: 'critical',
        message: `Negative caller signal detected: "${phrase}"`,
      });
    }
  }

  return { overallScore, kpiScores, deviations };
}

export function extractUseActions(transcript, kpiScores, deviations) {
  const actions = [];

  for (const dev of deviations) {
    if (dev.kpiId === 'sentiment') {
      const idx = transcript.findIndex(
        (s) => s.role === 'caller' && NEGATIVE_PHRASES.some((p) => s.text.toLowerCase().includes(p)),
      );
      if (idx >= 0) {
        actions.push({
          segmentIndex: idx,
          segmentText: transcript[idx].text,
          reason: 'escalation',
          severity: 'critical',
          suggestion: 'Route to human agent or supervisor callback within 1 hour.',
        });
      }
    }
  }

  for (const [kpiId, score] of Object.entries(kpiScores)) {
    if (score.passed || !score.required) continue;
    const idx = findRelevantSegment(transcript, kpiId);
    actions.push({
      segmentIndex: idx,
      segmentText: transcript[idx]?.text || '(entire call)',
      reason: 'missed_kpi',
      severity: score.score < 40 ? 'high' : 'medium',
      suggestion: getKpiSuggestion(kpiId),
    });
  }

  const confusionIdx = transcript.findIndex(
    (s) => s.role === 'caller' && /what do you mean|confused|don\'t understand|repeat/.test(s.text.toLowerCase()),
  );
  if (confusionIdx >= 0) {
    actions.push({
      segmentIndex: confusionIdx,
      segmentText: transcript[confusionIdx].text,
      reason: 'confusion',
      severity: 'high',
      suggestion: 'Add script training for clearer explanations at this conversation stage.',
    });
  }

  return dedupeActions(actions);
}

function findRelevantSegment(transcript, kpiId) {
  if (kpiId === 'greeting') return transcript.findIndex((s) => s.role === 'agent') || 0;
  if (kpiId === 'cta') {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === 'agent') return i;
    }
  }
  return Math.floor(transcript.length / 2);
}

function getKpiSuggestion(kpiId) {
  const map = {
    greeting: 'Update opening script to include company name and agent introduction within 10 seconds.',
    qualification: 'Add BANT-style discovery questions before presenting solutions.',
    objection_handling: 'Train agent on acknowledge-empathize-respond pattern for pricing objections.',
    cta: 'Add explicit booking language: "Would Tuesday at 2pm work for a quick demo?"',
    compliance: 'Review script for guarantee language; replace with approved disclaimers.',
  };
  return map[kpiId] || 'Review script segment and add training example for this scenario.';
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter((a) => {
    const key = `${a.segmentIndex}-${a.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateRecommendations(agentId, agentName, recentAnalyses, useActions) {
  const recs = [];
  const kpiFailures = {};

  for (const analysis of recentAnalyses) {
    for (const dev of analysis.deviations || []) {
      kpiFailures[dev.kpiId] = (kpiFailures[dev.kpiId] || 0) + 1;
    }
  }

  const sorted = Object.entries(kpiFailures).sort((a, b) => b[1] - a[1]);

  for (const [kpiId, count] of sorted.slice(0, 3)) {
    const template = RECOMMENDATION_TEMPLATES[kpiId];
    if (!template) continue;
    recs.push({
      agentId,
      priority: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
      category: template.category,
      title: template.title.replace('{agent}', agentName),
      description: `${count} recent call(s) failed this KPI. ${template.description}`,
      suggestedPromptChange: template.suggestedPromptChange,
      callIds: recentAnalyses.slice(0, 3).map((a) => a.callId),
    });
  }

  const escalations = useActions.filter((a) => a.reason === 'escalation');
  if (escalations.length >= 2) {
    recs.push({
      agentId,
      priority: 'high',
      category: 'config',
      title: `Enable human handoff for ${agentName}`,
      description: `${escalations.length} calls triggered escalation signals. Consider adding a transfer action.`,
      suggestedPromptChange: 'Add instruction: "If caller expresses frustration or requests a human, offer immediate transfer using the transfer_call action."',
      callIds: [],
    });
  }

  return recs;
}

const RECOMMENDATION_TEMPLATES = {
  greeting: {
    category: 'script',
    title: 'Strengthen opening script for {agent}',
    description: 'Callers are not receiving a consistent branded greeting.',
    suggestedPromptChange: 'OPENING: "Thank you for calling [Company]. This is [Agent Name], your AI assistant. How can I help you today?"',
  },
  qualification: {
    category: 'prompt',
    title: 'Add discovery questions to {agent}',
    description: 'Agents are presenting solutions before understanding caller needs.',
    suggestedPromptChange: 'Before discussing pricing, ask: 1) What problem are you solving? 2) What timeline are you working with? 3) Have you tried other solutions?',
  },
  objection_handling: {
    category: 'training',
    title: 'Improve objection handling for {agent}',
    description: 'Pricing and timing objections are not being addressed effectively.',
    suggestedPromptChange: 'When caller mentions cost: "I understand budget is important. Many clients see ROI within 90 days. Would it help if I walked you through our flexible plans?"',
  },
  cta: {
    category: 'script',
    title: 'Add explicit CTA to {agent} closing',
    description: 'Calls end without a clear next step.',
    suggestedPromptChange: 'CLOSING: "Based on what you shared, I recommend scheduling a 15-minute demo. I have openings tomorrow at 10am or 2pm — which works better?"',
  },
  compliance: {
    category: 'config',
    title: 'Review compliance language for {agent}',
    description: 'Script may contain unapproved guarantee statements.',
    suggestedPromptChange: 'Replace absolute guarantees with: "Results vary based on implementation. I can share case studies showing typical outcomes."',
  },
  sentiment: {
    category: 'config',
    title: 'Reduce negative sentiment on {agent}',
    description: 'Multiple callers expressed frustration during calls.',
    suggestedPromptChange: 'Add de-escalation: "I hear your frustration and want to make this right. Let me connect you with a specialist who can help immediately."',
  },
};
