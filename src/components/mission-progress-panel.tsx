"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  BeginnerMission,
  MakerProgressRecord,
} from "../../packages/schema/src/index";
import { readMakerProgress, upsertMakerProgress } from "@/lib/maker-progress";

type MissionProgressPanelProps = {
  missionSlug: string;
  missionTitle: string;
  makerDecisionPrompt: string;
  steps: BeginnerMission["steps"];
};

export function MissionProgressPanel({
  missionSlug,
  missionTitle,
  makerDecisionPrompt,
  steps,
}: MissionProgressPanelProps) {
  const [record, setRecord] = useState<MakerProgressRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [workUrlInput, setWorkUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    const existing = readMakerProgress().records.find((item) => item.missionSlug === missionSlug);
    setRecord(existing ?? null);
    setWorkUrlInput(existing?.workUrl ?? "");
    setHydrated(true);
  }, [missionSlug]);

  const completedSteps = record?.completedStepIndexes ?? [];
  const canComplete =
    completedSteps.length === 3 &&
    Boolean(record?.authorName.trim()) &&
    (record?.makerDecision.trim().length ?? 0) >= 10;

  function persist(patch: Partial<MakerProgressRecord>) {
    const now = new Date().toISOString();
    const current = record ?? {
      missionSlug,
      status: "in_progress" as const,
      completedStepIndexes: [],
      authorName: "",
      makerDecision: "",
      reflection: "",
      workUrl: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
    };
    const next = { ...current, ...patch, missionSlug, updatedAt: now };
    const stillComplete =
      next.completedStepIndexes.length === 3 &&
      Boolean(next.authorName.trim()) &&
      next.makerDecision.trim().length >= 10;
    if (next.status === "completed" && !stillComplete) {
      next.status = "in_progress";
      next.completedAt = null;
    }
    const saved = upsertMakerProgress(next);
    setRecord(saved.records.find((item) => item.missionSlug === missionSlug) ?? null);
  }

  function toggleStep(index: number) {
    const current = new Set(completedSteps);
    if (current.has(index)) current.delete(index);
    else current.add(index);
    const completedStepIndexes = [...current].sort((left, right) => left - right);
    persist({
      completedStepIndexes,
      ...(record?.status === "completed" && completedStepIndexes.length < 3
        ? { status: "in_progress" as const, completedAt: null }
        : {}),
    });
  }

  function saveWorkUrl() {
    const value = workUrlInput.trim();
    if (!value) {
      setUrlError("");
      persist({ workUrl: null });
      return;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported protocol");
      setUrlError("");
      persist({ workUrl: value });
    } catch {
      setUrlError("请填写完整网址，例如 https://example.com");
    }
  }

  function completeWork() {
    if (!canComplete) return;
    persist({ status: "completed", completedAt: new Date().toISOString() });
  }

  return (
    <section className="content-block" aria-labelledby="steps-title">
      <div className="progress-heading">
        <div>
          <p className="eyebrow">三段路径 · 自动保存在本机</p>
          <h2 id="steps-title">从第一个变化，到你的版本</h2>
        </div>
        <div className="progress-count" aria-live="polite">
          <strong>{completedSteps.length}</strong>
          <span>/ 3 步</span>
        </div>
      </div>

      <div className="beginner-steps interactive-steps">
        {steps.map((step, index) => {
          const checked = completedSteps.includes(index);
          return (
            <article className={checked ? "step-completed" : ""} key={step.title}>
              <div className="beginner-step-number">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.time}</strong>
              </div>
              <div>
                <label className="step-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!hydrated}
                    onChange={() => toggleStep(index)}
                  />
                  <span aria-hidden="true">{checked ? "✓" : ""}</span>
                  <h3>{step.title}</h3>
                </label>
                <ol>
                  {step.actions.map((action) => <li key={action}>{action}</li>)}
                </ol>
                <p><strong>做完的标志：</strong>{step.doneWhen}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="authorship-form">
        <div className="authorship-form-heading">
          <p className="eyebrow">AUTHORSHIP / 作者记录</p>
          <h3>作品可以请 AI 帮忙，这三件事由你亲自写。</h3>
          <p>记录只保存在这台设备，没有登录也能使用。</p>
        </div>

        <div className="authorship-fields">
          <label>
            <span>作者署名</span>
            <input
              value={record?.authorName ?? ""}
              disabled={!hydrated}
              maxLength={80}
              placeholder="你希望作品显示的名字"
              onChange={(event) => persist({ authorName: event.target.value })}
            />
          </label>
          <label>
            <span>我做的关键决定</span>
            <small>{makerDecisionPrompt}</small>
            <textarea
              value={record?.makerDecision ?? ""}
              disabled={!hydrated}
              maxLength={800}
              placeholder="不写 AI 做了什么，写你选择了什么、为什么。"
              onChange={(event) => persist({ makerDecision: event.target.value })}
            />
          </label>
          <label>
            <span>下一次我想改</span>
            <textarea
              value={record?.reflection ?? ""}
              disabled={!hydrated}
              maxLength={1200}
              placeholder="看过反馈后，你还想让它变得哪里更好？"
              onChange={(event) => persist({ reflection: event.target.value })}
            />
          </label>
          <label>
            <span>作品网址（可选）</span>
            <input
              type="url"
              value={workUrlInput}
              disabled={!hydrated}
              placeholder="https://"
              onChange={(event) => setWorkUrlInput(event.target.value)}
              onBlur={saveWorkUrl}
            />
            {urlError && <small className="field-error">{urlError}</small>}
          </label>
        </div>

        <div className="completion-actions">
          <button
            className="button button-primary"
            type="button"
            disabled={!canComplete || record?.status === "completed"}
            onClick={completeWork}
          >
            {record?.status === "completed" ? "已完成并署名" : "完成并署名"}
          </button>
          <p>
            {record?.status === "completed"
              ? `《${missionTitle}》已进入你的作品记录。`
              : "完成三步、署名并写下至少 10 个字的关键决定后可完成。"}
          </p>
          {record?.status === "completed" && (
            <Link className="text-link" href="/works">查看我的作品 <span aria-hidden="true">→</span></Link>
          )}
        </div>
      </div>
    </section>
  );
}
