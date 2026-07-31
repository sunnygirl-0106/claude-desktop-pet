# Claude 桌面宠物 ٩(◕‿◕)۶

一个悬浮在桌面右下角的小宠物，实时显示 **Claude Code 或 Codex CLI
正在干嘛**。透明无边框、永远置顶、可拖到屏幕任意角落。

> 🌸 **在线演示（不用安装）→ https://sunnygirl-0106.github.io/claude-desktop-pet/**
> 网页里宠物会自动巡演全部 22 种状态，还能点着戳一戳、看它冒爱心 💕

## 它是怎么知道 Claude Code / Codex CLI 在干嘛的？

```
Claude Code ─┐
             ├─ Adapter → 通用事件 → 状态引擎 → ~/.agent-pet/sessions/*.json
Codex CLI ───┘                                      │
                                                   ▼
                                      Electron 桌宠展示最高优先级状态
```

不同 Agent 的 Adapter 只负责翻译各自 Hook 格式；通用状态引擎统一处理
工作阶段、当前活动、等待授权、完成、失败和超时。每个 Agent 会话单独保存，
多个会话同时运行时按“等待授权 > 等待输入 > 失败 > 工作中 > 完成 > 空闲”
选择当前展示状态。详细协议见
[`docs/state-architecture.md`](docs/state-architecture.md)。

## 状态表情对照

| 状态 | 颜文字 | 触发时机 |
|------|--------|----------|
| 摸鱼待命 | `(｡･ᴗ･｡)💤` | 空闲 |
| 打呼睡着 | `( ˘ω˘ )💤` | 摸鱼超过 30 秒 |
| 认真思考 | `( ˘•ω•˘ )💭` | 收到你的消息 / 工具之间 |
| 盘算计划 | `(｀・ω・´)🗺️` | 制定/展示计划 |
| 整理任务 | `( ˙꒳˙ )📋` | TodoWrite / 任务清单 |
| 读文件 | `( •ᴗ•)📖` | Read |
| 翻代码找线索 | `( •̀ω•́ )✧🔍` | Grep / Glob |
| 改代码 | `(๑˃ᴗ˂)ﻭ📝` | Edit / NotebookEdit |
| 写新文件 | `(⁀ᗢ⁀)✍️` | Write |
| 跑命令 | `(ﾉ>ω<)ﾉ⚡` | Bash（通用）|
| 装依赖 | `( •̀ᴗ•́ )و📦` | npm/pip/brew install… |
| 跑测试 | `(๑•̀ㅂ•́)و🧪` | pytest/jest/test… |
| 打包构建 | `٩(˘◡˘)۶🔨` | build/make/vite/tsc… |
| 提交代码 | `( •̀ᄇ•́)ﻭ🚀` | git commit/push… |
| 看看改动 | `( ・_・)ﾉ👀` | git status/diff/log… |
| 上网搜 | `( •ᴗ•)ﾉ🌐` | WebSearch |
| 读网页 | `( •ᴗ•)⊃📡` | WebFetch |
| 画设计稿 | `(⁎˃ᴗ˂⁎)🎨` | Figma / Pencil 等设计工具 |
| 派小弟干活 | `⊂(◉‿◉)つ🤖` | Task / 子 Agent |
| 等你点允许 | `( ･ᴗ･)ゞ🙏` | 需要你批准某个工具（我在等你点允许）|
| 等你回复 | `( ･◡･)？❓` | 我做完了，在等你输入 |
| 遇到问题 | `(｡•́︿•̀｡)⚠️` | 工具、子 Agent 或任务失败 |
| 搞定啦 | `٩(◕‿◕)۶✨` | 一轮任务结束 |

## 互动

- **单击宠物** → 戳一戳，它会害羞 + 冒爱心
- **双击宠物** → 露出 🙈（躲 5 分钟）和 ×（关闭）按钮，3.5 秒后自动藏起
- **平时** → 时不时冒小爱心 💕；摸鱼久了会打呼睡着 💤

## 启动 / 停止

```bash
# 启动
npm start
# 或双击 start.command

# 停止：鼠标悬到宠物上，点右上角的 ×
# 或命令行：
pkill -f "electron ."
```

## Claude Code 兼容入口

原来的命令行接口保持不变，已有 Claude Code Hook 配置无需修改：

- `PreToolUse`  → `pet-hook.js pre`（判断当前工具）
- `PostToolUse` → `pet-hook.js post`（回到思考态）
- `UserPromptSubmit` → `pet-hook.js prompt`
- `Stop` → `pet-hook.js stop`（完成庆祝，保留了原来的提示音）
- `Notification` → `pet-hook.js notify`（等待输入，保留了原来的提示音）

旧版 `~/.claude/pet-status.json` 仍可作为兼容数据源读取。

## Codex CLI Hooks

安装用户级 Codex CLI Hooks：

```bash
npm run install:codex-hooks
```

安装器会合并而不是覆盖 `~/.codex/hooks.json`，修改已有文件前会生成带时间戳的
备份。重新打开 Codex CLI 后输入 `/hooks`，检查并信任新增的命令 Hook。

接入事件包括：

- `SessionStart` / `SessionEnd`
- `UserPromptSubmit` / `Stop`
- `PreToolUse` / `PostToolUse`
- `PermissionRequest`
- `SubagentStart` / `SubagentStop`

卸载时只移除本项目的处理器：

```bash
npm run uninstall:codex-hooks
```

## 测试

```bash
npm test
```

## 想改宠物长相？

- 表情/文案：编辑 `renderer.js` 里的 `STATES`
- 大小/位置/透明度：`main.js` 的窗口参数
- 动画/配色：`styles.css`

## 完全卸载

1. 运行 `npm run uninstall:codex-hooks`。
2. 从 `~/.claude/settings.json` 中移除指向 `pet-hook.js` 的 Claude Code Hook。
3. 删除本项目和可选的 `~/.agent-pet/` 状态目录。
