import {
  PilotSessionCollectionSchema,
  PilotSessionRecordSchema,
  SCHEMA_VERSION,
  type PilotSessionCollection,
  type PilotSessionRecord,
} from "../../packages/schema/src/index";
import {
  PILOT_BLOCKERS,
  PILOT_EVIDENCE_LEVELS,
  PILOT_INTERVENTIONS,
} from "../../packages/schema/src/taxonomies";

export const PILOT_STORAGE_KEY = "openvibe:pilot-sessions:v1";
export const PILOT_EVENT = "openvibe-pilot-sessions-changed";

export const pilotBlockerLabels: Record<(typeof PILOT_BLOCKERS)[number], string> = {
  "choosing-problem": "不知道想解决什么问题",
  "choosing-work": "难以从案例中选一件作品",
  "tool-setup": "工具或环境准备",
  "understanding-code": "看不懂需要修改的代码",
  debugging: "遇到错误后无法继续",
  "getting-feedback": "找不到真实反馈对象",
  finishing: "能开始但难以收尾",
  presenting: "不敢或不会展示说明",
};

export const pilotInterventionLabels: Record<(typeof PILOT_INTERVENTIONS)[number], string> = {
  "environment-setup": "代为处理环境准备",
  "question-prompt": "用问题帮助澄清意图",
  "code-explanation": "解释关键代码",
  "debugging-help": "协助定位错误",
  "safety-reminder": "提醒隐私或内容安全",
  "feedback-facilitation": "组织真实反馈",
  "reflection-prompt": "追问作者决定与反思",
};

export const pilotEvidenceLabels: Record<(typeof PILOT_EVIDENCE_LEVELS)[number], string> = {
  "not-seen": "尚未观察到",
  emerging: "正在形成",
  clear: "有清楚证据",
};

export const pilotContextLabels = {
  home: "家庭",
  classroom: "课堂",
  club: "社团 / 工作坊",
} as const;

export function emptyPilotSessions(): PilotSessionCollection {
  return { schemaVersion: SCHEMA_VERSION, records: [] };
}

export function readPilotSessions(): PilotSessionCollection {
  if (typeof window === "undefined") return emptyPilotSessions();
  const raw = window.localStorage.getItem(PILOT_STORAGE_KEY);
  if (!raw) return emptyPilotSessions();
  try {
    const parsed = PilotSessionCollectionSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : emptyPilotSessions();
  } catch {
    return emptyPilotSessions();
  }
}

export function upsertPilotSession(record: PilotSessionRecord): PilotSessionCollection {
  const validRecord = PilotSessionRecordSchema.parse(record);
  const current = readPilotSessions();
  const collection = PilotSessionCollectionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    records: [validRecord, ...current.records.filter((item) => item.id !== validRecord.id)],
  });
  window.localStorage.setItem(PILOT_STORAGE_KEY, JSON.stringify(collection));
  window.dispatchEvent(new CustomEvent(PILOT_EVENT));
  return collection;
}

export function deletePilotSession(id: string): PilotSessionCollection {
  const current = readPilotSessions();
  const collection = PilotSessionCollectionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    records: current.records.filter((item) => item.id !== id),
  });
  window.localStorage.setItem(PILOT_STORAGE_KEY, JSON.stringify(collection));
  window.dispatchEvent(new CustomEvent(PILOT_EVENT));
  return collection;
}
