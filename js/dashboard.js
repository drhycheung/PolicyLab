/* ============================================================
 * 仪表盘渲染 (dashboard.js)
 * 采用政府统计公报式的克制呈现：指标条 + 跨周期迷你趋势线。
 * 零依赖，内联 SVG（与 EnvInfo / EduML 同一思路）。
 * ============================================================ */

const MOD_COLOR = { B: '#2f6da4', C: '#3f7d6e', D: '#9c6b3f' };

function sparkline(series, mod) {
  const W = 120, H = 26, pad = 2;
  const n = series.length;
  if (n === 0) return '';
  const pts = series.map((v, i) => {
    const x = n === 1 ? W / 2 : pad + i * (W - 2 * pad) / (n - 1);
    const y = pad + (1 - v / 10) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="${H}">
    <polyline points="${pts}" fill="none" stroke="${MOD_COLOR[mod]}" stroke-width="1.5" />
  </svg>`;
}

function renderDashboard(container, state, history) {
  const byModule = { B: [], C: [], D: [] };
  INDICATORS.forEach(ind => byModule[ind.module].push(ind));

  let html = '';
  ['B', 'C', 'D'].forEach(m => {
    html += `<div class="module-block">
      <h3 class="module-title">${MODULE_LABEL[m]}</h3>
      <div class="indicator-grid">`;
    byModule[m].forEach(ind => {
      const val = state[ind.id];
      const pct = (val / 10 * 100).toFixed(0);
      const series = history.map(h => h[ind.id]);
      html += `<div class="indicator-card">
        <div class="indicator-head">
          <span class="indicator-label">${ind.label}</span>
          <span class="indicator-value">${val.toFixed(0)}<span class="scale">/10</span></span>
        </div>
        <div class="bar-track"><div class="bar-fill mod-${ind.module}" style="width:${pct}%"></div></div>
        ${sparkline(series, ind.module)}
      </div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}
