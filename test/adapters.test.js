const assert = require('node:assert/strict');
const test = require('node:test');
const claude = require('../src/adapters/claude-code');
const codex = require('../src/adapters/codex');

test('Claude Code 旧参数继续映射到通用事件', () => {
  const event = claude.toAgentEvent('pre', {
    session_id: 'claude-1',
    tool_name: 'Edit',
    tool_input: { file_path: '/tmp/index.js' },
  });

  assert.equal(event.source, 'claude-code');
  assert.equal(event.type, 'tool.started');
  assert.equal(event.activity, 'editing');
  assert.equal(event.detail, 'index.js');
});

test('Codex Bash Hook 映射到测试状态', () => {
  const event = codex.toAgentEvent('PreToolUse', {
    session_id: 'codex-1',
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
  });

  assert.equal(event.source, 'codex');
  assert.equal(event.type, 'tool.started');
  assert.equal(event.activity, 'testing');
  assert.equal(event.detail, 'npm');
});

test('Codex PermissionRequest 保留工具活动', () => {
  const event = codex.toAgentEvent('PermissionRequest', {
    session_id: 'codex-1',
    tool_name: 'apply_patch',
    tool_input: {},
  });

  assert.equal(event.type, 'permission.requested');
  assert.equal(event.activity, 'editing');
});

test('工具错误被转换为 failed 事件标记', () => {
  const event = codex.toAgentEvent('PostToolUse', {
    session_id: 'codex-1',
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
    tool_response: { success: false, message: 'tests failed' },
  });

  assert.equal(event.type, 'tool.completed');
  assert.equal(event.failed, true);
  assert.equal(event.detail, 'tests failed');
});
