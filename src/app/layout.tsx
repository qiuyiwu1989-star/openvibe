import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "开源雷达",
  title: {
    default: "开源雷达 · 给 vibe coding 初学者的学习案例",
    template: "%s · 开源雷达",
  },
  description:
    "发现值得拆解和复刻的 GitHub 项目，看懂它适合谁、能学什么、如何开始。",
  keywords: ["vibe coding", "开源项目", "GitHub", "编程学习", "AI 编程"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "开源雷达",
    title: "开源雷达 · 别只看 Star，找一个真能学会的项目",
    description: "30 个经过审核的开源案例，配有中文学习卡和三段复刻路径。",
  },
  twitter: {
    card: "summary_large_image",
    title: "开源雷达 · 给 vibe coding 初学者的学习案例",
    description: "从学习价值出发，发现、看懂并复刻 GitHub 开源项目。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主内容
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
