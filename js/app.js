/* ============================================================
 * 应用控制器 (app.js)
 * 负责：随机开局（场景 × 层面）→ 分步决策 → Matland 四象限结局
 *        → 指标简报 → 导出。状态存 localStorage，刷新不丢，且可复现。
 * ============================================================ */

const SAVE_KEY = 'pua6027-policylab-v2';
const LEVELS = ['macro', 'meso', 'micro'];

let G = null;

/* ---------- 状态构造 ---------- */
function freshState(scenarioId, level) {
  return {
    scenarioId,
    level,
    step: 0,
    pending: null,            // 当前步已选选项的索引
    selections: [],           // 已确认的选项记录
    indicators: { ...BASELINE },
    accum: { sumA: 0, sumC: 0, count: 0 },
    phase: 'intro',           // intro | playing | done
  };
}

function getScenario() {
  return window.SCENARIOS.find(s => s.id === G.scenarioId);
}

function getQueryId() {
  const m = location.search.match(/[?&]s=([^&]+)/);
  return m ? m[1] : null;
}

/* ---------- 持久化 ---------- */
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { G = JSON.parse(raw); return; }
  } catch (e) {}
  G = null;
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
}

/* ---------- 开局 ---------- */
function startNewGame(scenarioId, level) {
  const sid = scenarioId || (getQueryId() || randomScenarioId());
  const lvl = level || LEVELS[Math.floor(Math.random() * LEVELS.length)];
  G = freshState(sid, lvl);
  G.phase = 'intro';
  save();
  render();
}

function randomScenarioId() {
  return window.SCENARIOS[Math.floor(Math.random() * window.SCENARIOS.length)].id;
}

/* 换一个「局」：场景与层面都重新随机（保证不同局有不同层面）。 */
function swapGame() {
  let sPool = window.SCENARIOS.filter(s => s.id !== (G && G.scenarioId));
  if (!sPool.length) sPool = window.SCENARIOS;
  const sid = sPool[Math.floor(Math.random() * sPool.length)].id;
  let lPool = LEVELS.filter(l => l !== (G && G.level));
  if (!lPool.length) lPool = LEVELS;
  const lvl = lPool[Math.floor(Math.random() * lPool.length)];
  startNewGame(sid, lvl);
}

/* ---------- 主渲染 ---------- */
function render() {
  const app = document.getElementById('app');
  const stepper = document.getElementById('stepper');
  const dashCard = document.getElementById('dashCard');
  const trailCard = document.getElementById('trailCard');

  if (!G || G.phase === 'intro') {
    stepper.hidden = true;
    dashCard.hidden = true;
    trailCard.hidden = true;
    renderIntro(app);
    return;
  }
  if (G.phase === 'playing') {
    dashCard.hidden = true;
    trailCard.hidden = true;
    renderStep(app);
    return;
  }
  // done
  renderDone(app);
}

function renderStepper(total, current, doneAll) {
  const wrap = document.getElementById('stepper');
  wrap.hidden = false;
  let html = '';
  for (let i = 0; i < total; i++) {
    const cls = doneAll ? 'done' : (i < current ? 'done' : (i === current ? 'active' : ''));
    html += `<div class="step ${cls}"><span class="step-no">${i + 1}</span><span class="step-label">决策点</span></div>`;
  }
  wrap.innerHTML = html;
}

