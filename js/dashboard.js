/* ============================================================
 * 仪表盘渲染 (dashboard.js)
 * 政府统计公报式的克制呈现：指标条（终值）+ 较基线的变化。
 * 零依赖，纯 DOM（与 EnvInfo / EduML 同一思路）。
 * 新版改为「政策影响简报」：对照初始基线展示本局决策后的指标状态。
 * ============================================================ */

const MOD_COLOR = { B: '#2f6da4', C: '#3f7d6e', D: '#9c6b3f' };

function renderDashboard(container, baseline, finalState) {
  const byModule = { B: [], C: [], D: [] };
  INDICATORS.forEach(ind => byModule[ind.module].push(ind));

  let html = '';
  ['B', 'C', 'D'].forEach(m => {
    html += `<div class="module-block">
      <h3 class="module-title">${MODULE_LABEL[m]}</h3>
      <div class="indicator-grid">`;
    byModule[m].forEach(ind => {
      const val = finalState[ind.id];
      const base = baseline[ind.id];
      const pct = (val / 10 * 100).toFixed(0);
      const delta = val - base;
      const dCls = delta > 0 ? 'pos' : (delta < 0 ? 'neg' : 'flat');
      const dTxt = delta > 0 ? `+${delta}` : `${delta}`;
      html += `<div class="indicator-card">
        <div class="indicator-head">
          <span class="indicator-label">${ind.label}</span>
          <span class="indicator-value">${val}<span class="scale">/10</span></span>
        </div>
        <div class="bar-track"><div class="bar-fill mod-${ind.module}" style="width:${pct}%"></div></div>
        <div class="indicator-delta ${dCls}">较基线 ${dTxt}</div>
      </div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}
