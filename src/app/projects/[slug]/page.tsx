import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  audienceLabels,
  categoryLabels,
  difficultyLabels,
  labelFor,
  learningGoalLabels,
  riskLabels,
  riskSeverityLabels,
} from "@/lib/labels";
import { formatCount, formatDate, getProjectBySlug, getPublishedProjects } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

const scoreLabels: Record<string, string> = {
  replicability: "可复刻性",
  clarity: "文档与代码清晰度",
  beginnerValue: "新手学习价值",
  productCompleteness: "产品完整度",
  vibeCodingRelevance: "vibe coding 代表性",
  maintenance: "活跃度",
  novelty: "新颖性",
};

const scoreMax: Record<string, number> = {
  replicability: 25,
  clarity: 20,
  beginnerValue: 20,
  productCompleteness: 15,
  vibeCodingRelevance: 10,
  maintenance: 5,
  novelty: 5,
};

const sourceLabels = {
  repository: "GitHub 仓库",
  readme: "README",
  file: "代码与配置",
  release: "发布记录",
  external: "外部资料",
} as const;

const learningPathLabels = {
  thirtyMinutes: { number: "01", time: "30 分钟", action: "先跑通" },
  twoHours: { number: "02", time: "2 小时", action: "动手改" },
  oneDay: { number: "03", time: "1 天", action: "做变体" },
} as const;

