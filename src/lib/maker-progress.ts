import {
  MakerProgressCollectionSchema,
  MakerProgressRecordSchema,
  SCHEMA_VERSION,
  type MakerProgressCollection,
  type MakerProgressRecord,
} from "../../packages/schema/src/index";

export const MAKER_PROGRESS_STORAGE_KEY = "openvibe:maker-progress:v1";
export const MAKER_PROGRESS_EVENT = "openvibe-maker-progress-changed";

export function emptyMakerProgress(): MakerProgressCollection {
  return { schemaVersion: SCHEMA_VERSION, records: [] };
}

export function readMakerProgress(): MakerProgressCollection {
  if (typeof window === "undefined") return emptyMakerProgress();
  const raw = window.localStorage.getItem(MAKER_PROGRESS_STORAGE_KEY);
  if (!raw) return emptyMakerProgress();
  try {
    const parsed = MakerProgressCollectionSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : emptyMakerProgress();
  } catch {
    return emptyMakerProgress();
  }
}

export function upsertMakerProgress(record: MakerProgressRecord): MakerProgressCollection {
  const validRecord = MakerProgressRecordSchema.parse(record);
  const current = readMakerProgress();
  const collection = MakerProgressCollectionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    records: [
      validRecord,
      ...current.records.filter((item) => item.missionSlug !== validRecord.missionSlug),
    ],
  });
  window.localStorage.setItem(MAKER_PROGRESS_STORAGE_KEY, JSON.stringify(collection));
  window.dispatchEvent(new CustomEvent(MAKER_PROGRESS_EVENT));
  return collection;
}
