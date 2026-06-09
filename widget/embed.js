/**
 * HighLevel Custom JS Widget Loader
 * Install via Marketplace App (Agency distribution) or paste in Custom Code block.
 *
 * Configuration: set window.VOICE_AI_COPILOT_URL to your deployed dashboard URL.
 */
(function () {
  'use strict';

  var COPILOT_URL = window.VOICE_AI_COPILOT_URL || 'http://localhost:5173';
  var CONTAINER_ID = 'voice-ai-observability-copilot';

  function injectStyles() {
    if (document.getElementById('vac-styles')) return;
    var style = document.createElement('style');
    style.id = 'vac-styles';
    style.textContent = [
      '#' + CONTAINER_ID + ' {',
      '  width: 100%;',
      '  min-height: 720px;',
      '  border: none;',
      '  border-radius: 12px;',
      '  overflow: hidden;',
      '  background: #0f1117;',
      '}',
      '.vac-wrapper {',
      '  margin: 16px 0;',
      '  border: 1px solid #2e3345;',
      '  border-radius: 12px;',
      '  overflow: hidden;',
      '}',
      '.vac-header {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  padding: 10px 16px;',
      '  background: #1a1d27;',
      '  border-bottom: 1px solid #2e3345;',
      '  font-family: Inter, system-ui, sans-serif;',
      '}',
      '.vac-header span {',
      '  font-size: 13px;',
      '  color: #8b92a8;',
      '}',
      '.vac-header strong {',
      '  color: #e8eaef;',
      '  font-size: 14px;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function mount() {
    var existing = document.getElementById(CONTAINER_ID);
    if (existing) return;

    injectStyles();

    var wrapper = document.createElement('div');
    wrapper.className = 'vac-wrapper';

    var header = document.createElement('div');
    header.className = 'vac-header';
    header.innerHTML = '<strong>Voice AI Observability Copilot</strong><span>Monitor · Analyze · Improve</span>';

    var iframe = document.createElement('iframe');
    iframe.id = CONTAINER_ID;
    iframe.src = COPILOT_URL + '?embedded=ghl';
    iframe.title = 'Voice AI Observability Copilot';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframe.setAttribute('loading', 'lazy');

    wrapper.appendChild(header);
    wrapper.appendChild(iframe);

    var target = document.querySelector('[data-vac-mount]') || document.body;
    target.appendChild(wrapper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
