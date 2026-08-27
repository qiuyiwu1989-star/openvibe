import Link from "next/link";

import { tongxueHomeUrl } from "@/lib/site-links";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/start", label: "开始创作" },
  { href: "/paths", label: "分龄路线" },
  { href: "/pilot", label: "试教" },
  { href: "/explore", label: "进阶案例" },
  { href: "/works", label: "我的作品" },
  { href: "/updates", label: "更新" },
  { href: "/methodology", label: "筛选方法" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <div className="brand-cluster">
          <Link className="brand" href="/" aria-label="OpenVibe 首页">
            <span className="brand-mark" aria-hidden="true">◒</span>
            <span>OpenVibe</span>
            <span className="brand-edition">BETA</span>
          </Link>
          <a className="tongxue-return" href={tongxueHomeUrl}>同学频道</a>
        </div>
        <nav aria-label="主导航">
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