/* ---------- 开场：场景卡 ---------- */
function renderIntro(app) {
  const s = getScenario();
  const html = `<div class="scenario-card">
    <div class="scenario-tag">政策难题场景</div>
    <h2 class="scenario-title">${s.title}</h2>
    <div class="scenario-meta">
      <span>领域：${s.sector}</span>
      <span>紧迫性：${s.urgency || '—'}</span>
    </div>
    <p class="scenario-brief">${s.brief}</p>
    <div class="scenario-stake">
      <span class="stake-label">利益相关方：</span>
      ${(s.stakeholders || []).map(x => `<span class="stake-chip">${x}</span>`).join('')}
    </div>
    <div class="level-banner">
      <span class="level-tag level-${G.level}">${LEVEL_LABEL[G.level]}</span>
      <span class="level-note">本局你将以这一层面的政策主体身份进行治理。</span>
    </div>
    <p class="scenario-instruct">你将作为政策委员会，依次面对 <b>${s.steps.length}</b> 个决策点。在每个决策点，须就「怎么推行、怎么规定」作出选择。最终，你的整体路径会落到 Matland 模糊—冲突模型的某一个象限，揭示这项政策究竟如何被执行。</p>
    <div class="intro-actions">
      <button id="startBtn" class="btn primary">开始治理</button>
      <button id="swapBtn" class="btn ghost">换一个场景</button>
    </div>
  </div>`;
  app.innerHTML = html;
  document.getElementById('startBtn').addEventListener('click', () => {
    G.phase = 'playing'; G.step = 0; G.pending = null; save(); render();
  });
  document.getElementById('swapBtn').addEventListener('click', swapGame);
}

/* ---------- 分步决策 ---------- */
function renderStep(app) {
  const s = getScenario();
  const total = s.steps.length;
  const stepData = s.steps[G.step];
  renderStepper(total, G.step, false);

  let html = `<h2 class="section-title">决策点 ${G.step + 1} / ${total}</h2>`;
  html += `<p class="step-prompt">${stepData.prompt}</p>`;
  if (stepData.hint) html += `<p class="step-hint">${stepData.hint}</p>`;
  html += `<div class="level-banner static">
      <span class="level-tag level-${G.level}">${LEVEL_LABEL[G.level]}</span>
      <span class="level-note">本决策点在此层面下作出。</span>
    </div>`;
  html += `<div class="option-list">`;
  stepData.options.forEach((opt, idx) => {
    const sel = G.pending === idx;
    html += `<button class="option-card ${sel ? 'selected' : ''}" data-idx="${idx}">
      <p class="option-text">${opt.text}</p>
      <div class="option-rationale" ${sel ? '' : 'hidden'}>${opt.rationale}</div>
    </button>`;
  });
  html += `</div>`;
  html += `<div class="step-actions">
      <button id="confirmBtn" class="btn primary" ${G.pending === null ? 'disabled' : ''}>确认此步</button>
      <button id="swapBtn" class="btn ghost">换一个场景</button>
    </div>`;
  app.innerHTML = html;

  const cards = app.querySelectorAll('.option-card');
  cards.forEach(btn => {
    btn.addEventListener('click', () => {
      G.pending = parseInt(btn.dataset.idx, 10);
      save();
      cards.forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.option-rationale').hidden = true;
      });
      btn.classList.add('selected');
      btn.querySelector('.option-rationale').hidden = false;
      document.getElementById('confirmBtn').disabled = false;
    });
  });
  document.getElementById('confirmBtn').addEventListener('click', () => {
    if (G.pending === null) return;
    const opt = stepData.options[G.pending];
    const rec = applyOption(G.indicators, G.accum, opt, G.level);
    G.selections.push(rec);
    G.pending = null;
    G.step += 1;
    if (G.step >= total) G.phase = 'done';
    save();
    render();
  });
  document.getElementById('swapBtn').addEventListener('click', swapGame);
}

/* ---------- 结局：Matland 四象限 + 简报 ---------- */
function renderDone(app) {
  const s = getScenario();
  const res = finalResult(G.accum);
  renderStepper(s.steps.length, s.steps.length, true);

  const html = `<div class="outcome-card quad-${res.type}">
    <div class="outcome-head">
      <span class="outcome-tag">政策执行结果 · Matland 四象限</span>
      <h2 class="outcome-title">${res.label}</h2>
    </div>
    <p class="outcome-desc">${res.desc}</p>
    <p class="outcome-narr">${res.narrative}</p>
    <div class="outcome-metrics">
      <span>平均模糊度 <b>${res.avgA.toFixed(2)}</b></span>
      <span>平均冲突度 <b>${res.avgC.toFixed(2)}</b></span>
      <span>执行系数 <b>${res.factor.toFixed(1)}</b></span>
    </div>
  </div>
  <div class="done-actions">
    <button id="againBtn" class="btn primary">再来一局（新场景）</button>
  </div>`;
  app.innerHTML = html;
  document.getElementById('againBtn').addEventListener('click', swapGame);

  // 指标简报
  document.getElementById('dashCard').hidden = false;
  renderDashboard(document.getElementById('dashboard'), BASELINE, G.indicators);

  // 决策轨迹 + 导出
  document.getElementById('trailCard').hidden = false;
  renderTrail(document.getElementById('trailCard'));
}

