const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { readSessions } = require('../src/core/state-store');

function temporaryStateDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-pet-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function invokeHook(script, event, payload, stateDirectory) {
  return spawnSync(process.execPath, [script, event], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENT_PET_STATE_DIR: stateDirectory,
    },
    input: JSON.stringify(payload),
  });
}

test('pet-hook.js 的旧 Claude Code 调用方式真实可运行', (t) => {
  const stateDirectory = temporaryStateDirectory(t);
  const result = invokeHook('pet-hook.js', 'pre', {
    session_id: 'claude-runtime',
    tool_name: 'Read',
    tool_input: { file_path: '/tmp/README.md' },
  }, stateDirectory);

  assert.equal(result.status, 0, result.stderr);
  process.env.AGENT_PET_STATE_DIR = stateDirectory;
  t.after(() => delete process.env.AGENT_PET_STATE_DIR);
  const [state] = readSessions();
  assert.equal(state.source, 'claude-code');
  assert.equal(state.activity, 'reading');
});

test('codex-hook.js 真实写入独立 Codex 会话状态', (t) => {
  const stateDirectory = temporaryStateDirectory(t);
  const result = invokeHook('codex-hook.js', 'PreToolUse', {
    session_id: 'codex-runtime',
    cwd: '/tmp/project',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'npm run build' },
  }, stateDirectory);

  assert.equal(result.status, 0, result.stderr);
  process.env.AGENT_PET_STATE_DIR = stateDirectory;
  t.after(() => delete process.env.AGENT_PET_STATE_DIR);
  const [state] = readSessions();
  assert.equal(state.source, 'codex');
  assert.equal(state.activity, 'building');
  assert.equal(state.recentEvents.at(-1).type, 'tool.started');
});
