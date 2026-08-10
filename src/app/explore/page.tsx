import type { Metadata } from "next";

import { ExplorePanel } from "@/components/explore-panel";
import { getPublishedProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "进阶项目库",
  description: "按难度、项目类型、学习目标和技术栈筛选值得复刻的开源案例。",
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const projects = getPublishedProjects();
  const query = await searchParams;

  return (
    <div className="shell page-shell">
      <header className="page-heading explore-heading">
        <p className="eyebrow">EXPLORE / 进阶项目库</p>
        <h1>已经做过一个？现在来拆成熟项目。</h1>
        <p>
          30 个经过事实核对和编辑审核的开源案例。如果你还没做过第一个作品，建议先去“新手开始”。
        </p>
      </header>
      <ExplorePanel
        projects={projects}
        initialFilters={{
          category: firstValue(query.category) ?? "",
          learningGoal: firstValue(query.goal) ?? "",
          techStack: firstValue(query.tech) ?? "",
        }}
      />
    </div>
  );
}
