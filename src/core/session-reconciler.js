const { reduceAgentEvent } = require('./state-reducer');
const { terminalEvent: codexTerminalEvent } = require('../observers/codex-transcript');

const OBSERVERS = Object.freeze({
  codex: codexTerminalEvent,
});

function reconcileSession(session) {
  const observer = OBSERVERS[session?.source];
  if (!observer) return session;

  const event = observer(session);
  return event ? reduceAgentEvent(session, event) : session;
}

function reconcileSessions(sessions) {
  return sessions.map(reconcileSession);
}

module.exports = {
  OBSERVERS,
  reconcileSession,
  reconcileSessions,
};
