import type { Metadata } from "next";
import Link from "next/link";

import { PilotWorkbench } from "@/components/pilot-workbench";
import { getBeginnerMissions } from "@/lib/beginner-missions";
import { k12AgeBandAges, k12AgeBandLabels } from "@/lib/k12";
import { getLearningPaths } from "@/lib/learning-paths";

export const metadata: Metadata = {
  title: "匿名试教工作台",
  description: "为 OpenVibe 四周路线记录匿名试教结果、作者身份证据和下一轮改进。",
};

export default async function PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string | string[] }>;
}) {
  const query = await searchParams;
  const paths = getLearningPaths();
  const missions = getBeginnerMissions();
  const requestedPath = typeof query.path === "string" ? query.path : undefined;
  const initialPathSlug = paths.some((path) => path.slug === requestedPath) ? requestedPath : undefined;

  return (
    <div className="pilot-page">
      <header className="pilot-hero shell">
        <div>
          <p className="eyebrow">STAGE 11 / 真实试教</p>
          <h1>把教学直觉，变成下一次能用的证据。</h1>
          <p>这里不评价孩子，也不收集身份。它只帮助引导者看见：作品在哪里发生、学习者在哪里卡住、成人何时介入，以及作者身份是否真的出现。</p>
          <Link className="button button-primary pilot-guide-link" href="/pilot/guide">先看 90 分钟试教执行单</Link>
        </div>
        <aside>
          <strong>隐私承诺</strong>
          <p>所有记录仅保存在当前浏览器，不会自动上传。请只记录整场汇总，绝不填写姓名、学校或联系方式。</p>
        </aside>
      </header>
      <section className="pilot-observation-principles">
        <div className="shell">
          <article><span>01</span><h2>记录活动，不记录孩子</h2><p>只保留整场人数和教学现象，避免形成未成年人画像。</p></article>
          <article><span>02</span><h2>评价学习，不分拣人</h2><p>证据指向作品、决定和反馈，不形成分数、排名和标签。</p></article>
          <article><span>03</span><h2>每条记录都要导向修改</h2><p>记录不是归档终点；下一次改变什么，才是反馈闭环。</p></article>
        </div>
      </section>
      <div className="shell pilot-workbench">
        <PilotWorkbench
          paths={paths.map((path) => ({
            slug: path.slug,
            title: path.title,
            ageLabel: `${k12AgeBandLabels[path.ageBand]} · ${k12AgeBandAges[path.ageBand]}`,
            missionSlugs: path.missionSlugs,
          }))}
          missions={missions.map(({ slug, title }) => ({ slug, title }))}
          initialPathSlug={initialPathSlug}
        />
      </div>
    </div>
  );
}
