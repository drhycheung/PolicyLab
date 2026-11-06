/* ============================================================
 * 应用控制器 (app.js)
 * 负责：随机开局（场景 × 层面）→ 分步决策 → 每步后果说明
 *        → Matland 四象限结局 → 详细复盘 → 导出（MD / JSON / Word）。
 *       状态存 localStorage，刷新不丢，且可复现。
 *
 * 设计取向（贴近《一念之差》Choices）：
 *   - 每一步选择后，立即给出「后果说明」，解释这一决策引发了什么改变；
 *   - 结尾给出详细「复盘」：决策轨迹 + 指标总账 + Matland 归因。
 * ============================================================ */

const SAVE_KEY = 'pua6027-policylab-v3';
const LEVELS = ['macro', 'meso', 'micro'];

let G = null;

/* ---------- 状态构造 ---------- */
function freshState(scenarioId, level) {
  return {
    scenarioId,
    level,
    step: 0,
    pending: null,            // 当前步已选选项的索引
    selections: [],           // 已确认的选项记录（含 indicatorsBefore 快照）
    indicators: { ...BASELINE },
    accum: { sumA: 0, sumC: 0, count: 0 },
    phase: 'intro',           // intro | playing | consequence | done
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
    renderStepper(s.steps.length, G.step, false);
    renderStep(app);
    return;
  }
  if (G.phase === 'consequence') {
    dashCard.hidden = true;
    trailCard.hidden = true;
    renderStepper(getScenario().steps.length, G.step + 1, false);
    renderConsequence(app);
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
    <p class="scenario-instruct">你将作为政策委员会，依次面对 <b>${s.steps.length}</b> 个决策点。在每个决策点，须就「怎么推行、怎么规定」作出选择；每作出一步选择，系统会即时说明这一决策究竟引发了什么改变。最终，你的整体路径会落到 Matland 模糊—冲突模型的某一个象限，并给出完整复盘。</p>
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
    const before = { ...G.indicators };                 // 决策前指标快照
    const rec = applyOption(G.indicators, G.accum, opt, G.level);
    rec.indicatorsBefore = before;                       // 决策前指标快照
    rec.indicatorsAfter = { ...G.indicators };           // 决策后指标快照
    G.selections.push(rec);
    G.pending = null;
    G.phase = 'consequence';                             // 进入「后果说明」
    save();
    render();
  });
  document.getElementById('swapBtn').addEventListener('click', swapGame);
}

/* ---------- 每步后果说明（贴近 Choices 的 renderFeedback） ---------- */
function renderConsequence(app) {
  const s = getScenario();
  const total = s.steps.length;
  const idx = G.selections.length - 1;                  // 刚作出的那一步
  const rec = G.selections[idx];
  const before = rec.indicatorsBefore;
  const after = G.indicators;
  const stepNo = idx + 1;
  const info = matlandInfo(rec.ambiguity, rec.conflict);
  const run = finalResult(G.accum);                     // 累计平均
  const isLast = stepNo >= total;

  const effHtml = Object.entries(rec.effects).map(([k, v]) => {
    const b = before[k], a = after[k];
    return `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} ${b} → ${a}</span>`;
  }).join('');

  const html = `<div class="consequence-card quad-${info.type}">
    <span class="cons-tag">决策点 ${stepNo} · 后果说明</span>
    <h2 class="cons-title">你刚才的选择，带来了这些改变</h2>
    <div class="cons-choice"><span class="cons-k">你的选择：</span>${rec.text}</div>
    <div class="cons-type">本步执行定位：<b>${info.label}</b>（执行系数 ${info.factor}）</div>
    <p class="cons-desc">${info.desc}</p>
    ${effHtml ? `<div class="cons-sub">社会发展指标变化（决策前 → 决策后）</div>
      <div class="cons-effects">${effHtml}</div>` : ''}
    <div class="cons-ac">
      <span>本步模糊度 <b>${rec.ambiguity.toFixed(2)}</b></span>
      <span>本步冲突度 <b>${rec.conflict.toFixed(2)}</b></span>
      <span>累计平均模糊度 <b>${run.avgA.toFixed(2)}</b></span>
      <span>累计平均冲突度 <b>${run.avgC.toFixed(2)}</b></span>
    </div>
    <div class="cons-running">当前整体执行性格：<b>${run.label}</b></div>
    ${rec.rationale ? `<p class="cons-why"><span class="cons-k">解析：</span>${rec.rationale}</p>` : ''}
    <div class="cons-actions">
      <button id="nextBtn" class="btn primary">${isLast ? '查看本局复盘' : '继续下一个决策点'}</button>
    </div>
  </div>`;
  app.innerHTML = html;
  document.getElementById('nextBtn').addEventListener('click', () => {
    G.step += 1;
    if (G.step >= total) G.phase = 'done';
    else G.phase = 'playing';
    save();
    render();
  });
}

