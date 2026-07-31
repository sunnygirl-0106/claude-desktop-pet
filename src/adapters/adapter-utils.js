const { classifyTool, clip } = require('../core/tool-classifier');

function eventName(explicitName, payload = {}) {
  return String(explicitName || payload.hook_event_name || '').trim();
}

function toolFields(payload = {}) {
  const toolName = payload.tool_name || payload.toolName || payload.tool?.name || '';
  const toolInput = payload.tool_input || payload.toolInput || payload.tool?.input || {};
  return {
    toolName: String(toolName),
    toolInput: toolInput && typeof toolInput === 'object' ? toolInput : {},
  };
}

function toolClassification(payload = {}) {
  const { toolName, toolInput } = toolFields(payload);
  return {
    ...classifyTool(toolName, toolInput),
    toolName,
  };
}

function responseFailed(payload = {}) {
  const response = payload.tool_response || payload.toolResponse || payload.result || {};
  return Boolean(
    payload.error
    || payload.is_error
    || payload.success === false
    || response.error
    || response.is_error
    || response.success === false,
  );
}

function failureDetail(payload = {}) {
  const response = payload.tool_response || payload.toolResponse || payload.result || {};
  return clip(payload.error || response.error || response.message || '工具执行失败');
}

module.exports = {
  eventName,
  failureDetail,
  responseFailed,
  toolClassification,
  toolFields,
};