export function generateStaticParams() {
  return getPublishedProjects().map((project) => ({ slug: project.publication.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return { title: "项目未找到" };

  return {
    title: project.editorial.displayName,
    description: project.editorial.tagline,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const { snapshot, editorial } = project;
  const scoreEntries = Object.entries(editorial.score.rationale) as Array<
    [keyof typeof editorial.score.rationale, string]
  >;
  const pathEntries = Object.entries(editorial.learningPath) as Array<
    [keyof typeof editorial.learningPath, (typeof editorial.learningPath)[keyof typeof editorial.learningPath]]
  >;

  return (
    <article className="project-page">
      <div className="shell project-hero">
        <nav className="breadcrumb" aria-label="面包屑导航">
          <Link href="/explore">进阶项目库</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{snapshot.fullName}</span>
        </nav>

        <div className="project-title-grid">
          <div>
            <p className="repo-name">{snapshot.fullName}</p>
            <h1>{editorial.displayName}</h1>
            <p className="project-lead">{editorial.tagline}</p>
            <div className="project-actions">
              <a className="button button-primary" href={snapshot.htmlUrl} target="_blank" rel="noreferrer">
                在 GitHub 查看 <span aria-hidden="true">↗</span>
              </a>
              <a className="button button-ghost" href="#learning-path">
                从 30 分钟挑战开始
              </a>
            </div>
          </div>
          <aside className="score-hero" aria-label={`学习价值 ${editorial.score.total} 分`}>
            <div>
              <strong>{editorial.score.total}</strong>
              <span>/ 100</span>
            </div>
            <p>学习价值</p>
            <small>不是热度榜单分</small>
          </aside>
        </div>

        <dl className="project-facts">
          <div>
            <dt>难度</dt>
            <dd>
              <span className={`difficulty-badge difficulty-${editorial.difficulty.level}`}>
                {labelFor(difficultyLabels, editorial.difficulty.level)}
              </span>
            </dd>
          </div>
          <div>
            <dt>适合</dt>
            <dd>{editorial.audiences.map((item) => labelFor(audienceLabels, item)).join(" / ")}</dd>
          </div>
          <div>
            <dt>主要语言</dt>
            <dd>{snapshot.primaryLanguage ?? "未知"}</dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd>★ {formatCount(snapshot.metrics.stars)}</dd>
          </div>
          <div>
            <dt>许可证</dt>
            <dd>{snapshot.license?.spdxId ?? "未标注"}</dd>
          </div>
          <div>
            <dt>快照日期</dt>
            <dd>{formatDate(snapshot.timestamps.fetchedAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="shell project-content">
        <div className="project-main-column">
          <section className="content-block" aria-labelledby="why-title">
            <p className="eyebrow">先判断要不要学</p>
            <h2 id="why-title">这个项目值得拆什么？</h2>
            <p className="content-lead">{editorial.summary}</p>
            <ol className="reason-list">
              {editorial.recommendationReasons.map((reason, index) => (
                <li key={reason}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{reason}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="content-block" aria-labelledby="learn-title">
            <p className="eyebrow">可以学什么</p>
            <h2 id="learn-title">不只是看代码，而是找到产品的骨架</h2>
            <ul className="learning-goal-list">
              {editorial.learningGoals.map((goal) => (
                <li key={goal}>{labelFor(learningGoalLabels, goal)}</li>
              ))}
            </ul>
            <div className="highlight-grid">
              {editorial.learningHighlights.map((highlight, index) => (
                <article key={highlight.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.description}</p>
                  <small>{highlight.evidencePaths.join(" · ")}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="content-block learning-path-block" id="learning-path" aria-labelledby="path-title">
            <p className="eyebrow">三段学习路径</p>
            <h2 id="path-title">从理解、修改到做出你的版本</h2>
            <div className="learning-path">
              {pathEntries.map(([key, path]) => {
                const label = learningPathLabels[key];
                return (
                  <article key={key}>
                    <div className="path-label">
                      <span>{label.number}</span>
                      <strong>{label.time}</strong>
                      <small>{label.action}</small>
                    </div>
                    <div className="path-copy">
                      <h3>{path.objective}</h3>
                      <ol>
                        {path.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <p>
                        <strong>完成标志：</strong>
                        {path.outcome}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="content-block" aria-labelledby="score-detail-title">
            <p className="eyebrow">评分解释</p>
            <h2 id="score-detail-title">每一分都要说清楚为什么</h2>
            <div className="score-detail-list">
              {scoreEntries.map(([key, rationale]) => {
                const value = editorial.score[key];
                const max = scoreMax[key] ?? 100;
                return (
                  <div key={key}>
                    <div className="score-detail-heading">
                      <strong>{scoreLabels[key]}</strong>
                      <span>
                        {value} / {max}
                      </span>
                    </div>
                    <meter min="0" max={max} value={typeof value === "number" ? value : 0}>
                      {typeof value === "number" ? value : 0} / {max}
                    </meter>
                    <p>{rationale}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="project-side-column">
          <section className="side-card">
            <p className="eyebrow">上手前准备</p>
            <h2>你需要什么</h2>
            <p>{editorial.difficulty.rationale}</p>
            <ul className="check-list">
              {editorial.difficulty.prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="side-card">
            <p className="eyebrow">技术栈</p>
            <h2>先认出这些积木</h2>
            <dl className="tech-list">
              {editorial.techStack.map((item) => (
                <div key={item.name}>
                  <dt>{item.name}</dt>
                  <dd>{item.role}</dd>
                  <dd className={`confidence confidence-${item.confidence}`}>
                    {item.confidence === "confirmed"
                      ? "已确认"
                      : item.confidence === "inferred"
                        ? "根据代码推断"
                        : "未确认"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="side-card">
            <p className="eyebrow">建议阅读顺序</p>
            <h2>先看地图，再进代码</h2>
            <ol className="reading-list">
              {editorial.readingGuide.map((item, index) => (
                <li key={item.path}>
                  <span>{index + 1}</span>
                  <div>
                    <code>{item.path}</code>
                    <p>{item.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="side-card risk-card">
            <p className="eyebrow">上手风险</p>
            <h2>先知道哪里可能卡住</h2>
            {editorial.risks.length > 0 ? (
              <ul className="risk-list">
                {editorial.risks.map((risk) => (
                  <li key={`${risk.kind}-${risk.note}`}>
                    <div>
                      <strong>{labelFor(riskLabels, risk.kind)}</strong>
                      <span className={`risk-${risk.severity}`}>
                        {labelFor(riskSeverityLabels, risk.severity)}风险
                      </span>
                    </div>
                    <p>{risk.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>未记录明显风险，仍建议先阅读仓库的环境说明。</p>
            )}
          </section>

          <section className="side-card source-card">
            <p className="eyebrow">依据与更新</p>
            <h2>事实从哪来</h2>
            <ul>
              {editorial.sources.map((source) => (
                <li key={`${source.kind}-${source.url}`}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {sourceLabels[source.kind]}
                    <span aria-hidden="true">↗</span>
                  </a>
                  <small>访问于 {formatDate(source.accessedAt)}</small>
                </li>
              ))}
            </ul>
            <p className="review-note">
              编辑版本 v{project.publication.editorialVersion} · 复核于{" "}
              {project.publication.lastReviewedAt ? formatDate(project.publication.lastReviewedAt) : "未记录"}
            </p>
          </section>
        </aside>
      </div>
    </article>
  );
}
