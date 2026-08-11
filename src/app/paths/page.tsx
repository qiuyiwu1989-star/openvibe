import type { Metadata } from "next";
import Link from "next/link";

import { LearningPathCard } from "@/components/learning-path-card";
import { getLearningPaths } from "@/lib/learning-paths";

export const metadata: Metadata = {
  title: "K12 四周学习路线",
  description: "从小学低段到高中，用四周完成问题、作品、反馈和作者身份的学习闭环。",
};

export default function LearningPathsPage() {
  const learningPaths = getLearningPaths();

  return (
    <div className="paths-page">
      <section className="paths-hero shell">
        <div>
          <p className="eyebrow">K12 PATHS / 创造者学习路线</p>
          <h1>不是多做几个练习，<br /><span>而是完成一次作者旅程。</span></h1>
          <p>每条路线提供 5 个案例作为选择，不要求全部完成。四周只围绕一件作品，经历意图、制作、反馈和署名。</p>
        </div>
        <dl className="paths-facts">
          <div><dt>年龄入口</dt><dd>4 个</dd></div>
          <div><dt>开源案例</dt><dd>20 个</dd></div>
          <div><dt>学习周期</dt><dd>4 周</dd></div>
        </dl>
      </section>

      <section className="paths-principles">
        <div className="shell paths-principle-grid">
          <article><span>01</span><h2>一条路线，只完成一件作品</h2><p>五个案例是选择池，不是作业清单。兴趣决定从哪里进入。</p></article>
          <article><span>02</span><h2>AI 加速实现，人保留判断</h2><p>意图、价值、亲身经历与署名责任始终由学习者承担。</p></article>
          <article><span>03</span><h2>作品走出去，反馈才发生</h2><p>不以分数排名；用真实使用、现场演示和答辩检验学习。</p></article>
        </div>
      </section>

      <section className="section shell" aria-labelledby="paths-list-title">
        <div className="section-heading">
          <div><p className="eyebrow">4 条分龄路线</p><h2 id="paths-list-title">选适合现在的起点</h2></div>
          <p className="paths-section-note">年龄只是推荐。更重要的是学习者是否真的想做，以及成人支持是否合适。</p>
        </div>
        <div className="learning-path-grid">
          {learningPaths.map((learningPath, index) => (
            <LearningPathCard key={learningPath.slug} learningPath={learningPath} index={index + 1} />
          ))}
        </div>
        <aside className="pilot-route-invitation">
          <div><p className="eyebrow">准备真实试教？</p><h2>带一条路线走进家庭、课堂或社团。</h2><p>用匿名汇总记录完成情况、主要卡点、成人介入和作者身份证据，为下一版路线留下依据。</p></div>
          <Link className="button button-dark" href="/pilot">打开试教工作台 <span aria-hidden="true">→</span></Link>
        </aside>
      </section>
    </div>
  );
}
