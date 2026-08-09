import Link from "next/link";

import {
  categoryLabels,
  difficultyLabels,
  labelFor,
  learningGoalLabels,
} from "@/lib/labels";
import { formatCount, type RadarProject } from "@/lib/projects";

type ProjectCardProps = {
  project: RadarProject;
  index?: number;
};

export function ProjectCard({ project, index = 1 }: ProjectCardProps) {
  const { snapshot, editorial, publication } = project;

  return (
    <article className="project-card">
      <div className="project-card-topline">
        <span className="card-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
        <span className={`difficulty-badge difficulty-${editorial.difficulty.level}`}>
          {labelFor(difficultyLabels, editorial.difficulty.level)}
        </span>
      </div>

      <div className="card-main">
        <p className="repo-name">{snapshot.fullName}</p>
        <h3>
          <Link href={`/projects/${publication.slug}`}>{editorial.displayName}</Link>
        </h3>
        <p className="card-tagline">{editorial.tagline}</p>
      </div>

      <ul className="tag-list" aria-label="项目分类">
        {editorial.categories.map((category) => (
          <li key={category}>{labelFor(categoryLabels, category)}</li>
        ))}
      </ul>

      <div className="card-learning">
        <span>你可以学</span>
        <p>
          {editorial.learningGoals
            .slice(0, 3)
            .map((goal) => labelFor(learningGoalLabels, goal))
            .join(" · ")}
        </p>
      </div>

      <div className="card-footer">
        <span className="score-compact">
          <strong>{editorial.score.total}</strong>/100 学习分
        </span>
        <span>★ {formatCount(snapshot.metrics.stars)}</span>
        <Link className="text-link" href={`/projects/${publication.slug}`}>
          查看学习卡 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
