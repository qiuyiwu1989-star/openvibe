import actualBudget from "../../data/projects/actualbudget-actual.json";
import browserUseWebUi from "../../data/projects/browser-use-web-ui.json";
import nextjsSaasStarter from "../../data/projects/nextjs-saas-starter.json";
import roomGpt from "../../data/projects/nutlope-roomgpt.json";
import openstatus from "../../data/projects/openstatushq-openstatus.json";
import {
  RadarProjectBundleSchema,
  type RadarProjectBundle,
} from "../../packages/schema/src/schemas";

export type RadarProject = RadarProjectBundle;

const projectData = [actualBudget, browserUseWebUi, nextjsSaasStarter, roomGpt, openstatus];

const publishedProjects: RadarProject[] = projectData
  .map((project) => RadarProjectBundleSchema.parse(project))
  .filter(
    (project) =>
      project.publication.status === "published" && project.editorial.review.state === "approved",
  )
  .sort((left, right) => right.editorial.score.total - left.editorial.score.total);

export function getPublishedProjects() {
  return publishedProjects;
}

export function getProjectBySlug(slug: string) {
  return publishedProjects.find((item) => item.publication.slug === slug);
}

export function formatCount(value: number) {
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}
