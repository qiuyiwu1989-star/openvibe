import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "筛选方法",
  description: "OpenVibe 如何为第一次做作品的人设计入口，并选择、评分和审核进阶项目。",
};

const scoreDimensions = [
  ["可复刻性", "25", "依赖和运行成本是否可控，能否快速改成自己的版本。"],
  ["文档与代码清晰度", "20", "README 能否指路，目录与模块边界是否容易理解。"],
  ["新手学习价值", "20", "是否能建立产品与代码的连接，而不只是跑起一个 demo。"],
  ["产品完整度", "15", "有没有清晰用户、问题与可验证的主链路。"],
  ["vibe coding 代表性", "10", "是否适合用 AI 协作完成理解、修改和再创作。"],
  ["活跃度", "5", "近期更新与维护状态，只是辅助信号。"],
  ["新颖性", "5", "能否带来新的产品角度或工程思路。"],
] as const;

export default function MethodologyPage() {
  return (
    <div className="method-page">
      <section className="method-hero shell">
        <p className="eyebrow">METHODOLOGY / 筛选方法</p>
        <h1>先让人成为作者，再让他看懂更大的系统。</h1>
        <p>
          新手层用小作品建立“我能做”的经验；进阶层才用经过核对的开源项目学产品架构。AI 可以协助实现，但意图、判断和署名不能外包。
        </p>
      </section>

      <section className="method-principles">
        <div className="shell principle-grid">
          <article>
            <span>01</span>
            <h2>先作品，后系统</h2>
            <p>第一层任务要在 15 分钟内看到变化，2 小时内完成，不需要后端或付费服务。</p>
          </article>
          <article>
            <span>02</span>
            <h2>事实不写成观点</h2>
            <p>语言、许可证、更新时间等事实来自 GitHub 快照；难度与学习价值则必须留下编辑理由。</p>
          </article>
          <article>
            <span>03</span>
            <h2>自动化不等于自动发布</h2>
            <p>系统可以发现和整理候选，但只有通过审核的学习卡才会公开。</p>
          </article>
        </div>
      </section>

      <section className="section shell" aria-labelledby="score-title">
        <div className="method-section-heading">
          <div>
            <p className="eyebrow">100 分学习价值模型</p>
            <h2 id="score-title">七个维度，但分数不是结论</h2>
          </div>
          <p>分数用来初筛和排序，最终依然要看每个维度背后的说明。</p>
        </div>

        <div className="score-table" role="table" aria-label="学习价值评分维度">
          {scoreDimensions.map(([name, score, description], index) => (
            <div className="score-row" role="row" key={name}>
              <span className="score-index" role="cell">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong role="cell">{name}</strong>
              <p role="cell">{description}</p>
              <span className="score-weight" role="cell">
                {score} 分
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell publish-flow">
          <div>
            <p className="eyebrow">发布门槛</p>
            <h2>从被发现，到值得被看见</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>发现与抓取</strong>
              <p>收集仓库事实，不运行第三方代码。</p>
            </li>
            <li>
              <span>02</span>
              <strong>初筛与生成</strong>
              <p>去掉缺许可证、无文档或无学习价值的候选。</p>
            </li>
            <li>
              <span>03</span>
              <strong>事实校验</strong>
              <p>检查技术栈、路径与风险是否有可追溯依据。</p>
            </li>
            <li>
              <span>04</span>
              <strong>人工审核发布</strong>
              <p>批准编辑判断，再进入稳定的学习案例库。</p>
            </li>
            <li>
              <span>05</span>
              <strong>每周重新核对</strong>
              <p>自动识别 README、许可证、技术栈与维护状态变化，依然先审后更新。</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="method-cta shell">
        <p>方法不是为了证明我们会打分，而是让你更快获得第一次作者经验。</p>
        <Link className="button button-primary" href="/start">
          去做第一个作品 <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
