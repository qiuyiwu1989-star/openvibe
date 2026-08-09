import Link from "next/link";

import { ProjectCard } from "@/components/project-card";
import { categoryLabels, learningGoalLabels } from "@/lib/labels";
import { getPublishedProjects } from "@/lib/projects";

const featuredCategories = ["ai-app", "saas", "agent", "developer-tool"];
const featuredGoals = ["ui", "product-architecture", "ai-integration", "project-organization"];

export default function HomePage() {
  const projects = getPublishedProjects();
  const featured = projects.slice(0, 3);

  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            为 vibe coding 初学者编辑
          </p>
          <h1>
            别只看 Star。
            <br />
            <span>找一个真能学会的项目。</span>
          </h1>
          <p className="hero-intro">
            我们把 GitHub 仓库整理成中文学习卡：适合谁、值得学什么、
            30 分钟从哪里开始。少一点收藏，多一次动手。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/explore">
              开始找案例 <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-ghost" href="/methodology">
              我们怎么挑项目
            </Link>
          </div>
        </div>

        <aside className="hero-radar" aria-label="开源雷达的三个筛选问题">
          <div className="radar-orbit orbit-one" />
          <div className="radar-orbit orbit-two" />
          <div className="radar-sweep" />
          <div className="radar-core">学</div>
          <div className="radar-note note-one">
            <span>01</span>
            值得学吗？
          </div>
          <div className="radar-note note-two">
            <span>02</span>
            适合我吗？
          </div>
          <div className="radar-note note-three">
            <span>03</span>
            从哪开始？
          </div>
        </aside>
      </section>

      <section className="signal-strip" aria-label="开源雷达特点">
        <div className="shell signal-grid">
          <p>
            <strong>学习价值</strong>
            排在热度之前
          </p>
          <p>
            <strong>中文策展</strong>
            不停在 README 摘要
          </p>
          <p>
            <strong>3 段路径</strong>
            30 分钟 · 2 小时 · 1 天
          </p>
        </div>
      </section>

      <section className="section shell" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">本期样板</p>
            <h2 id="featured-title">先拆一个小而完整的项目</h2>
          </div>
          <Link className="text-link" href="/explore">
            查看全部 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="project-grid">
          {featured.map((project, index) => (
            <ProjectCard key={project.snapshot.repositoryId} project={project} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="section section-tinted">
        <div className="shell browse-grid">
          <div className="browse-intro">
            <p className="eyebrow">从你的目标出发</p>
            <h2>我想做什么？</h2>
            <p>
              不需要先知道正确的技术名词。选一个想做的产品，再看它怎么被组织出来。
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
