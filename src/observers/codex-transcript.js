const fs = require('fs');
const { EVENT_TYPES, createAgentEvent } = require('../core/agent-event');

const TAIL_BYTES = 64 * 1024;
const terminalCache = new Map();

function readTail(filePath) {
  const stat = fs.statSync(filePath);
  const cached = terminalCache.get(filePath);
  if (cached && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) {
    return cached.records;
  }

  const length = Math.min(stat.size, TAIL_BYTES);
  const start = stat.size - length;
  const descriptor = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(length);

  try {
    fs.readSync(descriptor, buffer, 0, length, start);
  } finally {
    fs.closeSync(descriptor);
  }

  const lines = buffer.toString('utf8').split('\n');
  if (start > 0) lines.shift();

  const records = lines
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  terminalCache.set(filePath, {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    records,
  });
  return records;
}

function terminalEvent(session) {
  if (session?.source !== 'codex' || session.phase !== 'active' || !session.transcriptPath) {
    return null;
  }

  let records;
  try {
    records = readTail(session.transcriptPath);
  } catch {
    return null;
  }

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    const payload = record?.type === 'event_msg' ? record.payload : null;
    if (!['task_complete', 'turn_aborted'].includes(payload?.type)) continue;
    if (session.turnId && payload.turn_id && payload.turn_id !== session.turnId) continue;

    const timestamp = Date.parse(record.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    const matchesCurrentTurn = Boolean(
      session.turnId && payload.turn_id === session.turnId,
    );
    if (!matchesCurrentTurn && timestamp < Number(session.updatedAt || 0)) continue;

    return createAgentEvent({
      source: 'codex',
      type: payload.type === 'turn_aborted'
        ? EVENT_TYPES.TURN_INTERRUPTED
        : EVENT_TYPES.TURN_COMPLETED,
      payload: {
        session_id: session.sessionId,
        cwd: session.cwd,
        transcript_path: session.transcriptPath,
        turn_id: payload.turn_id || session.turnId,
      },
      detail: payload.reason === 'interrupted' ? '已中断' : '',
      timestamp,
    });
  }

  return null;
}

module.exports = {
  TAIL_BYTES,
  readTail,
  terminalEvent,
};
