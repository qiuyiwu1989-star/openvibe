import Link from "next/link";

import type { LearningPath } from "../../packages/schema/src/index";
import { k12AgeBandAges, k12AgeBandLabels } from "@/lib/k12";

type LearningPathCardProps = {
  learningPath: LearningPath;
  index: number;
};

export function LearningPathCard({ learningPath, index }: LearningPathCardProps) {
  return (
    <article className="learning-path-card">
      <div className="learning-path-card-topline">
        <span>{String(index).padStart(2, "0")}</span>
        <span>{k12AgeBandLabels[learningPath.ageBand]} · {k12AgeBandAges[learningPath.ageBand]}</span>
      </div>
      <div>
        <p className="eyebrow">4 周 · 5 个案例可选</p>
        <h2><Link href={`/paths/${learningPath.slug}`}>{learningPath.title}</Link></h2>
        <p>{learningPath.tagline}</p>
      </div>
      <p className="learning-path-outcome"><strong>路线成果</strong>{learningPath.outcome}</p>
      <Link className="text-link" href={`/paths/${learningPath.slug}`}>
        查看四周路线 <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
