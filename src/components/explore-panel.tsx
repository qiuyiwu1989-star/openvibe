"use client";

import { useMemo, useState } from "react";

import { ProjectCard } from "@/components/project-card";
import {
  categoryLabels,
  difficultyLabels,
  labelFor,
  learningGoalLabels,
} from "@/lib/labels";
import type { RadarProject } from "@/lib/projects";

type ExplorePanelProps = {
  projects: RadarProject[];
  initialFilters?: {
    category?: string;
    learningGoal?: string;
    techStack?: string;
  };
};

const categories = Object.entries(categoryLabels);
const learningGoals = Object.entries(learningGoalLabels);
const difficulties = Object.entries(difficultyLabels);

const technologyFamilies: Array<{ label: string; pattern: RegExp }> = [
  { label: "Next.js", pattern: /next\.js/i },
  { label: "React", pattern: /\breact\b/i },
  { label: "TypeScript", pattern: /typescript/i },
  { label: "Python", pattern: /python|fastapi|django/i },
  { label: "Flutter", pattern: /flutter/i },
  { label: "Rust", pattern: /\brust\b/i },
  { label: "Go", pattern: /^go$/i },
  { label: "Vue", pattern: /\bvue\b/i },
  { label: "PostgreSQL", pattern: /postgres/i },
  { label: "SQLite", pattern: /sqlite|sql\.js/i },
  { label: "Redis", pattern: /redis/i },
  { label: "Prisma", pattern: /prisma/i },
  { label: "Tailwind CSS", pattern: /tailwind/i },
  { label: "Docker", pattern: /docker/i },
  { label: "AI / LLM", pattern: /\bai\b|llm|openai|langchain|langgraph|replicate|controlnet/i },
  { label: "Auth.js", pattern: /auth\.js|nextauth/i },
  { label: "Stripe", pattern: /stripe/i },
  { label: "tRPC", pattern: /trpc/i },
  { label: "Playwright", pattern: /playwright/i },
  { label: "Vite", pattern: /\bvite\b/i },
  { label: "Electron", pattern: /electron/i },
  { label: "Tauri", pattern: /tauri/i },
  { label: "pnpm / Turborepo", pattern: /pnpm|turborepo|turbo\b/i },
];

function technologyFamily(name: string) {
  return technologyFamilies.find(({ pattern }) => pattern.test(name))?.label ?? name.trim();
}

export function ExplorePanel({ projects, initialFilters }: ExplorePanelProps) {
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState(initialFilters?.category ?? "");
  const [learningGoal, setLearningGoal] = useState(initialFilters?.learningGoal ?? "");
  const [techStack, setTechStack] = useState(initialFilters?.techStack ?? "");

  const techStacks = useMemo(
    () => {
      const projectCounts = new Map<string, number>();

      for (const { editorial } of projects) {
        const families = new Set(editorial.techStack.map(({ name }) => technologyFamily(name)));
        for (const family of families) projectCounts.set(family, (projectCounts.get(family) ?? 0) + 1);
      }

      return [...projectCounts]
        .filter(([, count]) => count >= 2)
        .sort(([left], [right]) => left.localeCompare(right, "zh-CN", { sensitivity: "base" }));
    },
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("zh-CN");

    return projects.filter(({ snapshot, editorial }) => {
      const searchable = [
        snapshot.fullName,
        snapshot.description ?? "",
        snapshot.primaryLanguage ?? "",
        ...snapshot.topics,
        editorial.displayName,
        editorial.tagline,
        editorial.summary,
        ...editorial.techStack.map((item) => item.name),
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN");

      return (
        (!normalizedKeyword || searchable.includes(normalizedKeyword)) &&
        (!difficulty || editorial.difficulty.level === difficulty) &&
        (!category || editorial.categories.some((item) => item === category)) &&
        (!learningGoal || editorial.learningGoals.some((item) => item === learningGoal)) &&
        (!techStack || editorial.techStack.some((item) => technologyFamily(item.name) === techStack))
      );
    });
  }, [category, difficulty, keyword, learningGoal, projects, techStack]);

  const hasFilters = Boolean(keyword || difficulty || category || learningGoal || techStack);

  function resetFilters() {
    setKeyword("");
    setDifficulty("");
    setCategory("");
    setLearningGoal("");
    setTechStack("");
  }

  return (
    <>
      <section className="filter-panel" aria-labelledby="filter-title">
        <div className="filter-heading">
          <div>
            <p className="eyebrow" id="filter-title">
              筛选器
            </p>
            <p>从“我想学什么”开始，比追热度更有用。</p>
          </div>
          {hasFilters ? (
            <button className="reset-button" type="button" onClick={resetFilters}>
              清空筛选
            </button>
          ) : null}
        </div>

        <div className="filter-grid">
          <label className="field field-search">
            <span>关键词</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="试试 Next.js、AI 或项目名"
            />
          </label>

          <label className="field">
            <span>难度</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">全部难度</option>
              {difficulties.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>类型</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">全部类型</option>
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>学习目标</span>
            <select value={learningGoal} onChange={(event) => setLearningGoal(event.target.value)}>
              <option value="">全部目标</option>
              {learningGoals.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>技术栈</span>
            <select value={techStack} onChange={(event) => setTechStack(event.target.value)}>
              <option value="">全部技术栈</option>
              {techStacks.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} · {count}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="results-section" aria-live="polite" aria-atomic="true">
        <div className="results-heading">
          <p>
            找到 <strong>{filteredProjects.length}</strong> 个可学案例
          </p>
          <span>默认按学习价值排序</span>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="project-grid">
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.snapshot.repositoryId} project={project} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-mark" aria-hidden="true">⊘</span>
            <h2>这一圈还没有扫到合适项目</h2>
            <p>放宽一个条件，或者换个更具体的关键词。</p>
            <button className="button button-dark" type="button" onClick={resetFilters}>
              回到全部项目
            </button>
          </div>
        )}
      </section>
    </>
  );
}
