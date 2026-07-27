# Agent 状态层

状态层将 Agent 厂商的 Hook 格式与宠物外观解耦。目前实现 Claude Code 和
Codex CLI 两个 Adapter，暂不接入 OpenCode。

## 数据流

```text
Provider Hook
    │
    ▼
Provider Adapter
    │ AgentEvent
    ▼
State Reducer
    │ SessionState
    ▼
Per-session Store
    │
    ▼
Runtime Reconciler ◄── Provider Observer
    │
    ▼
Arbitrator ──► DisplayState ──► Renderer
```

## AgentEvent

Adapter 输出的事件只包含状态判定所需信息，不会把完整提示词、工具输入或工具
输出落盘。

```json
{
  "version": 1,
  "source": "codex",
  "sessionId": "session-id",
  "turnId": "turn-id",
  "transcriptPath": "/path/to/rollout.jsonl",
  "type": "tool.started",
  "activity": "testing",
  "detail": "npm",
  "toolName": "Bash",
  "failed": false,
  "timestamp": 1785123456789
}
```

通用事件类型：

- `session.started` / `session.ended`
- `turn.prompted` / `turn.completed` / `turn.failed` / `turn.interrupted`
- `tool.started` / `tool.completed`
- `permission.requested` / `user-input.requested`
- `subagent.started` / `subagent.stopped`

## SessionState

状态由三个正交维度构成：

- `phase`: `idle | active | completed | failed`
- `activity`: `thinking | planning | organizing | reading | searching |
  editing | writing | running | installing | testing | building | committing |
  gitlook | websearch | fetching | designing | delegating`
- `attention`: `none | permission | user_input`

状态文件按 `source + sessionId` 分开写入
`~/.agent-pet/sessions/*.json`，使用临时文件加原子重命名，避免 renderer
读到半写入 JSON。

## 仲裁与超时

多个会话同时存在时，展示优先级为：

```text
permission > user_input > failed > active > completed > idle
```

- 最高优先级会话驱动宠物表情和状态气泡。
- 完成状态展示 5 秒。
- 普通活动 90 秒没有新事件后回到空闲。
- 等待用户或失败状态 5 分钟没有新事件后回到空闲。
- renderer 连续空闲 30 秒后显示睡眠状态。

Codex CLI 在用户按 `Ctrl-C` 中断当前轮次时会向 transcript 写入
`turn_aborted`，但不会触发 `Stop` Hook。Codex Observer 只读取 transcript
末尾的运行时事件，并将匹配当前 `turnId` 的中断归一化为通用
`turn.interrupted`；因此中断后可以立即回到空闲，同时不缩短正常长任务的
90 秒兜底时间。

## Provider 边界

- Claude Code Adapter 支持原 `pre`、`post`、`prompt`、`stop`、`notify`
  参数，并同时接受正式 Hook 事件名。
- Codex CLI Adapter 使用官方 lifecycle Hook 名称和公共输入字段。
- Provider Observer 只补齐 Hook 没有覆盖的运行时终止事件；补齐后仍输出通用
  `AgentEvent`，不会让 renderer 感知 Codex transcript 格式。
- 工具分类属于 core，不属于任何 Provider；Adapter 只翻译事件。
- 新 Provider 只需实现 `toAgentEvent(eventName, payload)`，不需要修改
  reducer、store 或 renderer。
