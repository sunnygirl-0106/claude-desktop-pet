const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function stateRoot() {
  return process.env.AGENT_PET_STATE_DIR
    ? path.resolve(process.env.AGENT_PET_STATE_DIR)
    : path.join(os.homedir(), '.agent-pet');
}

function sessionsDirectory() {
  return path.join(stateRoot(), 'sessions');
}

function sessionFilename(source, sessionId) {
  const readable = `${source}-${sessionId}`
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'session';
  const digest = crypto
    .createHash('sha256')
    .update(`${source}\0${sessionId}`)
    .digest('hex')
    .slice(0, 10);
  return `${readable}-${digest}.json`;
}

function sessionPath(source, sessionId) {
  return path.join(sessionsDirectory(), sessionFilename(source, sessionId));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readSession(source, sessionId) {
  return readJson(sessionPath(source, sessionId));
}

function writeSession(state) {
  const directory = sessionsDirectory();
  fs.mkdirSync(directory, { recursive: true });

  const target = sessionPath(state.source, state.sessionId);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
  return target;
}

function readSessions() {
  let names = [];
  try {
    names = fs.readdirSync(sessionsDirectory());
  } catch {
    return [];
  }

  return names
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(sessionsDirectory(), name)))
    .filter((state) => state && state.version === 1);
}

function legacyStatusPath() {
  return process.env.AGENT_PET_LEGACY_STATUS_FILE
    || path.join(os.homedir(), '.claude', 'pet-status.json');
}

function readLegacySession() {
  const status = readJson(legacyStatusPath());
  if (!status || !status.ts) return null;

  const state = String(status.state || 'idle');
  const session = {
    version: 1,
    source: 'legacy',
    sessionId: 'legacy-claude-code',
    cwd: '',
    phase: 'active',
    activity: state,
    attention: 'none',
    detail: String(status.detail || ''),
    toolName: '',
    updatedAt: Number(status.ts || 0),
    lastEvent: 'legacy.status',
    recentEvents: [],
  };

  if (state === 'idle' || state === 'sleeping') {
    session.phase = 'idle';
    session.activity = null;
  } else if (state === 'permission') {
    session.attention = 'permission';
    session.activity = 'thinking';
  } else if (state === 'waiting') {
    session.attention = 'user_input';
    session.activity = 'thinking';
  } else if (state === 'done') {
    session.phase = 'completed';
    session.activity = null;
  } else if (state === 'failed') {
    session.phase = 'failed';
    session.activity = null;
  }

  return session;
}

module.exports = {
  legacyStatusPath,
  readLegacySession,
  readSession,
  readSessions,
  sessionFilename,
  sessionPath,
  sessionsDirectory,
  stateRoot,
  writeSession,
};
