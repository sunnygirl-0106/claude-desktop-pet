const { EVENT_TYPES } = require('./agent-event');

const MAX_RECENT_EVENTS = 12;

function initialState(event) {
  return {
    version: 1,
    source: event.source,
    sessionId: event.sessionId,
    cwd: event.cwd,
    transcriptPath: event.transcriptPath,
    turnId: event.turnId,
    phase: 'idle',
    activity: null,
    attention: 'none',
    detail: '',
    toolName: '',
    updatedAt: event.timestamp,
    lastEvent: event.type,
    recentEvents: [],
  };
}

function appendRecentEvent(state, event) {
  const recentEvents = [
    ...(Array.isArray(state.recentEvents) ? state.recentEvents : []),
    {
      type: event.type,
      activity: event.activity,
      detail: event.detail,
      turnId: event.turnId,
      at: event.timestamp,
    },
  ].slice(-MAX_RECENT_EVENTS);

  return { ...state, recentEvents };
}

function reduceAgentEvent(previous, event) {
  let next = {
    ...(previous || initialState(event)),
    version: 1,
    source: event.source,
    sessionId: event.sessionId,
    cwd: event.cwd || previous?.cwd || '',
    transcriptPath: event.transcriptPath || previous?.transcriptPath || '',
    turnId: event.turnId || previous?.turnId || '',
    updatedAt: event.timestamp,
    lastEvent: event.type,
  };

  switch (event.type) {
    case EVENT_TYPES.SESSION_STARTED:
      next = {
        ...next,
        phase: 'idle',
        activity: null,
        attention: 'none',
        detail: '',
        toolName: '',
        turnId: '',
      };
      break;

    case EVENT_TYPES.TURN_PROMPTED:
      next = {
        ...next,
        phase: 'active',
        activity: 'thinking',
        attention: 'none',
        detail: event.detail,
        toolName: '',
      };
      break;

    case EVENT_TYPES.TOOL_STARTED:
      next = {
        ...next,
        phase: 'active',
        activity: event.activity || 'thinking',
        attention: 'none',
        detail: event.detail,
        toolName: event.toolName,
      };
      break;

    case EVENT_TYPES.PERMISSION_REQUESTED:
      next = {
        ...next,
        phase: 'active',
        activity: event.activity || next.activity || 'thinking',
        attention: 'permission',
        detail: event.detail,
        toolName: event.toolName,
      };
      break;

    case EVENT_TYPES.USER_INPUT_REQUESTED:
      next = {
        ...next,
        phase: 'active',
        activity: next.activity || 'thinking',
        attention: 'user_input',
        detail: event.detail,
      };
      break;

    case EVENT_TYPES.TOOL_COMPLETED:
      next = event.failed
        ? {
            ...next,
            phase: 'failed',
            attention: 'none',
            detail: event.detail || next.detail,
            toolName: event.toolName || next.toolName,
          }
        : {
            ...next,
            phase: 'active',
            activity: 'thinking',
            attention: 'none',
            detail: '',
            toolName: '',
          };
      break;

    case EVENT_TYPES.SUBAGENT_STARTED:
      next = {
        ...next,
        phase: 'active',
        activity: 'delegating',
        attention: 'none',
        detail: event.detail,
        toolName: event.toolName,
      };
      break;

    case EVENT_TYPES.SUBAGENT_STOPPED:
      next = {
        ...next,
        phase: event.failed ? 'failed' : 'active',
        activity: event.failed ? next.activity : 'thinking',
        attention: 'none',
        detail: event.detail,
        toolName: '',
      };
      break;

    case EVENT_TYPES.TURN_COMPLETED:
      next = {
        ...next,
        phase: 'completed',
        activity: null,
        attention: 'none',
        detail: event.detail,
        toolName: '',
      };
      break;

    case EVENT_TYPES.TURN_FAILED:
      next = {
        ...next,
        phase: 'failed',
        attention: 'none',
        detail: event.detail,
        toolName: '',
      };
      break;

    case EVENT_TYPES.TURN_INTERRUPTED:
      next = {
        ...next,
        phase: 'idle',
        activity: null,
        attention: 'none',
        detail: '',
        toolName: '',
      };
      break;

    case EVENT_TYPES.SESSION_ENDED:
      next = {
        ...next,
        phase: ['completed', 'failed'].includes(next.phase) ? next.phase : 'idle',
        activity: null,
        attention: 'none',
        toolName: '',
      };
      break;

    default:
      break;
  }

  return appendRecentEvent(next, event);
}

module.exports = {
  MAX_RECENT_EVENTS,
  reduceAgentEvent,
};
