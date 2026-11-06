/* ============================================================
 * 应用控制器 (app.js)
 * 负责状态持久化、周期推进、界面渲染与导出。
 * 状态保存在 localStorage，刷新不丢失，且确定性可复现。
 * ============================================================ */

const SAVE_KEY = 'pua6027-policylab-v1';
let G = { state: null, history: null, period: 0, log: [] };

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { G = JSON.parse(raw); return; }
  } catch (e) {}
  G = { state: { ...BASELINE }, history: [{ ...BASELINE }], period: 0, log: [] };
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
}
function currentPeriod() { return window.PERIODS[G.period]; }

/* ---------- 渲染主入口 ---------- */
function render() {
  renderStepper();
  renderMechanism();
  renderDashboard(document.getElementById('dashboard'), G.state, G.history);
  renderPeriodPanel();
  renderTrail();
  renderVerdictIfDone();
}

function renderStepper() {
  const wrap = document.getElementById('stepper');
  const total = window.PERIODS.length;
  let html = '';
  for (let i = 0; i < total; i++) {
    const p = window.PERIODS[i];
    const cls = i < G.period ? 'done' : (i === G.period ? 'active' : '');
    html += `<div class="step ${cls}"><span class="step-no">${i + 1}</span><span class="step-label">${p.id}</span></div>`;
  }
  wrap.innerHTML = html;
}

function renderMechanism() {
  const wrap = document.getElementById('mechanism');
  let html = '<h2 class="section-title">执行机制 · Matland 模糊—冲突模型</h2><div class="ml-grid">';
  ['administrative', 'political', 'experimental', 'symbolic'].forEach(t => {
    const m = MATLAND[t];
    html += `<div class="ml-cell">
      <div class="ml-cell-head"><span class="ml-name">${m.label}</span><span class="ml-fac">系数 ${m.factor}</span></div>
      <p class="ml-desc">${m.desc}</p></div>`;
  });
  html += `</div><p class="ml-foot">系数的含义：政策的「意图效果」乘以该系数，得到实际落到指标上的「执行效果」。模糊度与冲突度越高，执行越接近象征性——这正是本课程「知易行难」的核心理念。</p>`;
  wrap.innerHTML = html;
}

function renderPeriodPanel() {
  const wrap = document.getElementById('period');
  const p = currentPeriod();
  if (!p) {
    wrap.innerHTML = '<div class="empty">本课程周期已全部结束。可在下方决策轨迹中导出政策档案。</div>';
    return;
  }
  let html = `<div class="period-head"><h2>${p.title}</h2><p class="period-sub">${p.subtitle || ''}</p></div>`;
  if (p.scripted && p.scripted.length) {
    html += `<div class="event-banner"><span class="event-tag">本期新发展</span>${p.scripted.map(e => e.text).join('；')}</div>`;
  }
  html += '<div class="policy-list">';
  p.policies.forEach(pol => {
    const avail = policyAvailable(G.state, pol);
    const type = matlandType(pol.ambiguity, pol.conflict);
    const effChips = Object.entries(pol.effects).map(([k, v]) => {
      const sign = v > 0 ? '+' : '';
      return `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} ${sign}${v}</span>`;
    }).join('');
    html += `<label class="policy-card ${avail.ok ? '' : 'disabled'}" data-id="${pol.id}">
      <div class="policy-top">
        <input type="checkbox" class="pol-check" value="${pol.id}" ${avail.ok ? '' : 'disabled'}>
        <div class="policy-meta">
          <span class="policy-title">${pol.title}</span>
          <span class="level-tag">${pol.level}</span>
        </div>
      </div>
      <p class="policy-text">${pol.text}</p>
      <div class="policy-effects">${effChips}</div>
      <div class="matland-preview mod-${pol.module}">
        <span class="ml-label">预期执行</span>
        <span class="ml-type">${MATLAND[type].label}</span>
        <span class="ml-factor">系数 ${MATLAND[type].factor}</span>
      </div>
      ${avail.ok ? '' : `<div class="policy-warn">⚠ ${avail.reason}</div>`}
    </label>`;
  });
  html += '</div>';
  html += `<div class="period-actions">
      <button id="submitBtn" class="btn primary">提交本期决策</button>
      <button id="resetBtn" class="btn ghost">重置课程</button>
    </div>`;
  wrap.innerHTML = html;
  document.getElementById('submitBtn').addEventListener('click', onSubmit);
  document.getElementById('resetBtn').addEventListener('click', onReset);
}

