import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell not-found">
      <span className="empty-mark" aria-hidden="true">⊘</span>
      <p className="eyebrow">404 / 信号中断</p>
      <h1>这个项目还没进入雷达</h1>
      <p>它可能尚未通过审核，或者项目链接已经改变。</p>
      <Link className="button button-primary" href="/explore">
        回到项目库
      </Link>
    </div>
  );
}
