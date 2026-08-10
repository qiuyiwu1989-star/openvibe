import type { Metadata } from "next";

import { MissionCard, trackLabels } from "@/components/mission-card";
import { getBeginnerMissions } from "@/lib/beginner-missions";

export const metadata: Metadata = {
  title: "第一次做作品",
  description: "不用先学会框架，从 15 分钟可见变化的小任务开始做出第一个作品。",
};

const trackDescriptions = {
  "personal-page": "把你的身份和想法放到网页上",
  "small-tool": "解决一个自己真的会遇到的小问题",
  interaction: "亲手做出点击、状态和反馈",
  "mini-game": "用规则、胜负和反馈理解程序",
} as const;

export default function StartPage() {
  const missions = getBeginnerMissions();
  const tracks = Object.keys(trackLabels) as Array<keyof typeof trackLabels>;

  return (
    <div className="start-page">
      <section className="start-hero shell">
        <div>
          <p className="eyebrow">START / 第一次做作品</p>
          <h1>不懂框架，也可以先做出一个东西。</h1>
          <p>
            从一个看得见的小变化开始。每个任务都不要后端、不要付费 API，
            并且把第一次修改和完成标志说清楚。
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

      <section className="section shell" aria-labelledby="mission-list-title">
        <div className="section-heading start-section-heading">
          <div>
            <p className="eyebrow">{missions.length} 个新手任务</p>
            <h2 id="mission-list-title">选一个你真想做的</h2>
          </div>
          <p>不用按顺序。兴趣比“正确路线”更能帮你完成第一个作品。</p>
        </div>

        {tracks.map((track) => {
          const trackMissions = missions.filter((mission) => mission.track === track);
          return (
            <section className="mission-track" key={track} id={track}>
              <header>
                <h3>{trackLabels[track]}</h3>
                <p>{trackDescriptions[track]}</p>
              </header>
              <div className="mission-grid">
                {trackMissions.map((mission) => (
                  <MissionCard
                    key={mission.slug}
                    mission={mission}
                    index={missions.indexOf(mission) + 1}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}
