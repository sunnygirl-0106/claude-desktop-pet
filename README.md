# Claude 桌面宠物 ٩(◕‿◕)۶

一个悬浮在桌面右下角的小宠物，实时显示 **Claude Code 正在干嘛**。
灵感来自 Codex 的桌宠。透明无边框、永远置顶、可拖到屏幕任意角落。

> 🌸 **在线演示（不用安装）→ https://sunnygirl-0106.github.io/claude-desktop-pet/**
> 网页里宠物会自动巡演全部 22 种状态，还能点着戳一戳、看它冒爱心 💕

## 它是怎么知道我在干嘛的？

```
Claude Code 每次动工具
      │  (触发 hook)
      ▼
  pet-hook.js  ──写──►  ~/.claude/pet-status.json
                                   │
                                   ▼  (每 400ms 轮询)
                          Electron 桌宠换表情
```

Claude Code 的 hooks 在每次调用工具前后会触发。`pet-hook.js` 读取事件、
判断我在做什么（编辑 / 读文件 / 跑命令 / 搜索 / 派子任务 / 完成…），
写进一个状态文件；桌宠轮询这个文件、切换对应的颜文字表情和气泡。

## 状态表情对照（共 22 种）

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

## 已接入的 Claude Code hooks

写在 `~/.claude/settings.json`（改动前已备份到 `settings.json.bak-before-pet`）：

- `PreToolUse`  → `pet-hook.js pre`（判断当前工具）
- `PostToolUse` → `pet-hook.js post`（回到思考态）
- `UserPromptSubmit` → `pet-hook.js prompt`
- `Stop` → `pet-hook.js stop`（完成庆祝，保留了原来的提示音）
- `Notification` → `pet-hook.js notify`（等待输入，保留了原来的提示音）

## 想改宠物长相？

- 表情/文案：编辑 `renderer.js` 里的 `STATES`
- 大小/位置/透明度：`main.js` 的窗口参数
- 动画/配色：`styles.css`

## 卸载

1. 删掉本文件夹
2. 把 `~/.claude/settings.json.bak-before-pet` 覆盖回 `~/.claude/settings.json`
   （即可移除所有桌宠相关的 hook）
