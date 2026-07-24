/* ══════════════════════════════════════════════════════
   Claude 桌面宠物 · 网页演示脚本（纯浏览器，无 Node 依赖）
   自动巡演所有状态，可戳、会冒爱心，并生成状态画廊
   —— 状态定义与桌面版 renderer.js 保持一致
   ══════════════════════════════════════════════════════ */

const STATES = {
  idle:       { faces: ['(｡･ᴗ･｡)', '(｡-ᴗ-｡)'],   emoji: '💤',  label: '摸鱼待命中',   cls: '',          color: '#7a7a8a' },
  sleeping:   { faces: ['( ˘ω˘ )', '( ˘ω˘ )ᶻ'],   emoji: '💤',  label: '呼…呼…',       cls: 'sleep',     color: '#9a92a8' },
  thinking:   { faces: ['( ˘•ω•˘ )', '( ˘.ω.˘ )'], emoji: '💭',  label: '认真思考中',   cls: '',          color: '#5a6acf' },
  planning:   { faces: ['(｀・ω・´)', '(｀・ω・)9'], emoji: '🗺️', label: '盘算计划中',   cls: '',          color: '#4a7ab0' },
  organizing: { faces: ['( ˙꒳˙ )', '( ˙ᵕ˙ )'],     emoji: '📋',  label: '整理任务',     cls: '',          color: '#7a8a3a' },
  reading:    { faces: ['( •ᴗ•)', '( -ᴗ-)'],        emoji: '📖',  label: '读文件',       cls: '',          color: '#3a6a9a' },
  searching:  { faces: ['( •̀ω•́ )✧', '( •̀_•́ )✧'],  emoji: '🔍',  label: '翻代码找线索', cls: '',          color: '#6a4a9a' },
  editing:    { faces: ['(๑˃ᴗ˂)ﻭ', '(๑•ᴗ•๑)ﻭ'],    emoji: '📝',  label: '改代码',       cls: 'busy',      color: '#3a8a5a' },
  writing:    { faces: ['(⁀ᗢ⁀)', '(๑⁀ᗢ⁀)'],        emoji: '✍️', label: '写新文件',     cls: 'busy',      color: '#2e9e77' },
  running:    { faces: ['(ﾉ>ω<)ﾉ', 'ヽ(>ω<ヽ)'],    emoji: '⚡',  label: '跑命令',       cls: 'busy',      color: '#b06a1a' },
  installing: { faces: ['( •̀ᴗ•́ )و', '( •̀ᴗ•́ )ৎ'], emoji: '📦',  label: '装依赖',       cls: 'busy',      color: '#a06a2a' },
  testing:    { faces: ['(๑•̀ㅂ•́)و', '(๑•̀ㅁ•́)و'],  emoji: '🧪',  label: '跑测试',       cls: 'busy',      color: '#b0533a' },
  building:   { faces: ['٩(˘◡˘)۶', 'ヽ(˘◡˘)ﾉ'],     emoji: '🔨',  label: '打包构建',     cls: 'busy',      color: '#8a6a2a' },
  committing: { faces: ['( •̀ᄇ•́)ﻭ', '( •̀ᄇ•́)'],    emoji: '🚀',  label: '提交代码',     cls: 'busy',      color: '#c0533a' },
  gitlook:    { faces: ['( ・_・)ﾉ', '( ・o・)ﾉ'],   emoji: '👀',  label: '看看改动',     cls: '',          color: '#5a7a7a' },
  websearch:  { faces: ['( •ᴗ•)ﾉ', '( •ᴗ•)?'],       emoji: '🌐',  label: '上网搜',       cls: '',          color: '#2a8a9a' },
  fetching:   { faces: ['( •ᴗ•)⊃', '( •ᴗ•)?'],       emoji: '📡',  label: '读网页',       cls: '',          color: '#2a7a9a' },
  designing:  { faces: ['(⁎˃ᴗ˂⁎)', '(⁎•ᴗ•⁎)'],      emoji: '🎨',  label: '画设计稿',     cls: 'busy',      color: '#c04a8a' },
  delegating: { faces: ['⊂(◉‿◉)つ', '⊂( ◜◒◝ )つ'],  emoji: '🤖',  label: '派小弟干活',   cls: 'busy',      color: '#8a5a3a' },
  permission: { faces: ['( ･ᴗ･)ゞ', '( ･ᴗ･)ﾉ'],     emoji: '🙏',  label: '等你点允许',   cls: '',          color: '#c07a2a' },
  waiting:    { faces: ['( ･◡･)？', '( ･o･)？'],     emoji: '❓',  label: '等你回复',     cls: '',          color: '#b03a5a' },
  done:       { faces: ['٩(◕‿◕)۶', 'ヽ(◕‿◕)ﾉ'],     emoji: '✨',  label: '搞定啦！',     cls: 'celebrate', color: '#c02a7a' },
};

// 演示巡演顺序（带示例细节）
const TIMELINE = [
  ['thinking', ''], ['planning', ''], ['reading', 'script.js'], ['searching', 'useState'],
  ['editing', 'styles.css'], ['writing', 'App.tsx'], ['running', 'ls'], ['installing', 'npm'],
  ['testing', 'pytest'], ['building', 'vite'], ['committing', 'git commit'], ['gitlook', 'git diff'],
  ['websearch', 'kawaii css'], ['fetching', 'github.com'], ['designing', 'figma'],
  ['delegating', '审查代码'], ['organizing', ''], ['permission', ''], ['waiting', ''], ['done', ''], ['idle', ''],
];

