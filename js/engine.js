/* ============================================================
 * PUA6027 政策实验室 · 核心引擎 (engine.js)
 * 设计原则（沿用 Choices / EduML 的纪律）：
 *   - 纯前端、无构建、无后端、可离线、可复现（核心逻辑不放随机数）
 *   - 引擎只读数据，不写死逻辑；新增课程场景只需加 JSON
 *   - 所有指标钳制在 0–10；模糊度 / 冲突度钳制在 0–1
 *
 * 本版架构（对应《一念之差》的「情境驱动」骨架）：
 *   ① 随机政策难题场景  ×  ② 政策层面（宏观/中观/微观）
 *   ×  ③ 分步决策（怎么推行 / 怎么规定）
 *   → ④ Matland 模糊—冲突四象限（四个不同的结果）
 * ============================================================ */

/* ---------- 1. 指标表：直接对应三大模组（结局里的「政策影响简报」） ---------- */
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

/* ---------- 2. 初始基线：模拟经济体的起始状态 ---------- */
const BASELINE = {
  innovation: 5, industry: 5, maturity: 5,
  fiscal: 6, efficacy: 5, coverage: 4,
  trust: 6, equity: 5, privacy: 7, security: 6, environment: 5,
};

/* ---------- 3. Matland (1995) 模糊—冲突二维执行模型 ---------- */
/* 这是整门课的「灵魂机制」：意图效果 ≠ 执行效果，
   落差由 模糊度(ambiguity) × 冲突度(conflict) 决定。
   最终落点即「四个不同的结果」。 */
const MATLAND = {
  administrative: {
    key: 'administrative', label: '行政性执行', factor: 1.0,
    desc: '低模糊、低冲突：标准清晰、利益一致，政策接近全额落地。',
    narrative: '你的治理路径以清晰的标准与一致的共识推进，政策得以稳健落地——这是执行层面最理想的情形。'
  },
  political: {
    key: 'political', label: '政治性执行', factor: 0.6,
    desc: '低模糊、高冲突：标准清晰但利益对立，需政治妥协，效果明显打折。',
    narrative: '你的规则写得清楚，却卡在各方利益的拉扯上；政策经妥协后落地，但力度已被削弱。'
  },
  experimental: {
    key: 'experimental', label: '试验性执行', factor: 0.7,
    desc: '高模糊、低冲突：目标含糊但利益一致，边做边试，部分落地。',
    narrative: '方向上有共识，但标准与路径尚不清晰；政策以试点、摸索的方式部分推进。'
  },
  symbolic: {
    key: 'symbolic', label: '象征性执行', factor: 0.2,
    desc: '高模糊、高冲突：标准未定且利益对立，多流于口号与象征，几乎不落地。',
    narrative: '标准难定、立场尖锐对立，政令频出却难以真正落地——这正是「知易行难」的典型写照。'
  },
};

/* ---------- 4. 政策层面（混合政策周期理论 · Vidovich 2007）---------- */
/* 宏观 / 中观 / 微观 各自给模糊度、冲突度一个「基线」，
   玩家在本步的选择再叠加增量。同一难题在不同层面，政策命运根本不同。 */
/* 注：每局固定一个层面（宏观 / 中观 / 微观），不同局各有不同层面。
   基线设在 0.5 阈值附近，使玩家的「推行方式」选择仍能跨象限摆动，
   但层面本身已框定政策的典型执行性格。 */
const LEVEL_BASE = {
  macro: { a: 0.55, c: 0.55 },  // 中央政府：原则强、利益多元 → 高模糊高冲突的倾向
  meso:  { a: 0.45, c: 0.50 },  // 地方政府：承上启下 → 翻译层，临近阈值
  micro: { a: 0.40, c: 0.55 },  // 企业层面：规则明确 → 低模糊；与监管对立 → 高冲突
};
const LEVEL_LABEL = {
  macro: '宏观 · 中央政府',
  meso:  '中观 · 地方政府',
  micro: '微观 · 企业层面',
};

/* ---------- 5. 工具函数 ---------- */
function clamp(v) { return Math.max(0, Math.min(10, v)); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function labelOf(id) {
  const ind = INDICATORS.find(i => i.id === id);
  return ind ? ind.label : id;
}

// 以 0.5 为阈值划分四象限（与 L08 课件二维表一致）
function matlandType(ambiguity, conflict) {
  const hi_a = ambiguity >= 0.5, hi_c = conflict >= 0.5;
  if (!hi_a && !hi_c) return 'administrative';
  if (!hi_a && hi_c)  return 'political';
  if (hi_a && !hi_c)  return 'experimental';
  return 'symbolic';
}

/* 应用一个选项：返回本步记录，并就地更新 indicators 与累加器。
   本步模糊度 = 本局固定层面基线 + 选项增量（钳制 0–1）。
   关键机制：本步按其 Matland 执行系数「打折」后再落到指标——
   意图效果（intended）≠ 实际落地（effects），落差即「知易行难」。
   level 为本局固定层面，由调用方传入。 */
function applyOption(indicators, accum, option, level) {
  const base = LEVEL_BASE[level] || LEVEL_BASE.meso;
  const a = clamp01(base.a + (option.ambiguityDelta || 0));
  const c = clamp01(base.c + (option.conflictDelta || 0));
  const type = matlandType(a, c);
  const factor = MATLAND[type].factor;       // 本步执行系数
  const eff = {};        // 实际落地（已乘执行系数，钳制 0–10）
  const intended = {};   // 设计预期（未打折，用于「预期 → 实际」对照）
  for (const [k, v] of Object.entries(option.effects || {})) {
    const dv = Math.round(v * factor);
    indicators[k] = clamp(indicators[k] + dv);
    eff[k] = dv;
    intended[k] = v;
  }
  accum.sumA += a; accum.sumC += c; accum.count += 1;
  return {
    text: option.text, level: level,
    ambiguity: a, conflict: c, type, factor,
    intended, effects: eff, rationale: option.rationale || '',
  };
}

/* 汇总玩家的整体路径：取各步模糊度 / 冲突度的均值，落到 Matland 象限。 */
function finalResult(accum) {
  const avgA = accum.count ? accum.sumA / accum.count : 0;
  const avgC = accum.count ? accum.sumC / accum.count : 0;
  const type = matlandType(avgA, avgC);
  return Object.assign({ type, avgA, avgC }, MATLAND[type]);
}

/* 单步定位：由本步的模糊度 / 冲突度直接得到 Matland 执行类型。
   用于「每步后果说明」面板，向学生即时展示这一步把政策推向了哪种执行性格。 */
function matlandInfo(ambiguity, conflict) {
  const type = matlandType(ambiguity, conflict);
  return Object.assign({ type, ambiguity, conflict }, MATLAND[type]);
}

/* 随机选取场景；可传 id 以固定场景（便于课堂复现）。 */
function pickScenario(id) {
  if (id) {
    const found = window.SCENARIOS.find(s => s.id === id);
    if (found) return found;
  }
  const i = Math.floor(Math.random() * window.SCENARIOS.length);
  return window.SCENARIOS[i];
}
