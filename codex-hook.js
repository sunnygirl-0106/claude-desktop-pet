#!/usr/bin/env node

const { runCli } = require('./src/hook-runner');

runCli('codex', process.argv[2]);
