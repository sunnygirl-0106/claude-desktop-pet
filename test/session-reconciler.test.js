const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { reconcileSession } = require('../src/core/session-reconciler');

function temporaryTranscript(t, records) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-pet-transcript-'));
  const transcriptPath = path.join(directory, 'rollout.jsonl');
  fs.writeFileSync(
    transcriptPath,
    `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return transcriptPath;
}

function activeSession(transcriptPath, overrides = {}) {
  return {
    version: 1,
    source: 'codex',
    sessionId: 'codex-1',
    cwd: '/tmp/project',
    transcriptPath,
    turnId: 'turn-current',
    phase: 'active',
    activity: 'thinking',
    attention: 'none',
    detail: '',
    toolName: '',
    updatedAt: 1_000,
    lastEvent: 'turn.prompted',
    recentEvents: [],
    ...overrides,
  };
}

test('Codex transcript 的 Ctrl-C 中断会被归一化为空闲', (t) => {
  const transcriptPath = temporaryTranscript(t, [{
    timestamp: new Date(2_000).toISOString(),
    type: 'event_msg',
    payload: {
      type: 'turn_aborted',
      turn_id: 'turn-current',
      reason: 'interrupted',
    },
  }]);

  const reconciled = reconcileSession(activeSession(transcriptPath));

  assert.equal(reconciled.phase, 'idle');
  assert.equal(reconciled.activity, null);
  assert.equal(reconciled.lastEvent, 'turn.interrupted');
});

test('同轮次的中断优先于稍晚到达的工具清理 Hook', (t) => {
  const transcriptPath = temporaryTranscript(t, [{
    timestamp: new Date(2_000).toISOString(),
    type: 'event_msg',
    payload: {
      type: 'turn_aborted',
      turn_id: 'turn-current',
      reason: 'interrupted',
    },
  }]);

  const reconciled = reconcileSession(activeSession(transcriptPath, {
    updatedAt: 3_000,
    lastEvent: 'tool.completed',
  }));

  assert.equal(reconciled.phase, 'idle');
  assert.equal(reconciled.lastEvent, 'turn.interrupted');
});

test('Codex transcript 不会用旧轮次的中断覆盖当前活动', (t) => {
  const transcriptPath = temporaryTranscript(t, [{
    timestamp: new Date(2_000).toISOString(),
    type: 'event_msg',
    payload: {
      type: 'turn_aborted',
      turn_id: 'turn-old',
      reason: 'interrupted',
    },
  }]);

  const reconciled = reconcileSession(activeSession(transcriptPath));

  assert.equal(reconciled.phase, 'active');
  assert.equal(reconciled.lastEvent, 'turn.prompted');
});

test('缺失 Stop Hook 时 task_complete 也能补全完成状态', (t) => {
  const transcriptPath = temporaryTranscript(t, [{
    timestamp: new Date(2_000).toISOString(),
    type: 'event_msg',
    payload: {
      type: 'task_complete',
      turn_id: 'turn-current',
    },
  }]);

  const reconciled = reconcileSession(activeSession(transcriptPath));

  assert.equal(reconciled.phase, 'completed');
  assert.equal(reconciled.lastEvent, 'turn.completed');
});
