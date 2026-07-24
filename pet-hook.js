#!/usr/bin/env node
// Claude Code hook → 把「我正在干嘛」写进状态文件，桌宠会读它。
// 用法（在 settings.json 的 hooks 里）：
//   node <这个文件路径> <event>
// event ∈ { pre, post, prompt, stop, notify }

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATUS_FILE = path.join(os.homedir(), '.claude', 'pet-status.json');
const event = process.argv[2] || 'pre';

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(raw || '{}'); } catch { /* ignore */ }
  const status = mapEvent(event, data);
  status.ts = Date.now();
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
  } catch { /* 状态文件写不了就算了，别拖累主流程 */ }
  process.exit(0);
});
// stdin 没数据时也别卡住
process.stdin.on('error', () => process.exit(0));
setTimeout(() => process.exit(0), 800);

function base(p) {
  if (!p || typeof p !== 'string') return '';
  return p.split('/').pop();
}

function clip(s, n = 14) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// 命令只取第一个词（程序名），避免长命令溢出
function firstWord(cmd) {
  if (!cmd) return '';
  const w = String(cmd).trim().split(/\s+/)[0] || '';
  return w.split('/').pop(); // 去掉路径前缀
}

// 取 URL 的域名
function hostOf(u) {
  if (!u) return '';
  const m = String(u).match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, '') : String(u);
}

// 把五花八门的 Bash 命令细分成不同状态
function classifyBash(cmd) {
  const c = String(cmd || '').toLowerCase();
  const w = firstWord(cmd);

  if (/^\s*git\b/.test(c)) {
    const m = c.match(/\b(commit|push|merge|rebase|tag)\b/);
    if (m) return { state: 'committing', detail: 'git ' + m[1] };
    const g = c.match(/\b(status|diff|log|show|branch)\b/);
    if (g) return { state: 'gitlook', detail: 'git ' + g[1] };
    return { state: 'running', detail: 'git' };
  }
  // 装依赖：包管理器 + install/add/ci
  if (/^(npm|pnpm|yarn|bun|pip3?|brew|cargo|gem|apt|go|poetry)\b/.test(c.trim())
      && /\b(install|add|ci)\b/.test(c)) {
    return { state: 'installing', detail: w };
  }
  if (/\b(test|jest|pytest|vitest|mocha|rspec)\b/.test(c)) {
    return { state: 'testing', detail: w };
  }
  if (/\b(build|compile|make|webpack|vite|tsc|rollup|bundle)\b/.test(c)) {
    return { state: 'building', detail: w };
  }
  return { state: 'running', detail: w };
}

function mapEvent(ev, data) {
  if (ev === 'prompt') return { state: 'thinking', detail: '' };
  if (ev === 'stop')   return { state: 'done', detail: '' };
  if (ev === 'notify') return { state: 'waiting', detail: clip(data.message || '') };

  if (ev === 'post')   return { state: 'thinking', detail: '' };

  // ev === 'pre'：根据工具名映射
  const tool = data.tool_name || '';
  const inp = data.tool_input || {};

  switch (tool) {
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return { state: 'editing', detail: clip(base(inp.file_path || inp.notebook_path)) };
    case 'Write':
      return { state: 'writing', detail: clip(base(inp.file_path)) };
    case 'Read':
      return { state: 'reading', detail: clip(base(inp.file_path)) };
    case 'Bash':
      return classifyBash(inp.command);
    case 'Grep':
    case 'Glob':
      return { state: 'searching', detail: clip(inp.pattern || '') };
    case 'WebSearch':
      return { state: 'websearch', detail: clip(inp.query || '') };
    case 'WebFetch':
      return { state: 'fetching', detail: clip(hostOf(inp.url)) };
    case 'Task':
    case 'Agent':
      return { state: 'delegating', detail: clip(inp.description || '') };
    case 'ExitPlanMode':
    case 'EnterPlanMode':
      return { state: 'planning', detail: '' };
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
      return { state: 'organizing', detail: '' };
    default:
      // MCP 工具：设计类单独识别，其余当跑命令
      if (tool.startsWith('mcp__')) {
        const low = tool.toLowerCase();
        if (/figma|pencil|design|sketch/.test(low)) {
          return { state: 'designing', detail: clip(tool.split('__').pop()) };
        }
        return { state: 'running', detail: clip(tool.replace(/^mcp__/, '').split('__')[0]) };
      }
      return { state: 'thinking', detail: clip(tool) };
  }
}
