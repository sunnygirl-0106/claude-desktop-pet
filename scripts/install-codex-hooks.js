#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'Stop',
];

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function defaultTarget() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'hooks.json');
}

function stableNodePath() {
  const candidates = [
    process.env.AGENT_PET_NODE,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    process.execPath,
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || process.execPath;
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    target: defaultTarget(),
    uninstall: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--uninstall') options.uninstall = true;
    else if (argument === '--target') options.target = path.resolve(argv[++index]);
  }

  return options;
}

function readConfig(target) {
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { hooks: {} };
    throw error;
  }
}

function isAgentPetHandler(handler, hookPath = '') {
  if (handler?.type !== 'command') return false;
  const command = String(handler.command || '');
  if (hookPath) {
    return command.includes(shellQuote(hookPath)) || command.includes(hookPath);
  }
  return /(?:^|[/\\])codex-hook\.js(?:["']|\s|$)/.test(command);
}

function removeAgentPetHandlers(config, hookPath = '') {
  const next = structuredClone(config);
  next.hooks = next.hooks && typeof next.hooks === 'object' ? next.hooks : {};

  for (const [event, groups] of Object.entries(next.hooks)) {
    if (!Array.isArray(groups)) continue;
    next.hooks[event] = groups
      .map((group) => ({
        ...group,
        hooks: Array.isArray(group.hooks)
          ? group.hooks.filter((handler) => !isAgentPetHandler(handler, hookPath))
          : [],
      }))
      .filter((group) => group.hooks.length > 0);
    if (next.hooks[event].length === 0) delete next.hooks[event];
  }

  return next;
}

function buildConfig(current, { nodePath, hookPath, uninstall = false }) {
  const next = removeAgentPetHandlers(current, hookPath);
  if (uninstall) return next;

  next.description = next.description || 'User-level Codex lifecycle hooks.';
  for (const event of EVENTS) {
    const timeout = event === 'SessionEnd' ? 3 : 2;
    const handler = {
      type: 'command',
      command: `${shellQuote(nodePath)} ${shellQuote(hookPath)} ${event}`,
      timeout,
    };
    next.hooks[event] = [...(next.hooks[event] || []), { hooks: [handler] }];
  }

  return next;
}

function writeConfig(target, config) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let backup = null;
  if (fs.existsSync(target)) {
    backup = `${target}.bak-${new Date().toISOString().replaceAll(':', '-')}`;
    fs.copyFileSync(target, backup);
  }

  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
  return backup;
}

function install(options) {
  const hookPath = path.resolve(__dirname, '..', 'codex-hook.js');
  const current = readConfig(options.target);
  const config = buildConfig(current, {
    nodePath: stableNodePath(),
    hookPath,
    uninstall: options.uninstall,
  });

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    return { target: options.target, backup: null, config };
  }

  const backup = writeConfig(options.target, config);
  process.stdout.write(`${options.uninstall ? 'removed' : 'installed'}=${options.target}\n`);
  if (backup) process.stdout.write(`backup=${backup}\n`);
  return { target: options.target, backup, config };
}

if (require.main === module) {
  install(parseArguments(process.argv.slice(2)));
}

module.exports = {
  EVENTS,
  buildConfig,
  defaultTarget,
  install,
  isAgentPetHandler,
  parseArguments,
  removeAgentPetHandlers,
  shellQuote,
  stableNodePath,
  writeConfig,
};
