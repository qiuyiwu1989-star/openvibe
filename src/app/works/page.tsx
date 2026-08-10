import type { Metadata } from "next";

import { WorksDashboard } from "@/components/works-dashboard";
import { getBeginnerMissions } from "@/lib/beginner-missions";

export const metadata: Metadata = {
  title: "我的作品",
  description: "继续制作、查看完成作品，并记录你亲自做出的关键决定。",
};

export default function WorksPage() {
  const missions = getBeginnerMissions();
  return (
    <div className="shell page-shell works-page">
      <header className="page-heading">
        <p className="eyebrow">MY WORKS / 我的作品</p>
        <h1>不数打了几个勾，记住你成为了哪些作品的作者。</h1>
        <p>这里保留作品进度、你的署名、亲自做出的决定，以及下一次想改的地方。</p>
      </header>
      <WorksDashboard missions={missions.map(({ slug, title, outcome }) => ({ slug, title, outcome }))} />
    </div>
  );
}
