#!/usr/bin/env node

// 保留原有 Claude Code hook 命令行接口：
// node pet-hook.js <pre|post|prompt|stop|notify>
const { runCli } = require('./src/hook-runner');

runCli('claude-code', process.argv[2] || 'pre');
