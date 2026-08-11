"use client";

export function PrintButton() {
  return (
    <button className="button button-primary pilot-print-button" type="button" onClick={() => window.print()}>
      打印 / 保存为 PDF
    </button>
  );
}
