const { selectDisplayState } = require('./state-arbitrator');
const { reconcileSessions } = require('./session-reconciler');
const { readLegacySession, readSessions } = require('./state-store');

function currentSessions() {
  const sessions = reconcileSessions(readSessions());
  const legacy = readLegacySession();
  if (legacy) sessions.push(legacy);
  return sessions;
}

function readCurrentDisplay(now = Date.now()) {
  return selectDisplayState(currentSessions(), now);
}

function formatDisplayDetail(display) {
  if (display.state === 'idle') return '';
  return String(display.detail || '');
}

module.exports = {
  formatDisplayDetail,
  readCurrentDisplay,
};
