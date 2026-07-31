const assert = require('node:assert/strict');
const test = require('node:test');
const { EVENT_TYPES, createAgentEvent } = require('../src/core/agent-event');
const {
  deriveDisplayState,
  selectDisplayState,
} = require('../src/core/state-arbitrator');
const { formatDisplayDetail } = require('../src/core/pet-state-service');
const { reduceAgentEvent } = require('../src/core/state-reducer');
const { classifyCommand, classifyTool } = require('../src/core/tool-classifier');

test('命令分类保持原项目的工程状态', () => {
  assert.deepEqual(classifyCommand('git status --short'), {
    activity: 'gitlook',
    detail: 'git status',
  });
  assert.deepEqual(classifyCommand('npm ci'), {
    activity: 'installing',
    detail: 'npm',
  });
  assert.deepEqual(classifyCommand('npm test'), {
    activity: 'testing',
    detail: 'npm',
  });
  assert.deepEqual(classifyCommand('npm run build'), {
    activity: 'building',
    detail: 'npm',
  });
});

test('工具分类不依赖具体 Provider', () => {
  assert.equal(classifyTool('Read', { file_path: '/tmp/a.js' }).activity, 'reading');
  assert.equal(classifyTool('apply_patch', {}).activity, 'editing');
  assert.equal(classifyTool('update_plan', {}).activity, 'organizing');
  assert.equal(classifyTool('spawn_agent', {}).activity, 'delegating');
  assert.equal(classifyTool('mcp__figma__render', {}).activity, 'designing');
});

test('Reducer 将事件拆成 phase、activity、attention', () => {
  const prompted = createAgentEvent({
    source: 'codex',
    type: EVENT_TYPES.TURN_PROMPTED,
    payload: {
      session_id: 's1',
      transcript_path: '/tmp/s1.jsonl',
      turn_id: 'turn-1',
    },
    timestamp: 1_000,
  });
  const active = reduceAgentEvent(null, prompted);
  assert.equal(active.phase, 'active');
  assert.equal(active.activity, 'thinking');
  assert.equal(active.attention, 'none');
  assert.equal(active.transcriptPath, '/tmp/s1.jsonl');
  assert.equal(active.turnId, 'turn-1');

  const permission = createAgentEvent({
    source: 'codex',
    type: EVENT_TYPES.PERMISSION_REQUESTED,
    payload: { session_id: 's1' },
    activity: 'running',
    detail: 'npm',
    timestamp: 2_000,
  });
  const waiting = reduceAgentEvent(active, permission);
  assert.equal(waiting.phase, 'active');
  assert.equal(waiting.activity, 'running');
  assert.equal(waiting.attention, 'permission');
});

test('中断事件让活动状态立即回到空闲', () => {
  const active = {
    version: 1,
    source: 'codex',
    sessionId: 's1',
    phase: 'active',
    activity: 'thinking',
    attention: 'none',
    updatedAt: 1_000,
    recentEvents: [],
  };
  const interrupted = createAgentEvent({
    source: 'codex',
    type: EVENT_TYPES.TURN_INTERRUPTED,
    payload: { session_id: 's1', turn_id: 'turn-1' },
    timestamp: 2_000,
  });
  const idle = reduceAgentEvent(active, interrupted);

  assert.equal(idle.phase, 'idle');
  assert.equal(idle.activity, null);
  assert.equal(idle.lastEvent, 'turn.interrupted');
});

test('仲裁优先展示需要用户处理的会话', () => {
  const now = 20_000;
  const display = selectDisplayState([
    {
      source: 'codex',
      sessionId: 'working',
      phase: 'active',
      activity: 'testing',
      attention: 'none',
      updatedAt: now,
    },
    {
      source: 'claude-code',
      sessionId: 'approval',
      phase: 'active',
      activity: 'editing',
      attention: 'permission',
      updatedAt: now - 1_000,
    },
  ], now);

  assert.equal(display.state, 'permission');
  assert.equal(display.source, 'claude-code');
});

test('状态小字只显示工具细节', () => {
  assert.equal(formatDisplayDetail({
    state: 'testing',
    sourceLabel: 'Codex',
    cwd: '/tmp/project',
    detail: 'npm',
  }), 'npm');
});

test('状态超时后回到空闲', () => {
  const session = {
    source: 'codex',
    sessionId: 'old',
    phase: 'active',
    activity: 'testing',
    attention: 'none',
    updatedAt: 1_000,
  };
  assert.equal(deriveDisplayState(session, 2_000).state, 'testing');
  assert.equal(deriveDisplayState(session, 100_000).state, 'idle');
});
