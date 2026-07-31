const TIMEOUTS = Object.freeze({
  completed: 5_000,
  active: 90_000,
  attention: 5 * 60_000,
  failed: 5 * 60_000,
});

const SOURCE_LABELS = Object.freeze({
  'claude-code': 'Claude',
  codex: 'Codex',
  legacy: 'Claude',
});

function deriveDisplayState(session, now = Date.now()) {
  const updatedAt = Number(session.updatedAt || 0);
  const age = Math.max(0, now - updatedAt);
  let state = 'idle';

  if (session.attention === 'permission' && age <= TIMEOUTS.attention) {
    state = 'permission';
  } else if (session.attention === 'user_input' && age <= TIMEOUTS.attention) {
    state = 'waiting';
  } else if (session.phase === 'failed' && age <= TIMEOUTS.failed) {
    state = 'failed';
  } else if (session.phase === 'active' && age <= TIMEOUTS.active) {
    state = session.activity || 'thinking';
  } else if (session.phase === 'completed' && age <= TIMEOUTS.completed) {
    state = 'done';
  }

  return {
    state,
    detail: String(session.detail || ''),
    cwd: String(session.cwd || ''),
    source: String(session.source || ''),
    sourceLabel: SOURCE_LABELS[session.source] || session.source || '',
    sessionId: String(session.sessionId || ''),
    updatedAt,
  };
}

function displayPriority(display) {
  switch (display.state) {
    case 'permission':
      return 500;
    case 'waiting':
      return 450;
    case 'failed':
      return 400;
    case 'done':
      return 200;
    case 'idle':
      return 100;
    default:
      return 300;
  }
}

function listDisplayStates(sessions, now = Date.now()) {
  return sessions
    .filter(Boolean)
    .map((session) => deriveDisplayState(session, now))
    .sort((left, right) => {
      const priorityDifference = displayPriority(right) - displayPriority(left);
      return priorityDifference || right.updatedAt - left.updatedAt;
    });
}

function selectDisplayState(sessions, now = Date.now()) {
  return listDisplayStates(sessions, now)[0] || {
    state: 'idle',
    detail: '',
    cwd: '',
    source: '',
    sourceLabel: '',
    sessionId: '',
    updatedAt: 0,
  };
}

module.exports = {
  SOURCE_LABELS,
  TIMEOUTS,
  deriveDisplayState,
  displayPriority,
  listDisplayStates,
  selectDisplayState,
};
