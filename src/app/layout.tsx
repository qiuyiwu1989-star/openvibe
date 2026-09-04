import type { Metadata } from "next";
import Script from "next/script";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TONGXUE_TRACKING } from "@/lib/tongxue-tracking";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000/openvibe"),
  applicationName: "同学 · OpenVibe",
  title: {
    default: "OpenVibe · Vibe Coding 探索者",
    template: "%s · OpenVibe",
  },
  description:
    "面向全年龄学习者：从 15 分钟新手任务开始做出作品，再通过已审核的 GitHub 案例学习产品与代码。",
  keywords: ["vibe coding", "开源项目", "GitHub", "编程学习", "AI 编程"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "OpenVibe",
    title: "OpenVibe · 先做出一个东西，再慢慢看懂代码",
    description: "全年龄都能从小作品开始；另有 K12 分龄支持、四周路线和 30 个经过审核的进阶开源项目。",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenVibe · Vibe Coding 探索者",
    description: "从一个小作品开始，再发现、看懂并改造 GitHub 开源项目。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主内容
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <Script
          src={TONGXUE_TRACKING.scriptUrl}
          data-slug={TONGXUE_TRACKING.workSlug}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
