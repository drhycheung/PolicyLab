/* ============================================================
 * 政策数据包 (policies.js)
 * 本文件为「垂直切片」原型，仅含 模组 C（政策分类 + Matland）
 * 与 3 个政策周期。后续扩至全课程时，只需按相同结构追加周期与政策。
 *
 * 字段说明：
 *   id        政策唯一标识
 *   module    所属模组（B/C/D）
 *   level     政策层级（宏观 / 中观 / 微观）
 *   title     政策名称
 *   text      政策说明
 *   cost      财政成本（预留字段，当前未强制扣减）
 *   effects   意图效果：指标 -> 增减值
 *   ambiguity 模糊度 0–1（越高越难界定标准）
 *   conflict  冲突度 0–1（越高越难协调利益）
 *   requires  前置条件（可选）
 *   why       为何如此执行的讲解（用于决策轨迹）
 * ============================================================ */

window.PERIODS = [
  {
    id: 'P1',
    title: '第一期 · 政策分类：建立三层政策体系',
    subtitle: '对应讲义 L07（功能主义 / 冲突理论 / 政策周期）。请从宏观、中观、微观三层面选择本周期推行的政策。',
    scripted: [],
    policies: [
      {
        id: 'rd_tax_credit', module: 'C', level: '中观',
        title: '全国研发税收抵免',
        text: '对符合条件的企业研发投入给予税前扣除，以市场机制激发创新投入。',
        cost: 1,
        effects: { innovation: 2, industry: 1, fiscal: -1 },
        ambiguity: 0.3, conflict: 0.3,
        requires: { fiscal: { min: 3 } },
        why: '标准清晰、利益一致，属行政性执行，接近全额落地；但需财政有余裕方能推行。'
      },
      {
        id: 'carbon_mandate', module: 'C', level: '宏观',
        title: '碳减排强制国家目标',
        text: '设定全国统一的碳排放总量上限与时间表，强制各行业达标。',
        cost: 2,
        effects: { environment: 3, trust: 1, fiscal: -2 },
        ambiguity: 0.7, conflict: 0.8,
        why: '目标宏大但标准与路径模糊、利益高度对立，极易流于象征性执行。'
      },
      {
        id: 'regional_hub', module: 'C', level: '中观',
        title: '区域创新中心试点',
        text: '在若干城市设立创新中心，整合高校、企业与政府资源。',
        cost: 1,
        effects: { innovation: 2, industry: 1 },
        ambiguity: 0.7, conflict: 0.2,
        why: '目标尚可界定、利益较一致，属试验性执行，可部分落地。'
      },
      {
        id: 'sme_digital', module: 'C', level: '微观',
        title: '小微企业数字化补贴',
        text: '向小微企业提供数字化改造的配套资助与技术服务。',
        cost: 1,
        effects: { industry: 1, equity: 1, fiscal: -1 },
        ambiguity: 0.2, conflict: 0.3,
        why: '对象明确、争议小，属行政性执行，可稳定落地。'
      }
    ]
  },

  {
    id: 'P2',
    title: '第二期 · Matland 执行落差',
    subtitle: '对应讲义 L08（模糊—冲突模型）。本期起，政策的「意图效果」将按执行类型打折。试比较不同政策的落地程度。',
    scripted: [
      { text: '财政司公布中期预算案：公共开支收紧，财政可持续 −1。', effects: { fiscal: -1 } }
    ],
    policies: [
      {
        id: 'ai_ethics_review', module: 'C', level: '宏观',
        title: '全国性人工智能伦理强制审查',
        text: '要求所有人工智能系统上线前通过统一的伦理合规审查。',
        cost: 1,
        effects: { privacy: 3, trust: 2, fiscal: -1 },
        ambiguity: 0.8, conflict: 0.9,
        why: '审查标准难以界定、科技企业与公民团体立场尖锐对立，典型象征性执行。'
      },
      {
        id: 'rd_match_subsidy', module: 'C', level: '中观',
        title: '明确标准的研发配套补贴',
        text: '依既定公式对企业研发投入给予比例明确的配套资金。',
        cost: 2,
        effects: { innovation: 2, maturity: 1, fiscal: -2 },
        ambiguity: 0.2, conflict: 0.2,
        why: '标准与流程清晰、各方共识高，属行政性执行，全额落地。'
      },
      {
        id: 'industry_self_reg', module: 'C', level: '中观',
        title: '行业自律监管框架',
        text: '由行业协会牵头制定并监督执行自律规范。',
        cost: 0,
        effects: { trust: 1, privacy: 1 },
        ambiguity: 0.7, conflict: 0.3,
        why: '目标含糊但利益一致，属试验性执行，部分落地。'
      },
      {
        id: 'federal_devolve', module: 'C', level: '宏观',
        title: '联邦式分权规管',
        text: '将政策执行权责下放至地方，中央仅定框架。',
        cost: 0,
        effects: { equity: 1, trust: 1, efficacy: -1 },
        ambiguity: 0.3, conflict: 0.8,
        why: '框架清晰但地方利益对立，属政治性执行，效果需经妥协后打折。'
      }
    ]
  },

  {
    id: 'P3',
    title: '第三期 · 综合权衡与伦理红线',
    subtitle: '预览模组 D（伦理、法律与社会）。在创新油门与伦理刹车之间作出权衡，并呼应课堂「新发展」。',
    scripted: [
      { text: '默茨访华，中德产业与科技合作升温：产业竞争力 +1、公共信任 +1。', effects: { industry: 1, trust: 1 } }
    ],
    policies: [
      {
        id: 'green_tech_fund', module: 'C', level: '中观',
        title: '绿色科技专项基金',
        text: '设立定向基金，支持低碳技术与清洁能源产业化。',
        cost: 2,
        effects: { innovation: 1, environment: 2, fiscal: -2 },
        ambiguity: 0.3, conflict: 0.4,
        why: '方向明确、争议可控，属行政性执行，可稳定落地。'
      },
      {
        id: 'data_localization', module: 'C', level: '宏观',
        title: '数据本地化强制令',
        text: '要求关键数据须存储于境内并接受主权管辖。',
        cost: 1,
        effects: { security: 3, privacy: 1, industry: -1, trust: -1 },
        ambiguity: 0.8, conflict: 0.7,
        why: '标准难定、企业与国际关系利益冲突强烈，易沦为象征性执行。'
      },
      {
        id: 'social_safety_net', module: 'C', level: '微观',
        title: '算法时代社会保障网',
        text: '针对平台经济与自动化就业冲击，完善再分配与保障。',
        cost: 1,
        effects: { equity: 2, trust: 1, fiscal: -1 },
        ambiguity: 0.6, conflict: 0.4,
        why: '目标较含糊但社会共识较高，属试验性执行，部分落地。'
      }
    ]
  }
];