function onSubmit() {
  const p = currentPeriod();
  const checks = [...document.querySelectorAll('.pol-check:checked')];
  if (checks.length === 0) { alert('请至少选择一项政策。'); return; }
  const selected = checks.map(c => p.policies.find(x => x.id === c.value));
  const blocked = selected.filter(s => !policyAvailable(G.state, s).ok);
  if (blocked.length) {
    alert('有政策当前不满足前置条件：' + blocked.map(b => b.title).join('、'));
    return;
  }
  const { newState, trail, eventLog } = resolvePeriod(G.state, selected, p.scripted);
  G.state = newState;
  G.history.push({ ...newState });
  G.log.push({ period: p.id, title: p.title, eventLog, trail });
  G.period += 1;
  save();
  render();
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

function renderTrail() {
  const wrap = document.getElementById('trail');
  if (!G.log.length) {
    wrap.innerHTML = '<h2 class="section-title">决策轨迹</h2><p class="muted">尚未作出任何决策。</p>';
    return;
  }
  let html = '<h2 class="section-title">决策轨迹</h2>';
  G.log.forEach(entry => {
    html += `<div class="trail-period"><h3>${entry.title}</h3>`;
    if (entry.eventLog.length) {
      html += '<div class="trail-events">' +
        entry.eventLog.map(e => `<span class="event-note">新发展：${e.text}</span>`).join('') + '</div>';
    }
    entry.trail.forEach(rec => {
      const intChips = Object.entries(rec.intended).map(([k, v]) => {
        const sign = v > 0 ? '+' : '';
        return `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} 意图${sign}${v}</span>`;
      }).join('');
      const impChips = Object.entries(rec.implemented).map(([k, v]) => {
        const sign = v > 0 ? '+' : '';
        return `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${labelOf(k)} 实际${sign}${v}</span>`;
      }).join('');
      html += `<div class="trail-item">
        <div class="trail-item-head">
          <span class="trail-title">${rec.title}</span>
          <span class="ml-badge mod-${rec.module}">${MATLAND[rec.type].label} · 系数${rec.factor}</span>
        </div>
        <div class="trail-chips">${intChips}</div>
        <div class="trail-chips">${impChips}</div>
        <p class="trail-why">${rec.why}</p>
      </div>`;
    });
    html += '</div>';
  });
  html += `<div class="export-actions">
    <button id="expMd" class="btn ghost">导出 Markdown</button>
    <button id="expJson" class="btn ghost">导出 JSON</button>
  </div>`;
  wrap.innerHTML = html;
  document.getElementById('expMd').addEventListener('click', exportMarkdown);
  document.getElementById('expJson').addEventListener('click', exportJson);
}

function renderVerdictIfDone() {
  const wrap = document.getElementById('verdict');
  if (G.period < window.PERIODS.length) { wrap.innerHTML = ''; return; }
  const v = verdict(G.state);
  wrap.innerHTML = `<div class="verdict-card" style="border-left-color:${v.color}">
    <div class="verdict-grade" style="color:${v.color}">期末评估：${v.grade}</div>
    <p class="verdict-note">${v.note}</p>
  </div>`;
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
  let md = `# PUA6027 政策实验室 · 政策档案\n\n`;
  md += `课程：科技、创新与政策（PUA6027）\n`;
  md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `## 一、期末指标状况\n\n`;
  INDICATORS.forEach(ind => { md += `- **${ind.label}**：${G.state[ind.id]}/10\n`; });
  md += `\n## 二、决策轨迹（按周期）\n\n`;
  G.log.forEach(entry => {
    md += `### ${entry.title}\n\n`;
    entry.eventLog.forEach(e => { md += `> 新发展：${e.text}\n\n`; });
    entry.trail.forEach(rec => {
      const ints = Object.entries(rec.intended).map(([k, v]) => `${labelOf(k)} ${v > 0 ? '+' : ''}${v}`).join('，');
      const imps = Object.entries(rec.implemented).map(([k, v]) => `${labelOf(k)} ${v > 0 ? '+' : ''}${v}`).join('，');
      md += `- **${rec.title}**〔${MATLAND[rec.type].label}，系数${rec.factor}〕\n  - 意图：${ints}\n  - 实际：${imps}\n  - ${rec.why}\n`;
    });
    md += `\n`;
  });
  const v = verdict(G.state);
  md += `## 三、期末评估\n\n**${v.grade}**：${v.note}\n`;
  download(`${v.grade}-政策档案.md`, md, 'text/markdown;charset=utf-8');
}

function exportJson() {
  const payload = {
    course: 'PUA6027 政策实验室',
    generatedAt: new Date().toISOString(),
    finalState: G.state,
    verdict: verdict(G.state),
    log: G.log,
  };
  download('政策档案.json', JSON.stringify(payload, null, 2), 'application/json');
}

function onReset() {
  if (!confirm('确定要重置整个课程？所有决策轨迹将被清空。')) return;
  localStorage.removeItem(SAVE_KEY);
  G = { state: { ...BASELINE }, history: [{ ...BASELINE }], period: 0, log: [] };
  save();
  render();
}

window.addEventListener('DOMContentLoaded', () => { load(); render(); });
