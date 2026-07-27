const EVENT_TYPES = Object.freeze({
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  TURN_PROMPTED: 'turn.prompted',
  TURN_COMPLETED: 'turn.completed',
  TURN_FAILED: 'turn.failed',
  TURN_INTERRUPTED: 'turn.interrupted',
  TOOL_STARTED: 'tool.started',
  TOOL_COMPLETED: 'tool.completed',
  PERMISSION_REQUESTED: 'permission.requested',
  USER_INPUT_REQUESTED: 'user-input.requested',
  SUBAGENT_STARTED: 'subagent.started',
  SUBAGENT_STOPPED: 'subagent.stopped',
});

function fallbackSessionId(payload = {}) {
  return payload.session_id
    || payload.sessionId
    || payload.conversation_id
    || payload.transcript_path
    || payload.cwd
    || process.cwd();
}

function createAgentEvent({
  source,
  type,
  payload = {},
  activity = null,
  detail = '',
  toolName = '',
  failed = false,
  timestamp = Date.now(),
}) {
  if (!source) throw new Error('Agent event source is required');
  if (!Object.values(EVENT_TYPES).includes(type)) {
    throw new Error(`Unsupported agent event type: ${type}`);
  }

  return {
    version: 1,
    source,
    sessionId: String(fallbackSessionId(payload)),
    cwd: String(payload.cwd || ''),
    transcriptPath: String(payload.transcript_path || payload.transcriptPath || ''),
    turnId: String(payload.turn_id || payload.turnId || ''),
    type,
    activity,
    detail: String(detail || ''),
    toolName: String(toolName || ''),
    failed: Boolean(failed),
    timestamp,
  };
}

module.exports = {
  EVENT_TYPES,
  createAgentEvent,
};