const faceEl   = document.getElementById('face');
const emojiEl  = document.getElementById('emoji');
const labelEl  = document.getElementById('bubble-label');
const detailEl = document.getElementById('bubble-detail');
const bodyEl   = document.getElementById('creature');
const nameEl   = document.getElementById('state-name');
const petEl    = document.getElementById('pet');

let frame = 0;
let currentKey = 'idle';
let pokeUntil = 0;

// 颜文字帧轮播（眨眼/呼吸）
setInterval(() => {
  if (Date.now() < pokeUntil) return;
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
  nameEl.textContent = st.label + ' ' + st.emoji;

  bodyEl.className = '';
  if (st.cls) { void bodyEl.offsetWidth; bodyEl.className = st.cls; }

  if (key === 'done') burstHearts(6);
}

// ── 冒小爱心 ──
const HEARTS = ['💕', '💖', '💗', '🩷', '💞'];
function spawnHeart() {
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
  const side = Math.random() < 0.5 ? -1 : 1;
  h.style.left = (50 + side * (18 + Math.random() * 12)).toFixed(0) + '%';
  h.style.bottom = (78 + Math.random() * 14) + 'px';
  h.style.fontSize = (11 + Math.random() * 7).toFixed(0) + 'px';
  h.style.setProperty('--drift', (Math.random() * 24 - 12).toFixed(0) + 'px');
  h.style.animationDuration = (1.6 + Math.random() * 0.8).toFixed(2) + 's';
  petEl.appendChild(h);
  setTimeout(() => h.remove(), 2600);
}
function burstHearts(n) { for (let i = 0; i < n; i++) setTimeout(spawnHeart, i * 110); }
function scheduleHeart() {
  setTimeout(() => { spawnHeart(); scheduleHeart(); }, 4000 + Math.random() * 5000);
}

// ── 戳一下有反应 ──
const POKE_WORDS = ['欸嘿嘿', '戳到我啦~', '嘿呀！', '痒痒的~', '在的在的', '嗯？'];
const POKE_FACES = ['(๑>ᴗ<๑)', '(≧◡≦)', '(*≧ω≦)', 'ヽ(*・ω・)ﾉ', '(๑˃́ ꇴ ˂̀๑)'];
function poke() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  faceEl.textContent = pick(POKE_FACES);
  emojiEl.textContent = '💗';
  labelEl.textContent = pick(POKE_WORDS);
  detailEl.textContent = '';
  nameEl.textContent = '被你戳到啦 💗';
  bodyEl.className = '';
  void bodyEl.offsetWidth;
  bodyEl.className = 'poked';
  burstHearts(4);
  pokeUntil = Date.now() + 1400;
}
bodyEl.addEventListener('click', poke);

// ── 自动巡演 ──
let ti = 0;
function nextState() {
  if (Date.now() >= pokeUntil) {
    const [key, detail] = TIMELINE[ti % TIMELINE.length];
    applyState(key, detail);
    ti++;
  }
}
setInterval(nextState, 2600);

// ── 生成状态画廊 ──
const gallery = document.getElementById('gallery');
Object.keys(STATES).forEach((k) => {
  const st = STATES[k];
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML =
    '<div class="cface" style="color:' + st.color + '">' + st.faces[0] + '</div>' +
    '<div class="clabel">' + st.label + ' <span class="cemoji">' + st.emoji + '</span></div>';
  gallery.appendChild(card);
});

// ══════════════════════════════════════
// 马卡龙换色 🎨：色卡可点 + 自己随机变
// ══════════════════════════════════════
const THEMES = ['', 'theme-green', 'theme-blue', 'theme-purple', 'theme-yellow'];
const THEME_NAMES = ['马卡龙粉', '马卡龙绿', '马卡龙蓝', '芋泥紫', '柠檬黄'];
const SWATCH_COLORS = ['#ffd0e6', '#c9f0dc', '#cbe7fa', '#e2d2fa', '#fbecc0'];

let themeIndex = 0;
const swatchWrap = document.getElementById('swatches');
const swatches = THEMES.map((_, i) => {
  const s = document.createElement('span');
  s.className = 'swatch';
  s.style.background = SWATCH_COLORS[i];
  s.title = THEME_NAMES[i];
  s.addEventListener('click', () => setTheme(i, true));
  swatchWrap.appendChild(s);
  return s;
});

function setTheme(i, fromClick) {
  themeIndex = i;
  petEl.className = THEMES[i]; // 主题类只作用在宠物上
  swatches.forEach((s, j) => s.classList.toggle('active', j === i));
  if (fromClick) burstHearts(3);
}

// 自己随机换色：每隔 6~12 秒（演示页节奏比桌面版快一点，方便访客看到）
function randomThemeShuffle() {
  const delay = 6000 + Math.random() * 6000;
  setTimeout(() => {
    let next = Math.floor(Math.random() * THEMES.length);
    if (next === themeIndex) next = (next + 1) % THEMES.length;
    setTheme(next, false);
    burstHearts(3);
    randomThemeShuffle();
  }, delay);
}

// 启动
setTheme(0, false);
applyState('thinking', '');
ti = 1;
scheduleHeart();
randomThemeShuffle();