/* ---------- 决策轨迹 ---------- */
function renderTrail(wrap) {
  let html = '<h2 class="section-title">决策轨迹</h2>';
  G.selections.forEach((rec, i) => {
    const eff = Object.entries(rec.effects)
      .map(([k, v]) => `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} ${v > 0 ? '+' : ''}${v}</span>`)
      .join('');
    html += `<div class="trail-item">
      <div class="trail-item-head">
        <span class="trail-title">决策点 ${i + 1} · ${LEVEL_LABEL[rec.level]}</span>
      </div>
      <p class="trail-choice">${rec.text}</p>
      <div class="trail-metrics">本步模糊度 <b>${rec.ambiguity.toFixed(2)}</b> · 冲突度 <b>${rec.conflict.toFixed(2)}</b></div>
      <div class="trail-chips">${eff}</div>
      <p class="trail-why">${rec.rationale}</p>
    </div>`;
  });
  html += `<div class="export-actions">
    <button id="expMd" class="btn ghost">导出 Markdown</button>
    <button id="expJson" class="btn ghost">导出 JSON</button>
  </div>`;
  wrap.innerHTML = html;
  document.getElementById('expMd').addEventListener('click', exportMarkdown);
  document.getElementById('expJson').addEventListener('click', exportJson);
}

/* ---------- 导出 ---------- */
function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function exportMarkdown() {
  const s = getScenario();
  const res = finalResult(G.accum);
  let md = `# PUA6027 政策实验室 · 政策档案\n\n`;
  md += `课程：科技、创新与政策（PUA6027）\n`;
  md += `场景：${s.title}（${s.sector}）\n`;
  md += `本局政策层面：${LEVEL_LABEL[G.level]}\n`;
  md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `## 一、政策执行结果（Matland 四象限）\n\n`;
  md += `**${res.label}**　模糊度 ${res.avgA.toFixed(2)} / 冲突度 ${res.avgC.toFixed(2)} / 执行系数 ${res.factor.toFixed(1)}\n\n`;
  md += `${res.desc}\n\n${res.narrative}\n\n`;
  md += `## 二、决策轨迹（按决策点）\n\n`;
  G.selections.forEach((rec, i) => {
    const eff = Object.entries(rec.effects)
      .map(([k, v]) => `${labelOf(k)} ${v > 0 ? '+' : ''}${v}`).join('，');
    md += `### 决策点 ${i + 1} · ${LEVEL_LABEL[rec.level]}\n\n`;
    md += `- 选择：${rec.text}\n`;
    md += `- 本步模糊度 ${rec.ambiguity.toFixed(2)} / 冲突度 ${rec.conflict.toFixed(2)}\n`;
    md += `- 指标影响：${eff}\n`;
    md += `- 解析：${rec.rationale}\n\n`;
  });
  md += `## 三、社会发展指标（终值 / 10）\n\n`;
  INDICATORS.forEach(ind => { md += `- **${ind.label}**：${G.indicators[ind.id]}\n`; });
  download(`${s.id}-${G.level}-政策档案.md`, md, 'text/markdown;charset=utf-8');
}

function exportJson() {
  const payload = {
    course: 'PUA6027 政策实验室',
    scenarioId: G.scenarioId,
    level: G.level,
    generatedAt: new Date().toISOString(),
    result: finalResult(G.accum),
    indicators: G.indicators,
    selections: G.selections,
  };
  download('政策档案.json', JSON.stringify(payload, null, 2), 'application/json');
}

/* ---------- 启动 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  load();
  if (!G) startNewGame();
  else render();
});
