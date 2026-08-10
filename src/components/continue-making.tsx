"use client";

import Link from "next/link";

import { useMakerProgress } from "@/lib/use-maker-progress";

type MissionSummary = {
  slug: string;
  title: string;
  tagline: string;
};

export function ContinueMaking({ missions }: { missions: MissionSummary[] }) {
  const collection = useMakerProgress();
  if (!collection || collection.records.length === 0) return null;

  const sorted = [...collection.records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const record = sorted.find((item) => item.status === "in_progress") ?? sorted[0];
  if (!record) return null;
  const mission = missions.find((item) => item.slug === record.missionSlug);
  if (!mission) return null;

  return (
    <section className="continue-strip">
      <div className="shell continue-grid">
        <div>
          <p className="eyebrow">{record.status === "completed" ? "你已经有作品了" : "继续上次的制作"}</p>
          <h2>{mission.title}</h2>
          <p>{mission.tagline}</p>
        </div>
        <div className="continue-progress">
          <strong>{record.completedStepIndexes.length} / 3</strong>
          <span>{record.status === "completed" ? "已完成并署名" : "步骤已完成"}</span>
          <Link className="button button-dark" href={record.status === "completed" ? "/works" : `/start/${mission.slug}`}>
            {record.status === "completed" ? "查看作品记录" : "继续做"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
