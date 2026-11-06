/* ============================================================
 * 政策场景数据包 (scenarios.js)
 * 垂直切片原型：含 3 个通用政策难题，各 3 个决策点。
 * 后续扩充只需按相同结构追加场景；每局开局随机抽「场景 × 层面」。
 *
 * 字段说明：
 *   id          场景唯一标识
 *   title       政策难题名称
 *   sector      所属领域
 *   urgency     紧迫性
 *   brief       背景描述
 *   stakeholders 利益相关方
 *   steps       决策点数组（先设 3 步，后续扩充）
 *     prompt    该决策点抛给玩家的问题
 *     hint      提示（可选）
 *     options   可选「推行方式」
 *       text             选项说明
 *       ambiguityDelta  对模糊度的增量（层面基线之上）
 *       conflictDelta   对冲突度的增量
 *       effects         指标影响（意图效果，用于政策影响简报）
 *       rationale       解析：为何如此执行的讲解（用于决策轨迹）
 *
 * 注：层面（宏观/中观/微观）不在选项上，而在「每局开局」随机固定，
 *     由引擎的 LEVEL_BASE 提供基线。整局都在此层面下做决策。
 * ============================================================ */

window.SCENARIOS = [
  {
    id: 'ride_hailing',
    title: '网约车平台算法压榨司机',
    sector: '平台经济 / 劳动权益',
    urgency: '高',
    brief: '某大型网约车平台以算法动态调价与派单，司机普遍反映收入下降、工时拉长、申诉无门；乘客偶有安全疑虑。监管部门接获大量投诉，拟出手治理，但涉及平台、司机、乘客多方利益。',
    stakeholders: ['平台企业', '网约车司机', '乘客', '交通运输监管部门'],
    steps: [
      {
        prompt: '面对平台算法压榨司机这一难题，你的第一步怎么走？',
        hint: '作为本局的政策主体，先考虑如何「立规矩」。',
        options: [
          { text: '立刻出台强制令，设定全国统一的最低单价与最长工时。',
            ambiguityDelta: 0.10, conflictDelta: 0.25,
            effects: { equity: 2, industry: -1 },
            rationale: '一刀切标准看似清晰，但细则难定、平台强烈对立，模糊与冲突同步走高。' },
          { text: '先成立跨部门专委会，调查研究后再定实施细则。',
            ambiguityDelta: 0.20, conflictDelta: -0.05,
            effects: { equity: 1, efficacy: 1 },
            rationale: '目标被刻意保持弹性以利共识，模糊升高但冲突下降，偏向试验性执行。' },
          { text: '与平台协商，要求其自愿承诺改善并公开计价逻辑。',
            ambiguityDelta: -0.15, conflictDelta: -0.10,
            effects: { equity: 1, trust: 1 },
            rationale: '规则模糊却换取了利益一致，可部分落地、冲突缓和。' }
        ]
      },
      {
        prompt: '规则雏形既定，你打算如何推行？',
        hint: '推行方式会显著改变政策的落地程度。',
        options: [
          { text: '全国统一强制执行，设专项督查与罚则。',
            ambiguityDelta: 0.10, conflictDelta: 0.20,
            effects: { equity: 1, trust: 1, industry: -1 },
            rationale: '刚性推行标准清晰，但激化与执行对象的对立，冲突走高。' },
          { text: '先听证、后分阶段实施，给各方过渡期。',
            ambiguityDelta: -0.15, conflictDelta: -0.15,
            effects: { equity: 2, trust: 1 },
            rationale: '以协商降低模糊与冲突，政策更可能接近全额落地。' },
          { text: '委托行业协会自律，政府仅作背书。',
            ambiguityDelta: 0.10, conflictDelta: -0.05,
            effects: { equity: 1 },
            rationale: '政府退后一步，冲突缓和但标准更含糊，落地有限。' }
        ]
      },
      {
        prompt: '执行阶段，你如何确保政策真正落地？',
        hint: '执行保障决定「纸面政策」能否变成「现实改变」。',
        options: [
          { text: '建立统一投诉与处罚平台，刚性问责。',
            ambiguityDelta: 0.10, conflictDelta: 0.15,
            effects: { equity: 1, trust: 1, efficacy: 1 },
            rationale: '问责清晰但加剧对抗，冲突进一步升高。' },
          { text: '地方常态化巡查 + 数据报送，柔性纠偏。',
            ambiguityDelta: -0.10, conflictDelta: -0.05,
            effects: { equity: 1, trust: 1, efficacy: 1 },
            rationale: '以常态化机制压低模糊与冲突，执行更扎实。' },
          { text: '平台内设司机申诉快速通道，内部闭环。',
            ambiguityDelta: -0.10, conflictDelta: 0.05,
            effects: { equity: 1, trust: 1 },
            rationale: '内部闭环降低模糊，但与外部监管仍有张力。' }
        ]
      }
    ]
  },

  {
    id: 'ai_deepfake',
    title: 'AI 换脸深度伪造诈骗泛滥',
    sector: '人工智能伦理 / 信息安全',
    urgency: '高',
    brief: '近期利用「AI 换脸」技术伪造熟人视频实施诈骗的案件激增，公众难辨真伪；平台内容审核压力剧增，并牵涉个人信息保护、刑事打击与技术溯源等多重难题。',
    stakeholders: ['普通公众', '内容平台', '公安机关', '网信监管部门'],
    steps: [
      {
        prompt: '针对 AI 换脸诈骗，你先建立怎样的规则框架？',
        hint: '作为本局的政策主体，先考虑如何「定标准」。',
        options: [
          { text: '出台全国性「深度合成内容强制标识与溯源」法规。',
            ambiguityDelta: 0.20, conflictDelta: 0.15,
            effects: { privacy: 2, security: 1, trust: 1 },
            rationale: '标准宏大但界定困难、多方利益交错，模糊与冲突俱高。' },
          { text: '由本局先行试点「AI 内容举报—快速下架」机制。',
            ambiguityDelta: -0.05, conflictDelta: -0.05,
            effects: { privacy: 1, trust: 1 },
            rationale: '小范围试点，标准与冲突都较可控，偏向试验性。' },
          { text: '推动平台上线「合成内容主动标识」功能。',
            ambiguityDelta: -0.15, conflictDelta: 0.10,
            effects: { privacy: 1, trust: 1, industry: -1 },
            rationale: '规则明确但与企业商业利益对立，冲突偏高。' }
        ]
      },
      {
        prompt: '规则建立后，如何推行？',
        hint: '推行节奏影响公众信任与执行阻力。',
        options: [
          { text: '统一执法标准，设专项打击行动。',
            ambiguityDelta: 0.10, conflictDelta: 0.20,
            effects: { security: 1, trust: 1 },
            rationale: '刚性执法标准清晰，却激化与平台及技术方的对立。' },
          { text: '先评估后推广，小范围试点。',
            ambiguityDelta: -0.15, conflictDelta: -0.10,
            effects: { privacy: 1, trust: 1 },
            rationale: '以试点降低模糊与冲突，政策更稳。' },
          { text: '行业自律公约 + 技术互认。',
            ambiguityDelta: -0.05, conflictDelta: 0.10,
            effects: { trust: 1, privacy: 1 },
            rationale: '共识换执行，但标准仍含糊、利益冲突未解。' }
        ]
      },
      {
        prompt: '执行保障上，你采取何种手段？',
        hint: '技术手段与制度手段各有利弊。',
        options: [
          { text: '建全国 AI 内容溯源平台，刚性管控。',
            ambiguityDelta: 0.10, conflictDelta: 0.10,
            effects: { security: 1, privacy: 1 },
            rationale: '管控有力但标准与利益张力同步升高。' },
          { text: '常态化监测 + 跨部门协同。',
            ambiguityDelta: -0.10, conflictDelta: -0.05,
            effects: { security: 1, trust: 1, efficacy: 1 },
            rationale: '以协同压低模糊与冲突，执行更扎实。' },
          { text: '用户教育 + 一键举报，平台内闭环。',
            ambiguityDelta: -0.10, conflictDelta: 0.05,
            effects: { trust: 1, privacy: 1 },
            rationale: '内部闭环降模糊，但与外部监管仍有张力。' }
        ]
      }
    ]
  },

  {
    id: 'battery_recycle',
    title: '新能源动力电池回收乱象',
    sector: '绿色产业 / 环境与资源安全',
    urgency: '中',
    brief: '新能源汽车保有量激增，退役动力电池处置成难题：小作坊违规拆解污染严重，正规回收产能却「吃不饱」。问题横跨环保、资源安全与产业规范，亟需系统治理。',
    stakeholders: ['车企与电池厂', '回收企业', '地方政府', '环保监管部门'],
    steps: [
      {
        prompt: '退役电池回收乱象，你从何处入手立规？',
        hint: '作为本局的政策主体，先考虑如何「划责任」。',
        options: [
          { text: '出台强制回收与溯源法规，明确生产者责任。',
            ambiguityDelta: 0.15, conflictDelta: 0.20,
            effects: { environment: 2, security: 1 },
            rationale: '责任清晰但触及产业既有格局，模糊与冲突俱高。' },
          { text: '先设示范回收网点，摸索标准。',
            ambiguityDelta: 0.10, conflictDelta: -0.05,
            effects: { environment: 1, industry: 1 },
            rationale: '边做边试，冲突缓和、标准渐明，偏向试验性。' },
          { text: '鼓励正规企业建闭环回收体系，市场引导为主。',
            ambiguityDelta: -0.10, conflictDelta: 0.05,
            effects: { environment: 1, industry: 1 },
            rationale: '规则明确、借力市场，但监管抓手偏弱。' }
        ]
      },
      {
        prompt: '如何推行这项治理？',
        hint: '强制与激励，路径迥异。',
        options: [
          { text: '全国统一执法，严打小作坊违规拆解。',
            ambiguityDelta: 0.10, conflictDelta: 0.20,
            effects: { environment: 1, security: 1, equity: -1 },
            rationale: '刚性执法标准清晰，却激化与地方及从业者的对立。' },
          { text: '分区域分步实施，给产业过渡期。',
            ambiguityDelta: -0.15, conflictDelta: -0.10,
            effects: { environment: 2, industry: 1 },
            rationale: '以过渡期降低模糊与冲突，政策更稳。' },
          { text: '补贴正规回收产能，市场激励为主。',
            ambiguityDelta: -0.10, conflictDelta: 0.00,
            effects: { environment: 1, industry: 1 },
            rationale: '激励明确、冲突低，但需财政投入。' }
        ]
      },
      {
        prompt: '执行保障上，你采取何种手段？',
        hint: '信息可追溯是绿色治理的关键。',
        options: [
          { text: '建全国电池溯源信息平台，刚性监管。',
            ambiguityDelta: 0.10, conflictDelta: 0.10,
            effects: { environment: 1, security: 1, efficacy: 1 },
            rationale: '溯源有力但标准与利益张力同步升高。' },
          { text: '地方常态化巡查 + 数据共享。',
            ambiguityDelta: -0.10, conflictDelta: -0.05,
            effects: { environment: 1, efficacy: 1 },
            rationale: '以协同压低模糊与冲突，执行更扎实。' },
          { text: '企业自建回收台账，内部闭环。',
            ambiguityDelta: -0.10, conflictDelta: 0.05,
            effects: { environment: 1, industry: 1 },
            rationale: '内部闭环降模糊，但与外部监管仍有张力。' }
        ]
      }
    ]
  }
];
