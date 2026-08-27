import type { Metadata } from "next";
import Link from "next/link";

import { getUpdateHistory, updateChangeLabels } from "@/lib/update-history";

export const metadata: Metadata = {
  title: "更新日志",
  description: "订阅 OpenVibe 的新作品任务、项目信息变化与维护风险提示。",
};

const formatDate = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function UpdatesPage() {
  const entries = getUpdateHistory();

  return (
    <div className="updates-page">
      <section className="updates-hero shell">
        <div>
          <p className="eyebrow">UPDATES / 持续更新</p>
          <h1>项目会变，学习建议也要跟着变。</h1>
          <p>
            系统每周检查新候选、README、技术栈、许可证与维护状态。
            只有通过复核的变化才会出现在这里。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/updates/feed.xml">
              订阅 RSS <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-ghost" href="/methodology">
              了解审核方法
            </Link>
          </div>
        </div>
        <aside className="update-promise">
          <p className="eyebrow">更新承诺</p>
          <ol>
            <li><span>01</span>自动化只能产生待审队列</li>
            <li><span>02</span>许可证与可用性变化默认高风险</li>
            <li><span>03</span>失败保留上一版稳定内容</li>
          </ol>
        </aside>
      </section>

      <section className="section shell" aria-labelledby="history-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">已审核变更</p>
            <h2 id="history-title">更新日志</h2>
          </div>
          <p className="updates-note">RSS 现在就可以订阅；邮件订阅将在服务器数据库接入后开放。</p>
        </div>
        <ol className="update-history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.publishedAt}>{formatDate.format(new Date(entry.publishedAt))}</time>
              <article>
                <p className="update-kind">
                  {entry.kind === "catalog_release" ? "目录版本" : "项目更新"}
                </p>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
                {entry.changeKinds.length > 0 && (
                  <ul className="tag-list">
                    {entry.changeKinds.map((kind) => <li key={kind}>{updateChangeLabels[kind]}</li>)}
                  </ul>
                )}
                {entry.projectSlug && (
                  <Link className="text-link" href={`/projects/${entry.projectSlug}`}>
                    查看项目 <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
