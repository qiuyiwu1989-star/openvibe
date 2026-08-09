export const categoryLabels: Record<string, string> = {
  "ai-app": "AI 应用",
  agent: "Agent",
  saas: "SaaS",
  "content-tool": "内容工具",
  "personal-site": "个人网站",
  "data-visualization": "数据可视化",
  automation: "自动化",
  "developer-tool": "开发者工具",
  "browser-extension": "浏览器扩展",
  "mobile-app": "移动应用",
};

export const learningGoalLabels: Record<string, string> = {
  ui: "学界面",
  "product-architecture": "学产品结构",
  database: "学数据库",
  authentication: "学用户登录",
  payments: "学支付",
  "ai-integration": "学 AI 接入",
  "agent-workflow": "学 Agent 工作流",
  deployment: "学部署",
  "project-organization": "学完整项目组织",
};

export const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "较难",
};

export const audienceLabels: Record<string, string> = {
  beginner: "零基础",
  starter: "入门",
  intermediate: "进阶",
};

export const riskLabels: Record<string, string> = {
  setup: "运行环境",
  documentation: "文档",
  "paid-service": "付费服务",
  license: "许可证",
  maintenance: "维护状态",
  security: "安全",
  complexity: "复杂度",
};

export const riskSeverityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export function labelFor(labels: Record<string, string>, key: string) {
  return labels[key] ?? key;
}
