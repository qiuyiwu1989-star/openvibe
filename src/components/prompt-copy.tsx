"use client";

import { useState } from "react";

type PromptCopyProps = {
  prompt: string;
};

export function PromptCopy({ prompt }: PromptCopyProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="prompt-box">
      <p>{prompt}</p>
      <button className="button button-primary" type="button" onClick={copyPrompt}>
        {status === "copied" ? "已复制" : status === "failed" ? "请手动复制" : "复制给 AI"}
      </button>
    </div>
  );
}