/* ---------- 结局 + 详细复盘 ---------- */
function renderDone(app) {
  const s = getScenario();
  const res = finalResult(G.accum);
  renderStepper(s.steps.length, s.steps.length, true);

  let html = `<div class="outcome-card quad-${res.type}">
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
  </div>`;

  /* —— 一、决策轨迹（详细，含每步后果） —— */
  html += `<section class="review-block">
    <h2 class="section-title">一、决策轨迹</h2>`;
  G.selections.forEach((rec, i) => {
    const eff = Object.entries(rec.effects)
      .map(([k, v]) => `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} ${rec.indicatorsBefore[k]} → ${rec.indicatorsAfter[k]}</span>`)
      .join('');
    const info = matlandInfo(rec.ambiguity, rec.conflict);
    html += `<div class="trail-item">
      <div class="trail-item-head">
        <span class="trail-title">决策点 ${i + 1} · ${LEVEL_LABEL[rec.level]}</span>
        <span class="trail-type quad-${info.type}">${info.label}</span>
      </div>
      <p class="trail-choice">${rec.text}</p>
      <div class="trail-metrics">本步模糊度 <b>${rec.ambiguity.toFixed(2)}</b> · 冲突度 <b>${rec.conflict.toFixed(2)}</b> · 执行系数 <b>${info.factor}</b></div>
      <div class="trail-chips">${eff}</div>
      <p class="trail-why">${rec.rationale}</p>
    </div>`;
  });
  html += `</section>`;

  /* —— 二、社会发展指标总账 —— */
  html += `<section class="review-block">
    <h2 class="section-title">二、社会发展指标总账</h2>
    <p class="ledger-note">下表对照每项指标的开局值与终局值，并列出推动其变化的决策点（数值钳制于 0–10）。</p>`;
  ['B', 'C', 'D'].forEach(mod => {
    const rows = INDICATORS.filter(ind => ind.module === mod);
    html += `<div class="ledger-group">
      <div class="dim-group-title">${MODULE_LABEL[mod]}</div>
      <ul class="ledger-rows">`;
    rows.forEach(ind => {
      const init = BASELINE[ind.id];
      const finalV = G.indicators[ind.id];
      const net = finalV - init;
      const movers = G.selections
        .map((r, i) => (r.effects && r.effects[ind.id] !== undefined) ? { step: i + 1, text: r.text, delta: r.effects[ind.id] } : null)
        .filter(Boolean);
      const netCls = net === 0 ? 'flat' : (net > 0 ? 'good' : 'bad');
      html += `<li class="ledger-row">
        <div class="ledger-head">
          <span class="ledger-label">${ind.label}</span>
          <span class="ledger-journey">${init} → ${finalV}</span>
          <span class="ledger-net ${netCls}">${net > 0 ? '+' : ''}${net}</span>
        </div>`;
      if (movers.length) {
        html += `<div class="ledger-moves"><span class="ledger-moves-label">由：</span><ul class="attr-moves">`;
        movers.forEach(m => {
          html += `<li class="attr-move">
            <span class="attr-step">决策点 ${m.step}</span>
            <span class="attr-choice">${m.text}</span>
            <span class="attr-delta ${m.delta >= 0 ? 'good' : 'bad'}">${m.delta > 0 ? '+' : ''}${m.delta}</span>
          </li>`;
        });
        html += `</ul></div>`;
      } else {
        html += `<div class="ledger-moves"><span class="ledger-none">本局未涉及</span></div>`;
      }
      html += `</li>`;
    });
    html += `</ul></div>`;
  });
  html += `</section>`;

  /* —— 三、Matland 复盘（归因） —— */
  html += `<section class="review-block">
    <h2 class="section-title">三、Matland 复盘</h2>
    <p class="debrief-body">${matlandReview(res)}</p>
  </section>`;

  /* —— 导出 —— */
  html += `<div class="done-actions">
    <button id="againBtn" class="btn primary">再来一局（新场景）</button>
  </div>`;

  app.innerHTML = html;
  document.getElementById('againBtn').addEventListener('click', swapGame);

  // 指标简报（仪表盘）仍保留在下方卡片
  document.getElementById('dashCard').hidden = false;
  renderDashboard(document.getElementById('dashboard'), BASELINE, G.indicators);

  // 导出面板
  document.getElementById('trailCard').hidden = false;
  renderExportBox(document.getElementById('trailCard'));
}

/* Matland 归因文本：把结局对回玩家真实走过的决策点（数据全部来自 selections）。 */
function matlandReview(res) {
  let driver = null, maxC = -1;
  G.selections.forEach((r, i) => { if (r.conflict > maxC) { maxC = r.conflict; driver = { i: i + 1, r }; } });
  let txt = `本局平均模糊度 ${res.avgA.toFixed(2)}、平均冲突度 ${res.avgC.toFixed(2)}，依 Matland（1995）模糊—冲突模型，落入「${res.label}」（执行系数 ${res.factor}）。${res.desc}`;
  if (driver) {
    txt += ` 从决策轨迹看，第 ${driver.i} 步「${driver.r.text}」将冲突度推至 ${driver.r.conflict.toFixed(2)}，是整体执行性格的关键推手。`;
  }
  txt += ` 这正印证本课程「知易行难」的核心命题：纸面设计良好的政策，在执行层面往往因标准不清或利益对立而大打折扣。`;
  return txt;
}

