export const k12AgeBandLabels = {
  "lower-primary": "小学低段",
  "upper-primary": "小学高段",
  "middle-school": "初中",
  "high-school": "高中",
} as const;

export const k12AgeBandAges = {
  "lower-primary": "6–8 岁",
  "upper-primary": "9–12 岁",
  "middle-school": "13–15 岁",
  "high-school": "16–18 岁",
} as const;

export const k12AgeBandDescriptions = {
  "lower-primary": "成人陪伴，把真实兴趣变成第一件可玩的作品。",
  "upper-primary": "修改规则与内容，开始解释什么才算公平、准确。",
  "middle-school": "从生活问题出发，用数据和交互验证自己的判断。",
  "high-school": "完成真实产品闭环，面对受众、来源与公开责任。",
} as const;

export const k12SubjectLabels = {
  "language-arts": "语文与表达",
  mathematics: "数学",
  science: "科学",
  "social-studies": "社会与人文",
  arts: "艺术",
  "information-technology": "信息科技",
  wellbeing: "身心与成长",
} as const;

export const k12SupportLabels = {
  required: "需要成人陪伴",
  recommended: "建议成人支持",
  optional: "可以独立完成",
} as const;

export const k12ContextLabels = {
  home: "家庭",
  classroom: "课堂",
  club: "社团",
} as const;

export const creatorLoopLabels = {
  problem: "问题",
  knowledge: "知识",
  tool: "工具",
  work: "作品",
  feedback: "反馈",
  identity: "身份",
} as const;

export type K12AgeBand = keyof typeof k12AgeBandLabels;
