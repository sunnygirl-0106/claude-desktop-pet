const fs = require('fs');
const path = require('path');
const { reduceAgentEvent } = require('./core/state-reducer');
const { readSession, writeSession } = require('./core/state-store');

const ADAPTERS = Object.freeze({
  'claude-code': './adapters/claude-code',
  codex: './adapters/codex',
});

function parsePayload(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function adapterFor(source) {
  const adapterPath = ADAPTERS[source];
  if (!adapterPath) throw new Error(`Unsupported agent source: ${source}`);
  return require(path.join(__dirname, adapterPath));
}

function handleHook(source, eventName, payload) {
  const event = adapterFor(source).toAgentEvent(eventName, payload);
  if (!event) return null;

  const previous = readSession(event.source, event.sessionId);
  const next = reduceAgentEvent(previous, event);
  const outputPath = writeSession(next);
  return { event, state: next, outputPath };
}

function runCli(source, explicitEventName) {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    const payload = parsePayload(raw);
    handleHook(source, explicitEventName || payload.hook_event_name, payload);
  } catch (error) {
    if (process.env.AGENT_PET_DEBUG === '1') {
      process.stderr.write(`[agent-pet] ${error.stack || error.message}\n`);
    }
  }
}

module.exports = {
  ADAPTERS,
  adapterFor,
  handleHook,
  parsePayload,
  runCli,
};
