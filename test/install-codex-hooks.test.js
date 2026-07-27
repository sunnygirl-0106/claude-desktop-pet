const assert = require('node:assert/strict');
const test = require('node:test');
const {
  EVENTS,
  buildConfig,
  isAgentPetHandler,
  removeAgentPetHandlers,
} = require('../scripts/install-codex-hooks');

test('安装器保留已有 Hook 并加入全部 Codex 事件', () => {
  const existing = {
    description: 'existing',
    hooks: {
      Stop: [{
        hooks: [{ type: 'command', command: 'node existing-hook.js' }],
      }],
    },
  };
  const next = buildConfig(existing, {
    nodePath: '/usr/bin/node',
    hookPath: '/tmp/project/codex-hook.js',
  });

  assert.equal(next.hooks.Stop.length, 2);
  assert.deepEqual(
    EVENTS.every((event) => Array.isArray(next.hooks[event])),
    true,
  );
});

test('重复安装会先移除旧的 Agent Pet 处理器', () => {
  const installed = buildConfig({ hooks: {} }, {
    nodePath: '/usr/bin/node',
    hookPath: '/tmp/project/codex-hook.js',
  });
  const reinstalled = buildConfig(installed, {
    nodePath: '/usr/bin/node',
    hookPath: '/tmp/project/codex-hook.js',
  });

  for (const event of EVENTS) {
    const handlers = reinstalled.hooks[event].flatMap((group) => group.hooks);
    assert.equal(handlers.filter(isAgentPetHandler).length, 1);
  }
});

test('卸载逻辑只移除本项目处理器', () => {
  const installed = buildConfig({
    hooks: {
      Stop: [{
        hooks: [{ type: 'command', command: 'node existing-hook.js' }],
      }],
    },
  }, {
    nodePath: '/usr/bin/node',
    hookPath: '/tmp/project/codex-hook.js',
  });
  const removed = removeAgentPetHandlers(installed, '/tmp/project/codex-hook.js');

  assert.equal(removed.hooks.Stop.length, 1);
  assert.equal(removed.hooks.Stop[0].hooks[0].command, 'node existing-hook.js');
});
