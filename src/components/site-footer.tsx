import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p className="footer-brand">OpenVibe Atlas</p>
          <p>Vibe Coding 探索者</p>
          <p>把热度变成可行动的学习路径。</p>
        </div>
        <div className="footer-links">
          <Link href="/start">做第一个作品</Link>
          <Link href="/explore">浏览进阶项目</Link>
          <Link href="/methodology">了解评分</Link>
        </div>
        <p className="footer-note">数据与编辑判断分层记录 · 发布前人工审核</p>
      </div>
    </footer>
  );
}
