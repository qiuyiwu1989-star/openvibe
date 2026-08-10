import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PromptCopy } from "@/components/prompt-copy";
import { trackLabels } from "@/components/mission-card";
import { getBeginnerMissionBySlug, getBeginnerMissions } from "@/lib/beginner-missions";

type MissionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getBeginnerMissions().map((mission) => ({ slug: mission.slug }));
}

export async function generateMetadata({ params }: MissionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const mission = getBeginnerMissionBySlug(slug);
  if (!mission) return { title: "任务未找到" };

  return {
    title: mission.title,
    description: mission.tagline,
  };
}

export default async function MissionPage({ params }: MissionPageProps) {
  const { slug } = await params;
  const mission = getBeginnerMissionBySlug(slug);
  if (!mission) notFound();

  return (
    <article className="mission-page">
      <section className="shell mission-hero">
        <nav className="breadcrumb" aria-label="面包屑导航">
          <Link href="/start">新手开始</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{mission.title}</span>
        </nav>
        <p className="eyebrow">{trackLabels[mission.track]} · {mission.level === "first-step" ? "第一步" : "跟做练习"}</p>
        <h1>{mission.title}</h1>
        <p className="mission-lead">{mission.tagline}</p>
        <div className="mission-hero-actions">
          <a className="button button-primary" href={mission.source.url} target="_blank" rel="noreferrer">
            打开原项目 <span aria-hidden="true">↗</span>
          </a>
          <a className="button button-ghost" href="#first-change">先做第一个变化</a>
        </div>
        <dl className="mission-facts">
          <div><dt>看到第一个变化</dt><dd>{mission.time.firstVisibleMinutes} 分钟内</dd></div>
          <div><dt>做出完整版本</dt><dd>{mission.time.completeMinutes} 分钟内</dd></div>
          <div><dt>运行方式</dt><dd>{mission.runMode}</dd></div>
          <div><dt>使用的积木</dt><dd>{mission.tools.join(" / ")}</dd></div>
        </dl>
      </section>

      <div className="shell mission-content">
        <main>
          <section className="mission-callout" id="first-change">
            <p className="eyebrow">FIRST VISIBLE CHANGE</p>
            <h2>先做这一件事</h2>
            <p>{mission.firstChange}</p>
          </section>

          <section className="content-block" aria-labelledby="steps-title">
            <p className="eyebrow">三段路径</p>
            <h2 id="steps-title">从第一个变化，到你的版本</h2>
            <div className="beginner-steps">
              {mission.steps.map((step, index) => (
                <article key={step.title}>
                  <div className="beginner-step-number">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.time}</strong>
                  </div>
                  <div>
                    <h3>{step.title}</h3>
                    <ol>
                      {step.actions.map((action) => <li key={action}>{action}</li>)}
                    </ol>
                    <p><strong>做完的标志：</strong>{step.doneWhen}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="content-block" aria-labelledby="prompt-title">
            <p className="eyebrow">AI 协作提示词</p>
            <h2 id="prompt-title">让 AI 带路，不让它抢走决定</h2>
            <PromptCopy prompt={mission.aiPrompt} />
          </section>
        </main>

        <aside className="mission-side">
          <section className="side-card maker-decision-card">
            <p className="eyebrow">MAKER DECISION</p>
            <h2>这一件事必须你决定</h2>
            <p>{mission.makerDecision}</p>
          </section>
          <section className="side-card">
            <p className="eyebrow">你会做出</p>
            <h2>一个可以展示的作品</h2>
            <p>{mission.outcome}</p>
          </section>
          <section className="side-card mission-source-card">
            <p className="eyebrow">源项目</p>
            <h2>向开源作者学习</h2>
            <p><code>{mission.source.repository}/{mission.source.path}</code></p>
            <p>{mission.source.license} 许可证 · 核对于 {mission.verifiedAt.slice(0, 10)}</p>
            <a className="text-link" href={mission.source.url} target="_blank" rel="noreferrer">
              查看源代码 <span aria-hidden="true">↗</span>
            </a>
          </section>
          <section className="side-card signature-card">
            <p className="eyebrow">SIGN YOUR WORK</p>
            <h2>完成后，署上你的名字</h2>
            <p>记下你改了什么、为什么这样决定，再把作品展示给一个真实的人。</p>
          </section>
        </aside>
      </div>
    </article>
  );
}
