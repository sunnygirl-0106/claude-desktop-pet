const {
  formatDisplayDetail,
  readCurrentDisplay,
} = require('./src/core/pet-state-service');
const { ipcRenderer } = require('electron');

// 每种状态：颜文字帧（轮播做眨眼/呼吸感）、emoji、气泡文字、身体样式
const STATES = {
  // ── 待命 / 休息 ──
  idle: {
    faces: ['(｡･ᴗ･｡)', '(｡-ᴗ-｡)'],
    emoji: '💤', label: '摸鱼待命中', cls: '', color: '#7a7a8a',
  },
  sleeping: {
    faces: ['( ˘ω˘ )', '( ˘ω˘ )ᶻ'],
    emoji: '💤', label: '呼…呼…', cls: 'sleep', color: '#9a92a8',
  },

  // ── 动脑 ──
  thinking: {
    faces: ['( ˘•ω•˘ )', '( ˘.ω.˘ )'],
    emoji: '💭', label: '认真思考中', cls: '', color: '#5a6acf',
  },
  planning: {
    faces: ['(｀・ω・´)', '(｀・ω・)9'],
    emoji: '🗺️', label: '盘算计划中', cls: '', color: '#4a7ab0',
  },
  organizing: {
    faces: ['( ˙꒳˙ )', '( ˙ᵕ˙ )'],
    emoji: '📋', label: '整理任务', cls: '', color: '#7a8a3a',
  },

  // ── 代码 ──
  reading: {
    faces: ['( •ᴗ•)', '( -ᴗ-)'],
    emoji: '📖', label: '读文件', cls: '', color: '#3a6a9a',
  },
  searching: {
    faces: ['( •̀ω•́ )✧', '( •̀_•́ )✧'],
    emoji: '🔍', label: '翻代码找线索', cls: '', color: '#6a4a9a',
  },
  editing: {
    faces: ['(๑˃ᴗ˂)ﻭ', '(๑•ᴗ•๑)ﻭ'],
    emoji: '📝', label: '改代码', cls: 'busy', color: '#3a8a5a',
  },
  writing: {
    faces: ['(⁀ᗢ⁀)', '(๑⁀ᗢ⁀)'],
    emoji: '✍️', label: '写新文件', cls: 'busy', color: '#2e9e77',
  },

  // ── Shell / 工程 ──
  running: {
    faces: ['(ﾉ>ω<)ﾉ', 'ヽ(>ω<ヽ)'],
    emoji: '⚡', label: '跑命令', cls: 'busy', color: '#b06a1a',
  },
  installing: {
    faces: ['( •̀ᴗ•́ )و', '( •̀ᴗ•́ )ৎ'],
    emoji: '📦', label: '装依赖', cls: 'busy', color: '#a06a2a',
  },
  testing: {
    faces: ['(๑•̀ㅂ•́)و', '(๑•̀ㅁ•́)و'],
    emoji: '🧪', label: '跑测试', cls: 'busy', color: '#b0533a',
  },
  building: {
    faces: ['٩(˘◡˘)۶', 'ヽ(˘◡˘)ﾉ'],
    emoji: '🔨', label: '打包构建', cls: 'busy', color: '#8a6a2a',
  },
  committing: {
    faces: ['( •̀ᄇ•́)ﻭ', '( •̀ᄇ•́)'],
    emoji: '🚀', label: '提交代码', cls: 'busy', color: '#c0533a',
  },
  gitlook: {
    faces: ['( ・_・)ﾉ', '( ・o・)ﾉ'],
    emoji: '👀', label: '看看改动', cls: '', color: '#5a7a7a',
  },

  // ── 外部 ──
  websearch: {
    faces: ['( •ᴗ•)ﾉ', '( •ᴗ•)?'],
    emoji: '🌐', label: '上网搜', cls: '', color: '#2a8a9a',
  },
  fetching: {
    faces: ['( •ᴗ•)⊃', '( •ᴗ•)?'],
    emoji: '📡', label: '读网页', cls: '', color: '#2a7a9a',
  },
  designing: {
    faces: ['(⁎˃ᴗ˂⁎)', '(⁎•ᴗ•⁎)'],
    emoji: '🎨', label: '画设计稿', cls: 'busy', color: '#c04a8a',
  },
  delegating: {
    faces: ['⊂(◉‿◉)つ', '⊂( ◜◒◝ )つ'],
    emoji: '🤖', label: '派小弟干活', cls: 'busy', color: '#8a5a3a',
  },

  // ── 交互 ──
  permission: {
    faces: ['( ･ᴗ･)ゞ', '( ･ᴗ･)ﾉ'],
    emoji: '🙏', label: '等你点允许', cls: '', color: '#c07a2a',
  },
  waiting: {
    faces: ['( ･◡･)？', '( ･o･)？'],
    emoji: '❓', label: '等你回复', cls: '', color: '#b03a5a',
  },
  failed: {
    faces: ['(｡•́︿•̀｡)', '( ˘•ω•˘ )'],
    emoji: '⚠️', label: '遇到问题了', cls: '', color: '#b03a5a',
  },
  done: {
    faces: ['٩(◕‿◕)۶', 'ヽ(◕‿◕)ﾉ'],
    emoji: '✨', label: '搞定啦！', cls: 'celebrate', color: '#c02a7a',
  },
};

