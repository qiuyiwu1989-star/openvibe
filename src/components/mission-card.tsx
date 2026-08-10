import Link from "next/link";

import type { BeginnerMission } from "../../packages/schema/src/index";

const trackLabels = {
  "personal-page": "个人网页",
  "small-tool": "小工具",
  interaction: "交互练习",
  "mini-game": "小游戏",
} as const;

type MissionCardProps = {
  mission: BeginnerMission;
  index: number;
};

export function MissionCard({ mission, index }: MissionCardProps) {
  return (
    <article className="mission-card">
      <div className="mission-card-topline">
        <span>{String(index).padStart(2, "0")}</span>
        <span>{trackLabels[mission.track]}</span>
      </div>
      <div className="mission-card-main">
        <p className="mission-time">≈ {mission.time.firstVisibleMinutes} 分钟看到变化</p>
        <h3>
          <Link href={`/start/${mission.slug}`}>{mission.title}</Link>
        </h3>
        <p>{mission.tagline}</p>
      </div>
      <div className="mission-outcome">
        <span>你会做出</span>
        <p>{mission.outcome}</p>
      </div>
      <div className="mission-card-footer">
        <ul aria-label="使用技术">
          {mission.tools.slice(0, 3).map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
        <Link className="text-link" href={`/start/${mission.slug}`}>
          开始做 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export { trackLabels };
