const path = require('path');

function clip(value, length = 18) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function basename(value) {
  if (!value || typeof value !== 'string') return '';
  return path.basename(value);
}

function hostOf(value) {
  if (!value) return '';
  try {
    return new URL(String(value)).hostname.replace(/^www\./, '');
  } catch {
    return clip(value);
  }
}

function commandText(input = {}) {
  const command = input.command ?? input.cmd ?? input.script ?? '';
  return Array.isArray(command) ? command.join(' ') : String(command || '');
}

function firstCommandWord(command) {
  const first = String(command || '').trim().split(/\s+/)[0] || '';
  return path.basename(first);
}

function classifyCommand(command) {
  const original = String(command || '');
  const normalized = original.toLowerCase().trim();
  const program = firstCommandWord(original);

  if (/^git\b/.test(normalized)) {
    const writeAction = normalized.match(/\b(commit|push|merge|rebase|tag)\b/);
    if (writeAction) {
      return { activity: 'committing', detail: `git ${writeAction[1]}` };
    }

    const readAction = normalized.match(/\b(status|diff|log|show|branch)\b/);
    if (readAction) {
      return { activity: 'gitlook', detail: `git ${readAction[1]}` };
    }

    return { activity: 'running', detail: 'git' };
  }

  const packageManager = /^(npm|pnpm|yarn|bun|pip3?|brew|cargo|gem|apt|go|poetry)\b/;
  if (packageManager.test(normalized) && /\b(install|add|ci)\b/.test(normalized)) {
    return { activity: 'installing', detail: clip(program) };
  }
  if (/\b(test|jest|pytest|vitest|mocha|rspec)\b/.test(normalized)) {
    return { activity: 'testing', detail: clip(program) };
  }
  if (/\b(build|compile|make|webpack|vite|tsc|rollup|bundle)\b/.test(normalized)) {
    return { activity: 'building', detail: clip(program) };
  }

  return { activity: 'running', detail: clip(program) };
}

function classifyMcpTool(toolName) {
  const normalized = toolName.toLowerCase();
  const parts = toolName.replace(/^mcp__/, '').split('__');
  const server = parts[0] || 'MCP';
  const operation = parts.at(-1) || server;

  if (/figma|pencil|design|sketch|imagegen|creative/.test(normalized)) {
    return { activity: 'designing', detail: clip(operation) };
  }
  if (/search|find|query/.test(normalized)) {
    return { activity: 'searching', detail: clip(operation) };
  }
  if (/read|fetch|get|open/.test(normalized)) {
    return { activity: 'fetching', detail: clip(operation) };
  }

  return { activity: 'running', detail: clip(server) };
}

function classifyTool(toolName, input = {}) {
  const tool = String(toolName || '').replace(/^functions\./, '');
  const normalized = tool.toLowerCase();

  if (normalized === 'bash' || normalized === 'exec_command' || normalized === 'shell') {
    return classifyCommand(commandText(input));
  }

  if (['edit', 'multiedit', 'notebookedit', 'apply_patch'].includes(normalized)) {
    return {
      activity: 'editing',
      detail: clip(basename(input.file_path || input.notebook_path) || '补丁'),
    };
  }

  if (normalized === 'write') {
    return { activity: 'writing', detail: clip(basename(input.file_path)) };
  }

  if (['read', 'view_image', 'read_mcp_resource'].includes(normalized)) {
    return {
      activity: 'reading',
      detail: clip(basename(input.file_path || input.path || input.uri)),
    };
  }

  if (['grep', 'glob', 'find', 'tool_search'].includes(normalized)) {
    return { activity: 'searching', detail: clip(input.pattern || input.query) };
  }

  if (['websearch', 'web_search'].includes(normalized)) {
    return { activity: 'websearch', detail: clip(input.query) };
  }

  if (['webfetch', 'web_fetch'].includes(normalized)) {
    return { activity: 'fetching', detail: clip(hostOf(input.url)) };
  }

  if (normalized === 'web.run' || normalized === 'web__run') {
    const firstOpen = Array.isArray(input.open) ? input.open[0] : null;
    const firstSearch = Array.isArray(input.search_query) ? input.search_query[0] : null;
    if (firstSearch) {
      return { activity: 'websearch', detail: clip(firstSearch.q) };
    }
    return { activity: 'fetching', detail: clip(hostOf(firstOpen?.ref_id)) };
  }

  if (['task', 'agent', 'spawn_agent', 'send_message', 'followup_task'].includes(normalized)) {
    return {
      activity: 'delegating',
      detail: clip(input.description || input.message || input.task_name),
    };
  }

  if (['enterplanmode', 'exitplanmode'].includes(normalized)) {
    return { activity: 'planning', detail: '' };
  }

  if (
    ['todowrite', 'taskcreate', 'taskupdate', 'tasklist', 'update_plan'].includes(normalized)
  ) {
    return { activity: 'organizing', detail: '' };
  }

  if (['imagegen', 'image_gen', 'image_generation'].includes(normalized)) {
    return { activity: 'designing', detail: '' };
  }

  if (normalized === 'request_user_input') {
    return { activity: 'thinking', detail: '等待选择' };
  }

  if (normalized.startsWith('mcp__')) {
    return classifyMcpTool(tool);
  }

  return { activity: 'thinking', detail: clip(tool) };
}

module.exports = {
  basename,
  classifyCommand,
  classifyTool,
  clip,
  commandText,
  hostOf,
};