const faceEl = document.getElementById('face');
const emojiEl = document.getElementById('emoji');
const labelEl = document.getElementById('bubble-label');
const detailEl = document.getElementById('bubble-detail');
const bodyEl = document.getElementById('creature');

let frame = 0;
let currentKey = 'idle';
let pokeUntil = 0;          // 被戳后的反应保持到这个时刻
let idleSince = Date.now(); // 进入空闲的时刻，用来判断是否睡着

// 颜文字帧轮播（眨眼/呼吸）
setInterval(() => {
  if (Date.now() < pokeUntil) return; // 被戳反应期间别覆盖表情
  frame = (frame + 1) % 2;
  const st = STATES[currentKey] || STATES.idle;
  faceEl.textContent = st.faces[frame % st.faces.length];
}, 650);

function applyState(key, detail) {
  const st = STATES[key] || STATES.idle;
  currentKey = key;

  faceEl.textContent = st.faces[0];
  emojiEl.textContent = st.emoji;
  labelEl.textContent = st.label;
  detailEl.textContent = detail || '';

  // 身体动画类
  bodyEl.className = '';
  if (st.cls) {
    // 强制重启动画
    void bodyEl.offsetWidth;
    bodyEl.className = st.cls;
  }

  // 完成时「噗」地冒一串爱心庆祝
  if (key === 'done') burstHearts(6);
}

let lastRendered = '';
function tick() {
  if (Date.now() < pokeUntil) return; // 被戳反应期间不打扰
  const display = readCurrentDisplay();
  let key = display.state || 'idle';
  let detail = formatDisplayDetail(display);

  // 记录空闲起点：只要不是 idle 就刷新计时
  if (key !== 'idle') idleSince = Date.now();
  // 摸鱼超过 30 秒 → 打呼睡着
  if (key === 'idle' && Date.now() - idleSince > 30000) {
    key = 'sleeping';
    detail = '';
  }

  const sig = `${key}|${detail}`;
  if (sig !== lastRendered) {
    applyState(key, detail);
    lastRendered = sig;
  }
}

// ══════════════════════════════════════
// 冒小爱心 💕
// ══════════════════════════════════════
const HEARTS = ['💕', '💖', '💗', '🩷', '💞'];
const petEl = document.getElementById('pet');

function spawnHeart() {
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
  // 从宠物两侧冒出，不挡脸：左 ~14-28% 或右 ~72-86%
  const side = Math.random() < 0.5 ? -1 : 1;
  h.style.left = (50 + side * (22 + Math.random() * 14)).toFixed(0) + '%';
  h.style.bottom = (20 + Math.random() * 14) + 'px';
  h.style.fontSize = (11 + Math.random() * 7).toFixed(0) + 'px';
  h.style.setProperty('--drift', (Math.random() * 24 - 12).toFixed(0) + 'px');
  h.style.animationDuration = (1.6 + Math.random() * 0.8).toFixed(2) + 's';
  petEl.appendChild(h);
  setTimeout(() => h.remove(), 2600);
}

// 完成时冒一串
function burstHearts(n) {
  for (let i = 0; i < n; i++) setTimeout(spawnHeart, i * 110);
}

