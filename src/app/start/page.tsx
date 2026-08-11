import type { Metadata } from "next";

import { StartMissionExplorer } from "@/components/start-mission-explorer";
import { getBeginnerMissions } from "@/lib/beginner-missions";

export const metadata: Metadata = {
  title: "K12 分龄作品入口",
  description: "从小学低段到高中，按成长阶段和兴趣找到 15 分钟可见变化的创造者学习案例。",
};

export default function StartPage() {
  const missions = getBeginnerMissions();

  return (
    <div className="start-page">
      <section className="start-hero shell">
        <div>
          <p className="eyebrow">K12 START / 分龄作品入口</p>
          <h1>每个年龄，都可以成为作品的作者。</h1>
          <p>
            从一个看得见的小变化开始。年龄只是推荐，不是限制；每个任务都不要后端、不要付费 API，
            并把孩子亲自决定的部分说清楚。
          </p>
        </div>
        <div className="start-gates" aria-label="新手任务收录标准">
          <div><strong>≤ 15</strong><span>分钟看到变化</span></div>
          <div><strong>≤ 2h</strong><span>做出可分享版本</span></div>
          <div><strong>0</strong><span>付费服务与后端</span></div>
        </div>
      </section>

      <section className="maker-contract">
        <div className="shell maker-contract-grid">
          <div>
            <p className="eyebrow">AI 是协作者</p>
            <h2>让 AI 帮你找代码，但作品还是你的。</h2>
          </div>
          <dl>
            <div><dt>AI 可以</dt><dd>定位文件、解释代码、实现你已经做出的决定。</dd></div>
            <div><dt>你必须</dt><dd>决定为谁做、什么算好，并为最终版本署上自己的名字。</dd></div>
          </dl>
        </div>
      </section>

      <div className="shell">
        <StartMissionExplorer missions={missions} />
      </div>
    </div>
  );
}
