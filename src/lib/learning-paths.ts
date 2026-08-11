import pathData from "../../data/learning-paths.json";

import {
  LearningPathSchema,
  type LearningPath,
} from "../../packages/schema/src/index";

const learningPaths = pathData.map((learningPath) => LearningPathSchema.parse(learningPath));

export function getLearningPaths(): LearningPath[] {
  return learningPaths;
}

export function getLearningPathBySlug(slug: string): LearningPath | undefined {
  return learningPaths.find((learningPath) => learningPath.slug === slug);
}
