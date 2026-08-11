import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionCard } from "@/components/mission-card";
import { getBeginnerMissions } from "@/lib/beginner-missions";
import { k12AgeBandAges, k12AgeBandLabels } from "@/lib/k12";
import { getLearningPathBySlug, getLearningPaths } from "@/lib/learning-paths";

type LearningPathPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getLearningPaths().map((learningPath) => ({ slug: learningPath.slug }));
}

export async function generateMetadata({ params }: LearningPathPageProps): Promise<Metadata> {
  const { slug } = await params;
  const learningPath = getLearningPathBySlug(slug);
  if (!learningPath) return { title: "学习路线未找到" };
  return { title: learningPath.title, description: learningPath.tagline };
}

export default async function LearningPathPage({ params }: LearningPathPageProps) {
  const { slug } = await params;
  const learningPath = getLearningPathBySlug(slug);
  if (!learningPath) notFound();

  const missionMap = new Map(getBeginnerMissions().map((mission) => [mission.slug, mission]));
  const missions = learningPath.missionSlugs.map((missionSlug) => missionMap.get(missionSlug));
  if (missions.some((mission) => !mission)) notFound();
  const routeMissions = missions.filter((mission) => mission !== undefined);

  return (
    <article className="learning-path-page">
      <section className="path-detail-hero shell">
        <nav className="breadcrumb" aria-label="面包屑导航">
          <Link href="/paths">学习路线</Link><span aria-hidden="true">/</span><span aria-current="page">{learningPath.title}</span>
        </nav>
        <div className="path-detail-badges">
          <span>{k12AgeBandLabels[learningPath.ageBand]} · {k12AgeBandAges[learningPath.ageBand]}</span>
          <span>4 周</span><span>5 个案例选 1 个</span>
        </div>
        <h1>{learningPath.title}</h1>
        <p>{learningPath.tagline}</p>
        <div className="path-detail-actions">
          <a className="button button-primary" href="#choose-work">先选择作品 <span aria-hidden="true">↓</span></a>
          <a className="button button-ghost" href="#facilitator-guide">查看引导卡</a>
          <Link className="button button-ghost" href={`/pilot?path=${learningPath.slug}`}>记录一次试教</Link>
        </div>
        <div className="path-outcome-panel"><span>四周后</span><p>{learningPath.outcome}</p></div>
      </section>

      <section className="section shell" aria-labelledby="four-week-title">
        <div className="section-heading"><div><p className="eyebrow">4-WEEK ARC</p><h2 id="four-week-title">四周只围绕一件作品</h2></div></div>
        <ol className="four-week-grid">
          {learningPath.weeks.map((week) => (
            <li key={week.week}>
              <div className="week-heading"><span>W{week.week}</span><h3>{week.title}</h3></div>
              <p>{week.focus}</p>
              <ul>{week.actions.map((action) => <li key={action}>{action}</li>)}</ul>
              <dl><div><dt>留下的证据</dt><dd>{week.evidence}</dd></div><div><dt>引导者动作</dt><dd>{week.facilitatorMove}</dd></div></dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-tinted" id="choose-work" aria-labelledby="choose-work-title">
        <div className="shell">
          <div className="section-heading"><div><p className="eyebrow">CHOOSE ONE / 五选一</p><h2 id="choose-work-title">兴趣决定从哪里进入</h2></div><p className="paths-section-note">不用完成全部五个。选择最想做的一件，沿四周路线把它做到真实可用。</p></div>
          <div className="mission-grid">
            {routeMissions.map((mission, index) => <MissionCard key={mission.slug} mission={mission} index={index + 1} />)}
          </div>
        </div>
      </section>

      <section className="section shell facilitator-guide" id="facilitator-guide" aria-labelledby="guide-title">
        <div className="guide-heading"><div><p className="eyebrow">FACILITATOR CARD / 教师与家长引导卡</p><h2 id="guide-title">守住有价值的挣扎</h2><p>{learningPath.guide.forWhom}</p></div><p className="guide-privacy"><strong>隐私边界</strong>{learningPath.guide.privacyReminder}</p></div>
        <div className="guide-grid">
          <article><h3>开始前准备</h3><ul>{learningPath.guide.preparation.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>可以这样追问</h3><ul>{learningPath.guide.questions.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>重点观察</h3><ul>{learningPath.guide.observe.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>反馈协议</h3><ol>{learningPath.guide.feedbackProtocol.map((item) => <li key={item}>{item}</li>)}</ol></article>
        </div>
        <div className="showcase-panel"><div><p className="eyebrow">最终展示</p><h3>让作品说话，让作者回答。</h3><p>{learningPath.guide.showcase}</p></div><ul>{learningPath.successCriteria.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>
    </article>
  );
}
