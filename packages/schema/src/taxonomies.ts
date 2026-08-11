export const SCHEMA_VERSION = "1.0.0" as const;

export const BEGINNER_MISSION_SCHEMA_VERSION = "1.1.0" as const;

export const PROJECT_CATEGORIES = [
  "ai-app",
  "agent",
  "saas",
  "content-tool",
  "personal-site",
  "data-visualization",
  "automation",
  "developer-tool",
  "browser-extension",
  "mobile-app",
] as const;

export const LEARNING_GOALS = [
  "ui",
  "product-architecture",
  "database",
  "authentication",
  "payments",
  "ai-integration",
  "agent-workflow",
  "deployment",
  "project-organization",
] as const;

export const AUDIENCE_LEVELS = ["beginner", "starter", "intermediate"] as const;

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

export const BEGINNER_MISSION_TRACKS = [
  "personal-page",
  "small-tool",
  "interaction",
  "mini-game",
] as const;

export const BEGINNER_MISSION_LEVELS = ["first-step", "guided"] as const;

export const K12_AGE_BANDS = [
  "lower-primary",
  "upper-primary",
  "middle-school",
  "high-school",
] as const;

export const K12_SUBJECTS = [
  "language-arts",
  "mathematics",
  "science",
  "social-studies",
  "arts",
  "information-technology",
  "wellbeing",
] as const;

export const K12_SUPPORT_LEVELS = ["required", "recommended", "optional"] as const;

export const K12_LEARNING_CONTEXTS = ["home", "classroom", "club"] as const;

export const UPDATE_CHANGE_KINDS = [
  "repository_renamed",
  "default_branch_changed",
  "description_changed",
  "license_changed",
  "readme_changed",
  "technology_changed",
  "activity_changed",
  "metrics_changed",
  "availability_changed",
  "maintenance_risk",
] as const;

export const UPDATE_RISK_LEVELS = ["low", "medium", "high"] as const;

export const RISK_KINDS = [
  "setup",
  "documentation",
  "paid-service",
  "license",
  "maintenance",
  "security",
  "complexity",
] as const;

export const PUBLICATION_STATUSES = [
  "discovered",
  "fetched",
  "evaluated",
  "review",
  "published",
  "rejected",
] as const;

export const SCORE_MAX = {
  replicability: 25,
  clarity: 20,
  beginnerValue: 20,
  productCompleteness: 15,
  vibeCodingRelevance: 10,
  maintenance: 5,
  novelty: 5,
} as const;
