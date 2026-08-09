import actualBudget from "../../data/projects/actualbudget-actual.json";
import appFlowy from "../../data/projects/appflowy-io-appflowy.json";
import appwrite from "../../data/projects/appwrite-appwrite.json";
import browserUseWebUi from "../../data/projects/browser-use-web-ui.json";
import calDiy from "../../data/projects/calcom-cal-diy.json";
import nextChat from "../../data/projects/chatgptnextweb-nextchat.json";
import documenso from "../../data/projects/documenso-documenso.json";
import dub from "../../data/projects/dubinc-dub.json";
import excalidraw from "../../data/projects/excalidraw-excalidraw.json";
import flowise from "../../data/projects/flowiseai-flowise.json";
import formbricks from "../../data/projects/formbricks-formbricks.json";
import postiz from "../../data/projects/gitroomhq-postiz-app.json";
import grist from "../../data/projects/gristlabs-grist-core.json";
import immich from "../../data/projects/immich-app-immich.json";
import karakeep from "../../data/projects/karakeep-app-karakeep.json";
import langflow from "../../data/projects/langflow-ai-langflow.json";
import plane from "../../data/projects/makeplane-plane.json";
import nextjsSaasStarter from "../../data/projects/nextjs-saas-starter.json";
import llamaCoder from "../../data/projects/nutlope-llamacoder.json";
import roomGpt from "../../data/projects/nutlope-roomgpt.json";
import openstatus from "../../data/projects/openstatushq-openstatus.json";
import penpot from "../../data/projects/penpot-penpot.json";
import pocketBase from "../../data/projects/pocketbase-pocketbase.json";
import siyuan from "../../data/projects/siyuan-note-siyuan.json";
import slidev from "../../data/projects/slidevjs-slidev.json";
import supabase from "../../data/projects/supabase-supabase.json";
import triggerDev from "../../data/projects/triggerdotdev-trigger-dev.json";
import twenty from "../../data/projects/twentyhq-twenty.json";
import memos from "../../data/projects/usememos-memos.json";
import vercelChatbot from "../../data/projects/vercel-chatbot.json";
import {
  RadarProjectBundleSchema,
  type RadarProjectBundle,
} from "../../packages/schema/src/schemas";

export type RadarProject = RadarProjectBundle;

const projectData = [
  actualBudget,
  appFlowy,
  appwrite,
  browserUseWebUi,
  calDiy,
  nextChat,
  documenso,
  dub,
  excalidraw,
  flowise,
  formbricks,
  postiz,
  grist,
  immich,
  karakeep,
  langflow,
  plane,
  nextjsSaasStarter,
  llamaCoder,
  roomGpt,
  openstatus,
  penpot,
  pocketBase,
  siyuan,
  slidev,
  supabase,
  triggerDev,
  twenty,
  memos,
  vercelChatbot,
];

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