// 平时时不时冒一颗（4~9 秒随机）
function scheduleHeart() {
  setTimeout(() => { spawnHeart(); scheduleHeart(); }, 4000 + Math.random() * 5000);
}
scheduleHeart();

// ══════════════════════════════════════
// 戳一下有反应 (｡•̀ᴗ-)✧
// ══════════════════════════════════════
const creatureEl = document.getElementById('creature');
const POKE_WORDS = ['欸嘿嘿', '戳到我啦~', '嘿呀！', '痒痒的~', '在的在的', '嗯？'];
const POKE_FACES = ['(๑>ᴗ<๑)', '(≧◡≦)', '(*≧ω≦)', 'ヽ(*・ω・)ﾉ', '(๑˃́ ꇴ ˂̀๑)'];

function poke() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  faceEl.textContent = pick(POKE_FACES);
  emojiEl.textContent = '💗';
  labelEl.textContent = pick(POKE_WORDS);
  detailEl.textContent = '';

  bodyEl.className = '';
  void bodyEl.offsetWidth;   // 强制重启动画
  bodyEl.className = 'poked';

  burstHearts(4);            // 戳一下冒几颗爱心
  pokeUntil = Date.now() + 1400;
  lastRendered = '__poke__'; // 反应结束后让 tick 重新渲染真实状态
}
// 单击 = 戳一下（双击的第二下不重复戳）
creatureEl.addEventListener('click', (e) => {
  if (e.detail >= 2) return;
  poke();
});

// 双击 = 露出控制按钮（躲起来 🙈 / 换色 🎨 / 关闭 ×），3.5 秒后自动藏回
const closeBtn = document.getElementById('close');
const hideBtn = document.getElementById('hide');
const themeBtn = document.getElementById('theme');
const ctrlBtns = [closeBtn, hideBtn, themeBtn];
let hideCtrlTimer = null;
function revealControls() {
  ctrlBtns.forEach((b) => b.classList.add('show'));
  clearTimeout(hideCtrlTimer);
  hideCtrlTimer = setTimeout(() => ctrlBtns.forEach((b) => b.classList.remove('show')), 3500);
}
creatureEl.addEventListener('dblclick', revealControls);

// ══════════════════════════════════════
// 马卡龙换色 🎨（记住选择）
// ══════════════════════════════════════
const THEMES = ['', 'theme-green', 'theme-blue', 'theme-purple', 'theme-yellow']; // '' = 默认粉
const THEME_NAMES = ['马卡龙粉', '马卡龙绿', '马卡龙蓝', '芋泥紫', '柠檬黄'];
function applyTheme(i) {
  document.body.className = THEMES[i];
  localStorage.setItem('petThemeIndex', String(i));
}
let themeIndex = parseInt(localStorage.getItem('petThemeIndex') || '0', 10);
if (isNaN(themeIndex) || themeIndex < 0 || themeIndex >= THEMES.length) themeIndex = 0;
applyTheme(themeIndex);

themeBtn.addEventListener('click', () => {
  themeIndex = (themeIndex + 1) % THEMES.length;
  applyTheme(themeIndex);
  labelEl.textContent = THEME_NAMES[themeIndex]; // 气泡里瞄一眼当前色名
  detailEl.textContent = '';
  burstHearts(4);
  pokeUntil = Date.now() + 1200;
  lastRendered = '__theme__';
  revealControls(); // 保持按钮可见，方便连点换色
});

// ── 自己随机换色：每隔 30~75 秒悄悄换个马卡龙色 ──
function randomThemeShuffle() {
  const delay = 30000 + Math.random() * 45000;
  setTimeout(() => {
    let next = Math.floor(Math.random() * THEMES.length);
    if (next === themeIndex) next = (next + 1) % THEMES.length; // 保证跟当前不同
    themeIndex = next;
    applyTheme(themeIndex);
    burstHearts(3);          // 悄悄冒几颗作提示，不打扰状态气泡
    randomThemeShuffle();
  }, delay);
}
randomThemeShuffle();

setInterval(tick, 400);
tick();

// 点 🙈 = 躲起来 5 分钟（自动回来）
hideBtn.addEventListener('click', () => {
  ipcRenderer.send('hide-for', 5 * 60 * 1000);
});

// 点 × = 真的收起宠物
closeBtn.addEventListener('click', () => {
  window.close();
});
