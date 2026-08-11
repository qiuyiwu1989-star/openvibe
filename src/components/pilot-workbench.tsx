"use client";

import { useMemo, useState } from "react";

import {
  PILOT_BLOCKERS,
  PILOT_EVIDENCE_LEVELS,
  PILOT_INTERVENTIONS,
} from "../../packages/schema/src/taxonomies";
import {
  PilotSessionRecordSchema,
  type PilotSessionRecord,
} from "../../packages/schema/src/index";
import {
  deletePilotSession,
  PILOT_STORAGE_KEY,
  pilotBlockerLabels,
  pilotContextLabels,
  pilotEvidenceLabels,
  pilotInterventionLabels,
  upsertPilotSession,
} from "@/lib/pilot-feedback";
import { usePilotSessions } from "@/lib/use-pilot-sessions";

type PathSummary = {
  slug: string;
  title: string;
  ageLabel: string;
  missionSlugs: string[];
};

type MissionSummary = { slug: string; title: string };
type EvidenceLevel = (typeof PILOT_EVIDENCE_LEVELS)[number];
type Blocker = (typeof PILOT_BLOCKERS)[number];
type Intervention = (typeof PILOT_INTERVENTIONS)[number];

type FormState = {
  id: string | null;
  createdAt: string | null;
  pathSlug: string;
  missionSlug: string;
  sessionDate: string;
  context: keyof typeof pilotContextLabels;
  participantCount: string;
  firstVisibleCount: string;
  completedCount: string;
  authorEvidenceCount: string;
  blockers: Blocker[];
  interventions: Intervention[];
  evidence: {
    intentionOwnership: EvidenceLevel;
    focusedMaking: EvidenceLevel;
    firstPersonMeaning: EvidenceLevel;
    namedResponsibility: EvidenceLevel;
  };
  workedWell: string;
  changeNext: string;
  privacyConfirmed: boolean;
};

const evidenceDimensions = [
  ["intentionOwnership", "意图与价值", "能说出想为谁做、什么算好"],
  ["focusedMaking", "亲身投入", "经历了必要的尝试、修改和专注"],
  ["firstPersonMeaning", "第一人称意义", "能联系自己的经验解释作品"],
  ["namedResponsibility", "署名与担责", "能指出自己的决定并接受反馈"],
] as const;

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function emptyForm(paths: PathSummary[], preferredPathSlug?: string): FormState {
  const path = paths.find((item) => item.slug === preferredPathSlug) ?? paths[0];
  if (!path) throw new Error("至少需要一条学习路线");
  const missionSlug = path.missionSlugs[0];
  if (!missionSlug) throw new Error("学习路线至少需要一个案例");
  return {
    id: null,
    createdAt: null,
    pathSlug: path.slug,
    missionSlug,
    sessionDate: localDate(),
    context: "classroom",
    participantCount: "1",
    firstVisibleCount: "0",
    completedCount: "0",
    authorEvidenceCount: "0",
    blockers: [],
    interventions: [],
    evidence: {
      intentionOwnership: "not-seen",
      focusedMaking: "not-seen",
      firstPersonMeaning: "not-seen",
      namedResponsibility: "not-seen",
    },
    workedWell: "",
    changeNext: "",
    privacyConfirmed: false,
  };
}

function recordToForm(record: PilotSessionRecord): FormState {
  return {
    id: record.id,
    createdAt: record.createdAt,
    pathSlug: record.pathSlug,
    missionSlug: record.missionSlug,
    sessionDate: record.sessionDate,
    context: record.context,
    participantCount: String(record.participantCount),
    firstVisibleCount: String(record.firstVisibleCount),
    completedCount: String(record.completedCount),
    authorEvidenceCount: String(record.authorEvidenceCount),
    blockers: [...record.blockers],
    interventions: [...record.interventions],
    evidence: { ...record.evidence },
    workedWell: record.workedWell,
    changeNext: record.changeNext,
    privacyConfirmed: record.privacyConfirmed,
  };
}

