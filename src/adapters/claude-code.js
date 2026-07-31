const { EVENT_TYPES, createAgentEvent } = require('../core/agent-event');
const { clip } = require('../core/tool-classifier');
const {
  eventName,
  failureDetail,
  responseFailed,
  toolClassification,
} = require('./adapter-utils');

const EVENT_ALIASES = Object.freeze({
  pre: 'PreToolUse',
  post: 'PostToolUse',
  prompt: 'UserPromptSubmit',
  stop: 'Stop',
  notify: 'Notification',
});

function toAgentEvent(explicitName, payload = {}) {
  const name = EVENT_ALIASES[eventName(explicitName, payload)]
    || eventName(explicitName, payload);
  const base = { source: 'claude-code', payload };

  switch (name) {
    case 'SessionStart':
      return createAgentEvent({ ...base, type: EVENT_TYPES.SESSION_STARTED });
    case 'SessionEnd':
      return createAgentEvent({ ...base, type: EVENT_TYPES.SESSION_ENDED });
    case 'UserPromptSubmit':
      return createAgentEvent({ ...base, type: EVENT_TYPES.TURN_PROMPTED });
    case 'PreToolUse': {
      const classification = toolClassification(payload);
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.TOOL_STARTED,
        ...classification,
      });
    }
    case 'PostToolUse': {
      const classification = toolClassification(payload);
      const failed = responseFailed(payload);
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.TOOL_COMPLETED,
        ...classification,
        failed,
        detail: failed ? failureDetail(payload) : '',
      });
    }
    case 'Notification': {
      const message = String(payload.message || '');
      if (/permission|approve|allow|允许|授权/i.test(message)) {
        const match = message.match(/use\s+([A-Za-z_]+)/i);
        return createAgentEvent({
          ...base,
          type: EVENT_TYPES.PERMISSION_REQUESTED,
          activity: 'thinking',
          detail: clip(match?.[1] || message),
        });
      }
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.USER_INPUT_REQUESTED,
        detail: clip(message),
      });
    }
    case 'SubagentStart':
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.SUBAGENT_STARTED,
        activity: 'delegating',
        detail: clip(payload.agent_type || payload.subagent_type || payload.description),
      });
    case 'SubagentStop':
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.SUBAGENT_STOPPED,
        failed: responseFailed(payload),
        detail: responseFailed(payload) ? failureDetail(payload) : '',
      });
    case 'Stop':
      return createAgentEvent({ ...base, type: EVENT_TYPES.TURN_COMPLETED });
    default:
      return null;
  }
}

module.exports = {
  EVENT_ALIASES,
  toAgentEvent,
};