/* ---------- 导出面板 ---------- */
function renderExportBox(wrap) {
  const html = `<h2 class="section-title">导出本局复盘</h2>
    <p class="export-note">报告含本局全部决策、每步的指标增减与解析、指标总账与 Matland 复盘，可直接提交或打印。</p>
    <div class="export-actions">
      <button id="expMd" class="btn ghost">下载 Markdown</button>
      <button id="expJson" class="btn ghost">下载 JSON</button>
      <button id="expDocx" class="btn primary">下载 Word 报告（.docx）</button>
    </div>`;
  wrap.innerHTML = html;
  document.getElementById('expMd').addEventListener('click', exportMarkdown);
  document.getElementById('expJson').addEventListener('click', exportJson);
  document.getElementById('expDocx').addEventListener('click', () => {
    try {
      downloadBytes(exportBaseName() + '.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buildDocxBytes());
    } catch (e) {
      showBanner('无法生成 Word 文件：' + e.message, 'error');
    }
  });
}

function exportBaseName() {
  const s = getScenario();
  return 'PUA6027-政策档案-' + s.id + '-' + G.level;
}

function showBanner(msg, kind) {
  let b = document.getElementById('banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'banner';
    b.className = 'banner';
    document.body.appendChild(b);
  }
  b.textContent = msg;
  b.className = 'banner ' + (kind || 'info');
  setTimeout(() => { b.className = 'banner hidden'; }, 3000);
}

/* ---------- 下载（文本 / 二进制） ---------- */
function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function downloadBytes(name, mime, bytes) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Markdown 导出（与 Word 同源：只读真实走过的 selections） ---------- */
function exportMarkdown() {
  const s = getScenario();
  const res = finalResult(G.accum);
  let md = `# PUA6027 政策实验室 · 本局复盘报告\n\n`;
  md += `课程：科技与创新政策（PUA6027）\n`;
  md += `场景：${s.title}（${s.sector}）\n`;
  md += `本局政策层面：${LEVEL_LABEL[G.level]}\n`;
  md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  md += `## 一、政策执行结果（Matland 四象限）\n\n`;
  md += `**${res.label}**　模糊度 ${res.avgA.toFixed(2)} / 冲突度 ${res.avgC.toFixed(2)} / 执行系数 ${res.factor.toFixed(1)}\n\n`;
  md += `${res.desc}\n\n${res.narrative}\n\n`;

  md += `## 二、决策轨迹（按决策点）\n\n`;
  G.selections.forEach((rec, i) => {
    const eff = Object.entries(rec.effects)
      .map(([k, v]) => `${labelOf(k)} ${rec.indicatorsBefore[k]}→${rec.indicatorsAfter[k]}`)
      .join('，');
    const info = matlandInfo(rec.ambiguity, rec.conflict);
    md += `### 决策点 ${i + 1} · ${LEVEL_LABEL[rec.level]}（${info.label}）\n\n`;
    md += `- 选择：${rec.text}\n`;
    md += `- 本步模糊度 ${rec.ambiguity.toFixed(2)} / 冲突度 ${rec.conflict.toFixed(2)} / 执行系数 ${info.factor}\n`;
    md += `- 指标变化：${eff}\n`;
    md += `- 解析：${rec.rationale}\n\n`;
  });

  md += `## 三、社会发展指标总账（开局 → 终局）\n\n`;
  ['B', 'C', 'D'].forEach(mod => {
    INDICATORS.filter(ind => ind.module === mod).forEach(ind => {
      const init = BASELINE[ind.id];
      const finalV = G.indicators[ind.id];
      md += `- **${ind.label}**：${init} → ${finalV}（${finalV - init > 0 ? '+' : ''}${finalV - init}）\n`;
    });
  });
  md += `\n## 四、Matland 复盘\n\n${matlandReview(res)}\n`;
  md += `\n> 本局无任何随机数：结局完全由你的 ${G.selections.length} 个选择决定。\n`;

  download(exportBaseName() + '.md', md, 'text/markdown;charset=utf-8');
}

/* ---------- JSON 导出 ---------- */
function exportJson() {
  const payload = {
    course: '科技与创新政策（PUA6027）',
    scenarioId: G.scenarioId,
    level: G.level,
    generatedAt: new Date().toISOString(),
    result: finalResult(G.accum),
    indicators: G.indicators,
    selections: G.selections.map(r => ({
      text: r.text, level: r.level,
      ambiguity: r.ambiguity, conflict: r.conflict,
      effects: r.effects, indicatorsBefore: r.indicatorsBefore,
      rationale: r.rationale,
    })),
  };
  download(exportBaseName() + '.json', JSON.stringify(payload, null, 2), 'application/json');
}

/* ---------- 启动 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  load();
  if (!G) startNewGame();
  else render();
});