function toggleItem<T extends string>(items: T[], item: T): T[] {
  if (items.includes(item)) return items.filter((value) => value !== item);
  return items.length < 4 ? [...items, item] : items;
}

export function PilotWorkbench({
  paths,
  missions,
  initialPathSlug,
}: {
  paths: PathSummary[];
  missions: MissionSummary[];
  initialPathSlug?: string | undefined;
}) {
  const collection = usePilotSessions();
  const [form, setForm] = useState<FormState>(() => emptyForm(paths, initialPathSlug));
  const [message, setMessage] = useState<string | null>(null);

  const selectedPath = paths.find((path) => path.slug === form.pathSlug) ?? paths[0];
  const selectedMissions = missions.filter((mission) => selectedPath?.missionSlugs.includes(mission.slug));
  const records = useMemo(
    () => [...(collection?.records ?? [])].sort((left, right) => right.sessionDate.localeCompare(left.sessionDate)),
    [collection],
  );

  const totals = records.reduce(
    (summary, record) => ({
      participants: summary.participants + record.participantCount,
      firstVisible: summary.firstVisible + record.firstVisibleCount,
      completed: summary.completed + record.completedCount,
      authorEvidence: summary.authorEvidence + record.authorEvidenceCount,
    }),
    { participants: 0, firstVisible: 0, completed: 0, authorEvidence: 0 },
  );

  const topBlockers = PILOT_BLOCKERS.map((blocker) => ({
    blocker,
    count: records.filter((record) => record.blockers.includes(blocker)).length,
  }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  function updateCount(field: "participantCount" | "firstVisibleCount" | "completedCount" | "authorEvidenceCount", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm(preferredPath = form.pathSlug) {
    setForm(emptyForm(paths, preferredPath));
    setMessage(null);
  }

  function submitRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const result = PilotSessionRecordSchema.safeParse({
      id: form.id ?? crypto.randomUUID(),
      schemaVersion: "1.0.0",
      pathSlug: form.pathSlug,
      missionSlug: form.missionSlug,
      sessionDate: form.sessionDate,
      context: form.context,
      participantCount: Number(form.participantCount),
      firstVisibleCount: Number(form.firstVisibleCount),
      completedCount: Number(form.completedCount),
      authorEvidenceCount: Number(form.authorEvidenceCount),
      blockers: form.blockers,
      interventions: form.interventions,
      evidence: form.evidence,
      workedWell: form.workedWell,
      changeNext: form.changeNext,
      privacyConfirmed: form.privacyConfirmed,
      createdAt: form.createdAt ?? now,
      updatedAt: now,
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      setMessage(issue?.message ?? "请检查试教记录后再保存。");
      return;
    }
    upsertPilotSession(result.data);
    const wasEditing = form.id !== null;
    setForm(emptyForm(paths, form.pathSlug));
    setMessage(wasEditing ? "记录已更新。" : "匿名试教记录已保存在这台设备。 ");
  }

  function editRecord(record: PilotSessionRecord) {
    setForm(recordToForm(record));
    setMessage("正在修改这条记录。");
    document.getElementById("pilot-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function removeRecord(record: PilotSessionRecord) {
    if (!window.confirm("确定删除这条本机试教记录吗？删除后无法恢复。")) return;
    deletePilotSession(record.id);
    if (form.id === record.id) resetForm(record.pathSlug);
    setMessage("记录已从这台设备删除。");
  }

  function exportRecords() {
    if (!collection || records.length === 0) return;
    const blob = new Blob([`${JSON.stringify(collection, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `openvibe-pilot-feedback-${localDate()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="pilot-summary" aria-labelledby="pilot-summary-title">
        <div className="pilot-summary-heading">
          <div><p className="eyebrow">LOCAL EVIDENCE / 本机汇总</p><h2 id="pilot-summary-title">先看作品证据，再改教学设计。</h2></div>
          <button className="button button-ghost" type="button" onClick={exportRecords} disabled={records.length === 0}>导出匿名记录</button>
        </div>
        <dl className="pilot-metrics">
          <div><dt>试教场次</dt><dd>{records.length}</dd></div>
          <div><dt>参与人次</dt><dd>{totals.participants}</dd></div>
          <div><dt>15 分钟可见</dt><dd>{totals.firstVisible}</dd></div>
          <div><dt>可演示版本</dt><dd>{totals.completed}</dd></div>
          <div><dt>作者证据</dt><dd>{totals.authorEvidence}</dd></div>
        </dl>
        <div className="pilot-patterns">
          <strong>当前高频卡点</strong>
          {topBlockers.length > 0 ? (
            <ol>{topBlockers.map(({ blocker, count }) => <li key={blocker}><span>{pilotBlockerLabels[blocker]}</span><b>{count} 场</b></li>)}</ol>
          ) : <p>完成首场试教后，这里会显示高频卡点。</p>}
        </div>
      </section>

      <section className="pilot-form-section" id="pilot-form" aria-labelledby="pilot-form-title">
        <div className="pilot-form-intro">
          <p className="eyebrow">SESSION NOTE / 单次试教记录</p>
          <h2 id="pilot-form-title">记录一次活动，不记录一个孩子。</h2>
          <p>所有数字都是整场匿名汇总。两段反思不得填写姓名、学校、联系方式、作品私密链接或其他可识别信息。</p>
        </div>
        <form className="pilot-form" onSubmit={submitRecord}>
          <div className="pilot-form-grid">
            <label><span>学习路线</span><select value={form.pathSlug} onChange={(event) => {
              const path = paths.find((item) => item.slug === event.target.value);
              setForm((current) => ({ ...current, pathSlug: event.target.value, missionSlug: path?.missionSlugs[0] ?? "" }));
            }}>{paths.map((path) => <option value={path.slug} key={path.slug}>{path.ageLabel} · {path.title}</option>)}</select></label>
            <label><span>选择的作品</span><select value={form.missionSlug} onChange={(event) => setForm((current) => ({ ...current, missionSlug: event.target.value }))}>{selectedMissions.map((mission) => <option value={mission.slug} key={mission.slug}>{mission.title}</option>)}</select></label>
            <label><span>活动日期</span><input type="date" required max={localDate()} value={form.sessionDate} onChange={(event) => setForm((current) => ({ ...current, sessionDate: event.target.value }))} /></label>
            <label><span>活动场景</span><select value={form.context} onChange={(event) => setForm((current) => ({ ...current, context: event.target.value as FormState["context"] }))}>{Object.entries(pilotContextLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          </div>

          <fieldset className="pilot-counts"><legend>整场结果</legend><p>后面三项都不能超过参与人数。</p><div>
            <label><span>参与人数</span><input type="number" min="1" max="60" required value={form.participantCount} onChange={(event) => updateCount("participantCount", event.target.value)} /></label>
            <label><span>15 分钟看到变化</span><input type="number" min="0" max="60" required value={form.firstVisibleCount} onChange={(event) => updateCount("firstVisibleCount", event.target.value)} /></label>
            <label><span>做出可演示版本</span><input type="number" min="0" max="60" required value={form.completedCount} onChange={(event) => updateCount("completedCount", event.target.value)} /></label>
            <label><span>能解释作者决定</span><input type="number" min="0" max="60" required value={form.authorEvidenceCount} onChange={(event) => updateCount("authorEvidenceCount", event.target.value)} /></label>
          </div></fieldset>

          <div className="pilot-choice-grid">
            <fieldset><legend>主要卡点 <small>最多 4 项</small></legend>{PILOT_BLOCKERS.map((blocker) => <label key={blocker}><input type="checkbox" checked={form.blockers.includes(blocker)} disabled={!form.blockers.includes(blocker) && form.blockers.length >= 4} onChange={() => setForm((current) => ({ ...current, blockers: toggleItem(current.blockers, blocker) }))} /><span>{pilotBlockerLabels[blocker]}</span></label>)}</fieldset>
            <fieldset><legend>成人介入 <small>最多 4 项</small></legend>{PILOT_INTERVENTIONS.map((intervention) => <label key={intervention}><input type="checkbox" checked={form.interventions.includes(intervention)} disabled={!form.interventions.includes(intervention) && form.interventions.length >= 4} onChange={() => setForm((current) => ({ ...current, interventions: toggleItem(current.interventions, intervention) }))} /><span>{pilotInterventionLabels[intervention]}</span></label>)}</fieldset>
          </div>

          <fieldset className="pilot-evidence"><legend>作者身份证据</legend><div>{evidenceDimensions.map(([field, title, description]) => <label key={field}><span><strong>{title}</strong><small>{description}</small></span><select value={form.evidence[field]} onChange={(event) => setForm((current) => ({ ...current, evidence: { ...current.evidence, [field]: event.target.value as EvidenceLevel } }))}>{PILOT_EVIDENCE_LEVELS.map((level) => <option value={level} key={level}>{pilotEvidenceLabels[level]}</option>)}</select></label>)}</div></fieldset>

          <div className="pilot-reflection-grid">
            <label><span>这次什么设计有效？</span><small>10–300 字，只写活动现象，不写个人身份。</small><textarea required minLength={10} maxLength={300} value={form.workedWell} onChange={(event) => setForm((current) => ({ ...current, workedWell: event.target.value }))} /></label>
            <label><span>下一次准备改什么？</span><small>10–300 字，写一个可执行的教学调整。</small><textarea required minLength={10} maxLength={300} value={form.changeNext} onChange={(event) => setForm((current) => ({ ...current, changeNext: event.target.value }))} /></label>
          </div>

          <label className="pilot-privacy-check"><input type="checkbox" required checked={form.privacyConfirmed} onChange={(event) => setForm((current) => ({ ...current, privacyConfirmed: event.target.checked }))} /><span>我确认记录中没有姓名、学校、联系方式、私密作品链接或其他可识别未成年人的信息。</span></label>
          <div className="pilot-form-actions">
            <button className="button button-primary" type="submit">{form.id ? "保存修改" : "保存匿名记录"}</button>
            {form.id && <button className="text-button" type="button" onClick={() => resetForm()}>取消修改</button>}
            <p role="status" aria-live="polite">{message}</p>
          </div>
        </form>
      </section>

      <section className="pilot-records" aria-labelledby="pilot-records-title">
        <div className="section-heading"><div><p className="eyebrow">SESSION HISTORY / 本机记录</p><h2 id="pilot-records-title">每次试教都留下下一次改进的依据</h2></div><p className="paths-section-note">记录只存在当前浏览器。导出的 JSON 可交给项目负责人做离线汇总。</p></div>
        {records.length === 0 ? <div className="empty-state"><h3>还没有试教记录</h3><p>完成上面的表单后，第一条匿名记录会出现在这里。</p></div> : <div className="pilot-record-grid">{records.map((record) => {
          const path = paths.find((item) => item.slug === record.pathSlug);
          const mission = missions.find((item) => item.slug === record.missionSlug);
          return <article key={record.id} className="pilot-record-card"><div className="pilot-record-topline"><span>{pilotContextLabels[record.context]}</span><time dateTime={record.sessionDate}>{record.sessionDate}</time></div><h3>{mission?.title ?? record.missionSlug}</h3><p>{path?.title ?? record.pathSlug}</p><dl><div><dt>参与</dt><dd>{record.participantCount}</dd></div><div><dt>完成</dt><dd>{record.completedCount}</dd></div><div><dt>作者证据</dt><dd>{record.authorEvidenceCount}</dd></div></dl>{record.changeNext && <blockquote><span>下一次调整</span><p>{record.changeNext}</p></blockquote>}<div className="pilot-record-actions"><button type="button" onClick={() => editRecord(record)}>修改</button><button type="button" onClick={() => removeRecord(record)}>删除</button></div></article>;
        })}</div>}
        <p className="works-storage-note">本机存储键：<code>{PILOT_STORAGE_KEY}</code>。清理浏览器数据前请先导出。</p>
      </section>
    </>
  );
}
