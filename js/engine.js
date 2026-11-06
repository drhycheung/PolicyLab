/* ============================================================
 * PUA6027 政策实验室 · 核心引擎 (engine.js)
 * 设计原则（沿用 Choices / EduML 的纪律）：
 *   - 纯前端、无构建、无后端、可离线、可复现（不放随机数）
 *   - 引擎只读数据，不写死逻辑；加新课程政策只需加 JSON
 *   - 所有指标钳制在 0–10
 * ============================================================ */

/* ---------- 1. 指标表：直接对应三大模组 ---------- */
const INDICATORS = [
  // 模组 B 科技创业与创新
  { id: 'innovation', label: '创新活力',     module: 'B' },
  { id: 'industry',   label: '产业竞争力',   module: 'B' },
  { id: 'maturity',   label: '技术成熟度',   module: 'B' },
  // 模组 C 科技创新政策
  { id: 'fiscal',     label: '财政可持续',   module: 'C' },
  { id: 'efficacy',   label: '执行效能',     module: 'C' },
  { id: 'coverage',   label: '宏观中观微观覆盖', module: 'C' },
  // 模组 D 伦理法律社会
  { id: 'trust',      label: '公共信任',     module: 'D' },
  { id: 'equity',     label: '社会公平',     module: 'D' },
  { id: 'privacy',    label: '隐私安全',     module: 'D' },
  { id: 'security',   label: '国家安全',     module: 'D' },
  { id: 'environment',label: '环境可持续',   module: 'D' },
];

const MODULE_LABEL = {
  B: '模组 B · 科技创业与创新',
  C: '模组 C · 科技创新政策',
  D: '模组 D · 伦理、法律与社会',
};

/* ---------- 2. 初始基线：学期开始的模拟经济体 ---------- */
const BASELINE = {
  innovation: 5, industry: 5, maturity: 5,
  fiscal: 6, efficacy: 5, coverage: 4,
  trust: 6, equity: 5, privacy: 7, security: 6, environment: 5,
};

/* ---------- 3. Matland (1995) 模糊—冲突二维执行模型 ---------- */
/* 这是整门课的「灵魂机制」：意图效果 ≠ 执行效果，
   落差由 模糊度(ambiguity) × 冲突度(conflict) 决定。 */
const MATLAND = {
  administrative: { label: '行政性执行', factor: 1.0,
    desc: '低模糊、低冲突：标准清晰、利益一致，政策接近全额落地。' },
  political:      { label: '政治性执行', factor: 0.6,
    desc: '低模糊、高冲突：标准清晰但利益对立，需政治妥协，效果明显打折。' },
  experimental:   { label: '试验性执行', factor: 0.7,
    desc: '高模糊、低冲突：目标含糊但利益一致，边做边试，部分落地。' },
  symbolic:       { label: '象征性执行', factor: 0.2,
    desc: '高模糊、高冲突：标准未定且利益对立，多流于口号与象征，几乎不落地。' },
};

// 以 0.5 为阈值划分四象限（与 L08 课件二维表一致）
function matlandType(ambiguity, conflict) {
  const a = ambiguity >= 0.5, c = conflict >= 0.5;
  if (!a && !c) return 'administrative';
  if (!a && c)  return 'political';
  if (a && !c)  return 'experimental';
  return 'symbolic';
}

/* ---------- 4. 工具函数 ---------- */
function clamp(v) { return Math.max(0, Math.min(10, v)); }

function labelOf(id) {
  const ind = INDICATORS.find(i => i.id === id);
  return ind ? ind.label : id;
}

/* 计算单条政策的「执行记录」：意图 vs 实际 */
function applyPolicy(state, policy) {
  const type = matlandType(policy.ambiguity, policy.conflict);
  const factor = MATLAND[type].factor;
  const implemented = {};
  for (const [k, v] of Object.entries(policy.effects)) {
    implemented[k] = Math.round(v * factor);
  }
  return {
    id: policy.id, title: policy.title, module: policy.module, level: policy.level,
    ambiguity: policy.ambiguity, conflict: policy.conflict,
    type, factor,
    intended: { ...policy.effects },
    implemented,
    cost: policy.cost || 0,
    why: policy.why || '',
  };
}

/* 检查政策的前置条件（如财政须 ≥ 某值） */
function policyAvailable(state, policy) {
  if (!policy.requires) return { ok: true, reason: '' };
  for (const [k, cond] of Object.entries(policy.requires)) {
    if (cond.min !== undefined && state[k] < cond.min)
      return { ok: false, reason: `需「${labelOf(k)}」≥ ${cond.min}（当前 ${state[k]}）` };
    if (cond.max !== undefined && state[k] > cond.max)
      return { ok: false, reason: `需「${labelOf(k)}」≤ ${cond.max}（当前 ${state[k]}）` };
  }
  return { ok: true, reason: '' };
}

/* ---------- 5. 周期结算（确定性 / 可复现） ---------- */
/* 先应用本周期「新发展」脚本事件，再叠加所选政策的执行效果。 */
function resolvePeriod(state, selectedPolicies, scriptedEvents) {
  let next = { ...state };
  const eventLog = [];
  (scriptedEvents || []).forEach(ev => {
    for (const [k, v] of Object.entries(ev.effects)) next[k] = clamp(next[k] + v);
    eventLog.push(ev);
  });
  const trail = [];
  selectedPolicies.forEach(p => {
    const rec = applyPolicy(next, p);
    for (const [k, v] of Object.entries(rec.implemented)) next[k] = clamp(next[k] + v);
    trail.push(rec);
  });
  return { newState: next, trail, eventLog };
}

/* ---------- 6. 期末结果档位（呼应 Choices 的结局档位） ---------- */
function verdict(state) {
  if (state.fiscal <= 2)
    return { grade: '财政透支', color: '#b23b3b',
      note: '连年赤字拖垮财政，后续政策失去施展空间，创新与治理难以为继。' };
  if (state.trust <= 2)
    return { grade: '信任崩塌', color: '#b23b3b',
      note: '公共政策失去社会信任，任何改革都难以推进。' };
  if (state.environment <= 2)
    return { grade: '环境失序', color: '#b23b3b',
      note: '环境指标跌破临界，可持续发展目标难以达成。' };
  if (state.equity <= 2)
    return { grade: '公平失衡', color: '#b23b3b',
      note: '社会公平严重受损，政策的合法性与社会接受度受到挑战。' };
  if (state.environment >= 8 && state.innovation >= 7)
    return { grade: '可持续成功', color: '#2e7d52',
      note: '创新与绿色转型协同推进，经济体走上科技—创新—政策的良性循环。' };
  if (state.innovation >= 7 && state.industry >= 7)
    return { grade: '创新领先', color: '#2e7d52',
      note: '科技与产业竞争力突出，但须留意社会公平与环境的平衡。' };
  return { grade: '平稳过渡', color: '#16335b',
    note: '各项指标维持在中位区间，未出现明显失衡，亦无突出突破。' };
}
