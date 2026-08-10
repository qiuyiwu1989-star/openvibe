import Link from "next/link";

import { MissionCard } from "@/components/mission-card";
import { ProjectCard } from "@/components/project-card";
import { getBeginnerMissions } from "@/lib/beginner-missions";
import { categoryLabels, learningGoalLabels } from "@/lib/labels";
import { getPublishedProjects } from "@/lib/projects";

const featuredCategories = ["ai-app", "saas", "agent", "developer-tool"];
const featuredGoals = ["ui", "product-architecture", "ai-integration", "project-organization"];

export default function HomePage() {
  const projects = getPublishedProjects();
  const missions = getBeginnerMissions();
  const firstMissions = missions.slice(0, 3);
  const featured = projects.slice(0, 3);

  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            {missions.length} 个第一次做作品任务 · 不需要先懂框架
          </p>
          <h1>
            先做出一个东西。
            <br />
            <span>再慢慢看懂代码。</span>
          </h1>
          <p className="hero-intro">
            不用从技术名词开始。选一个你真想做的小作品，让 AI 帮你找路，
            你亲自决定它为谁而做、什么才算完成。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/start">
              开始第一个作品 <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-ghost" href="/explore">
              我想看进阶案例
            </Link>
          </div>
        </div>

        <aside className="hero-radar" aria-label="OpenVibe Atlas 的三个筛选问题">
          <div className="radar-orbit orbit-one" />
          <div className="radar-orbit orbit-two" />
          <div className="radar-sweep" />
          <div className="radar-core">做</div>
          <div className="radar-note note-one">
            <span>01</span>
            想做什么？
          </div>
          <div className="radar-note note-two">
            <span>02</span>
            先改哪里？
          </div>
          <div className="radar-note note-three">
            <span>03</span>
            怎样算完成？
          </div>
        </aside>
      </section>

      <section className="signal-strip" aria-label="OpenVibe Atlas 特点">
        <div className="shell signal-grid">
          <p>
            <strong>≤ 15 分钟</strong>
            看到第一个变化
          </p>
          <p>
            <strong>≤ 2 小时</strong>
            做出可分享版本
          </p>
          <p>
            <strong>0 付费服务</strong>
            不要后端与 API Key
          </p>
        </div>
      </section>

      <section className="section shell" aria-labelledby="first-missions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">从这里起步</p>
            <h2 id="first-missions-title">先选一个当天能做完的</h2>
          </div>
          <Link className="text-link" href="/start">
            查看 {missions.length} 个任务 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mission-grid">
          {firstMissions.map((mission, index) => (
            <MissionCard key={mission.slug} mission={mission} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="section section-tinted">
        <div className="shell browse-grid">
          <div className="browse-intro">
            <p className="eyebrow">已经做过一个？</p>
            <h2>再拆成熟项目</h2>
            <p>
              {projects.length} 个已审核的开源案例，适合在有了第一次作品经验后，继续学产品架构和项目组织。
            </p>
          </div>
          <div className="link-tiles" aria-label="按项目类型浏览">
            {featuredCategories.map((category, index) => (
              <Link href={`/explore?category=${category}`} key={category}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{categoryLabels[category]}</strong>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">进阶精选 · {featured.length} 个</p>
            <h2 id="featured-title">看成熟作品怎么被组织出来</h2>
          </div>
          <Link className="text-link" href="/explore">
            进入进阶项目库 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="project-grid">
          {featured.map((project, index) => (
            <ProjectCard key={project.snapshot.repositoryId} project={project} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="section shell">
        <div className="goal-board">
          <div>
            <p className="eyebrow">我想练什么</p>
            <h2>把“看懂”变成一次具体的练习</h2>
          </div>
          <div className="goal-links">
            {featuredGoals.map((goal) => (
              <Link href={`/explore?goal=${goal}`} key={goal}>
                {learningGoalLabels[goal]} <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
