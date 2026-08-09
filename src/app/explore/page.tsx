import type { Metadata } from "next";

import { ExplorePanel } from "@/components/explore-panel";
import { getPublishedProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "发现项目",
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
        <p className="eyebrow">EXPLORE / 发现</p>
        <h1>找一个今天就能动手的案例</h1>
        <p>
          这里不追求仓库越多越好。每一个项目都要能回答：你会学到什么，以及第一步怎么走。
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
