import Link from "next/link";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/start", label: "新手开始" },
  { href: "/explore", label: "进阶案例" },
  { href: "/updates", label: "更新" },
  { href: "/methodology", label: "筛选方法" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="OpenVibe Atlas 首页">
          <span className="brand-mark" aria-hidden="true">◒</span>
          <span>OpenVibe Atlas</span>
          <span className="brand-edition">BETA</span>
        </Link>
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
