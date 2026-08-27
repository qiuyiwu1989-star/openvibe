import type { Metadata } from "next";
import Link from "next/link";

import { StartMissionExplorer } from "@/components/start-mission-explorer";
import { getBeginnerMissions } from "@/lib/beginner-missions";

export const metadata: Metadata = {
  title: "全年龄作品入口",
  description: "无论几岁，都可以按兴趣找到 15 分钟看到变化的创造者学习案例；K12 学习者另有可选分龄建议。",
};

export default function StartPage() {
  const missions = getBeginnerMissions();

  return (
    <div className="start-page">
      <section className="start-hero shell">
        <div>
          <p className="eyebrow">START MAKING / 全年龄作品入口</p>
          <h1>每个年龄，都可以成为作品的作者。</h1>
          <p>
            儿童、青少年、大学生、职场人或退休后的探索者，都可以从一个看得见的小变化开始。
            先按兴趣选作品；需要时再用年龄建议调整表达、支持和安全边界。
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

      <section className="path-invitation shell">
        <div><p className="eyebrow">想连续学四周？</p><h2>选一条路线，只把一件作品做到真实可用。</h2></div>
        <Link className="button button-dark" href="/paths">查看 K12 分龄路线 <span aria-hidden="true">→</span></Link>
      </section>

      <div className="shell">
        <StartMissionExplorer missions={missions} />
      </div>
    </div>
  );
}
