"use client";

import Link from "next/link";

import { MAKER_PROGRESS_STORAGE_KEY } from "@/lib/maker-progress";
import { useMakerProgress } from "@/lib/use-maker-progress";

type MissionSummary = {
  slug: string;
  title: string;
  outcome: string;
};

const formatDate = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function WorksDashboard({ missions }: { missions: MissionSummary[] }) {
  const collection = useMakerProgress();

  function exportRecords() {
    if (!collection) return;
    const blob = new Blob([`${JSON.stringify(collection, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "openvibe-my-works.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!collection) {
    return <div className="works-loading" aria-live="polite">正在读取这台设备上的作品记录……</div>;
  }

  const records = [...collection.records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  if (records.length === 0) {
    return (
      <div className="empty-state works-empty">
        <span className="empty-mark" aria-hidden="true">◇</span>
        <h2>这台设备上还没有作品记录</h2>
        <p>选一个新手任务，完成第一步后，进度就会出现在这里。</p>
        <Link className="button button-primary" href="/start">开始第一个作品</Link>
      </div>
    );
  }

  return (
    <>
      <div className="works-toolbar">
        <p>
          <strong>{records.filter((item) => item.status === "completed").length}</strong> 个已完成 · {records.length} 个有记录
        </p>
        <button className="button button-ghost" type="button" onClick={exportRecords}>
          导出我的记录
        </button>
      </div>
      <div className="works-grid">
        {records.map((record) => {
          const mission = missions.find((item) => item.slug === record.missionSlug);
          if (!mission) return null;
          return (
            <article className="work-record" key={record.missionSlug}>
              <div className="work-record-topline">
                <span className={`work-status work-status-${record.status}`}>
                  {record.status === "completed" ? "已完成" : "制作中"}
                </span>
                <time dateTime={record.updatedAt}>{formatDate.format(new Date(record.updatedAt))}</time>
              </div>
              <h2>{mission.title}</h2>
              <p>{mission.outcome}</p>
              <dl>
                <div><dt>完成进度</dt><dd>{record.completedStepIndexes.length} / 3 步</dd></div>
                {record.authorName && <div><dt>作者</dt><dd>{record.authorName}</dd></div>}
              </dl>
              {record.makerDecision && (
                <blockquote>
                  <span>我的决定</span>
                  <p>{record.makerDecision}</p>
                </blockquote>
              )}
              {record.reflection && (
                <blockquote>
                  <span>下一次想改</span>
                  <p>{record.reflection}</p>
                </blockquote>
              )}
              <div className="work-record-actions">
                <Link className="text-link" href={`/start/${record.missionSlug}`}>
                  {record.status === "completed" ? "继续改作品" : "继续做"} <span aria-hidden="true">→</span>
                </Link>
                {record.workUrl && <a href={record.workUrl} target="_blank" rel="noreferrer">打开作品 ↗</a>}
              </div>
            </article>
          );
        })}
      </div>
      <p className="works-storage-note">
        记录仅保存在当前浏览器（<code>{MAKER_PROGRESS_STORAGE_KEY}</code>）。部署后接入账号前，建议定期导出备份。
      </p>
    </>
  );
}
