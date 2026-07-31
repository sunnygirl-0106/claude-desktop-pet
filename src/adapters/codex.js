const { EVENT_TYPES, createAgentEvent } = require('../core/agent-event');
const { clip } = require('../core/tool-classifier');
const {
  eventName,
  failureDetail,
  responseFailed,
  toolClassification,
} = require('./adapter-utils');

function toAgentEvent(explicitName, payload = {}) {
  const name = eventName(explicitName, payload);
  const base = { source: 'codex', payload };

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
    case 'PermissionRequest': {
      const classification = toolClassification(payload);
      return createAgentEvent({
        ...base,
        type: EVENT_TYPES.PERMISSION_REQUESTED,
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
  toAgentEvent,
};
