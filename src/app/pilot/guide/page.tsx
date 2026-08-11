import type { Metadata } from "next";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = {
  title: "90 分钟试教执行单",
  description: "OpenVibe 小学高段与初中两套可打印试教协议。",
};

const schedule = [
  ["00–10", "从自己的问题开始", "学习者说清想为谁解决什么；引导者只追问，不替他选题。"],
  ["10–25", "做出第一处可见变化", "先改文字、颜色、时长或选项；记录是否在 15 分钟内看见自己的改变。"],
  ["25–55", "连续做 2–3 个作者决定", "学习者选择功能与取舍，AI 可以解释和建议，但不能替他决定。"],
  ["55–70", "交给同伴真实使用", "只观察使用过程，收集一句“我哪里看不懂或用不顺”。"],
  ["70–82", "根据反馈修改并验证", "学习者决定采纳或拒绝反馈，并说明理由。"],
  ["82–90", "演示、署名、解释", "展示可运行版本，说出最重要的决定、一次修改和仍存在的问题。"],
] as const;

const protocols = [
  {
    id: "upper-primary",
    label: "小学高段 · 9–12 岁",
    title: "问题与验证：随机选择器",
    path: "/paths/question-and-prove",
    mission: "/start/random-picker",
    opening: "让每位学习者先写下一个真实的选择难题，例如分组、阅读顺序或周末活动，再决定哪些选项应该进入工具。",
    adult: "把抽象需求改成可测试的小问题；当孩子问“该放什么”时，先问“谁会用、什么结果才算公平”。",
    observe: "学习者是否能解释选项为何属于自己、随机结果如何验证，以及同伴反馈后改了什么。",
  },
  {
    id: "middle-school",
    label: "初中 · 12–15 岁",
    title: "生活工具实验室：专注计时器",
    path: "/paths/life-tool-lab",
    mission: "/start/focus-timer",
    opening: "让每位学习者选择一个自己会实际执行的短任务，再定义专注时长、休息提醒和完成反馈，而不是照抄默认参数。",
    adult: "帮助缩小到一次可观察实验；当学习者追求功能数量时，追问“哪个设计真的帮助你开始或坚持”。",
    observe: "学习者是否实际运行计时器、根据一次体验调整参数，并能说明为什么保留或舍弃某个功能。",
  },
] as const;

export default function PilotGuidePage() {
  return (
    <div className="pilot-guide-page">
      <header className="pilot-guide-hero shell">
        <div>
          <p className="eyebrow">STAGE 11 / 真实验证协议</p>
          <h1>90 分钟，验证作品是否真的属于学习者。</h1>
          <p>这不是教案评分表，而是一份现场执行单。先完成两场小规模试教，再根据证据决定改案例、路线还是引导方式。</p>
        </div>
        <div className="pilot-guide-actions no-print">
          <PrintButton />
          <Link className="button button-ghost" href="/pilot">打开匿名记录工作台</Link>
        </div>
      </header>

      <div className="shell pilot-guide-content">
        <section className="pilot-guide-setup" aria-labelledby="setup-title">
          <div>
            <p className="eyebrow">开始前</p>
            <h2 id="setup-title">最小试教配置</h2>
          </div>
          <dl>
            <div><dt>参与人数</dt><dd>每场 4–8 人</dd></div>
            <div><dt>成人配置</dt><dd>1 名引导者；条件允许再加 1 名观察者</dd></div>
            <div><dt>设备准备</dt><dd>浏览器与编辑器提前验证；准备一台可演示的备用设备</dd></div>
            <div><dt>记录方式</dt><dd>只记整场汇总，不写姓名、学校、联系方式或私密链接</dd></div>
          </dl>
        </section>

        {protocols.map((protocol, index) => (
          <article className="pilot-protocol" id={protocol.id} key={protocol.id}>
            <header>
              <p className="eyebrow">协议 {index + 1} / {protocol.label}</p>
              <h2>{protocol.title}</h2>
              <p>{protocol.opening}</p>
              <div className="pilot-protocol-links no-print">
                <Link href={protocol.path}>查看四周路线</Link>
                <Link href={protocol.mission}>打开默认案例</Link>
              </div>
            </header>

            <ol className="pilot-schedule" aria-label={`${protocol.title} 90 分钟流程`}>
              {schedule.map(([time, title, detail]) => (
                <li key={time}>
                  <time>{time}</time>
                  <div><h3>{title}</h3><p>{detail}</p></div>
                  <label aria-label={`${time} 现场完成标记`}><input type="checkbox" /> 完成</label>
                </li>
              ))}
            </ol>

            <div className="pilot-protocol-notes">
              <section><h3>成人怎样支持</h3><p>{protocol.adult}</p></section>
              <section><h3>观察重点</h3><p>{protocol.observe}</p></section>
            </div>
          </article>
        ))}

        <section className="pilot-evidence-sheet" aria-labelledby="evidence-title">
          <header><p className="eyebrow">两场共用</p><h2 id="evidence-title">作者证据观察单</h2></header>
          <div className="pilot-evidence-questions">
            <article><span>01</span><h3>意图与价值</h3><p>他能否说出为谁、为什么做，以及什么结果才有用？</p></article>
            <article><span>02</span><h3>亲身投入</h3><p>他是否亲自尝试、遇到阻碍，并能说明自己如何处理？</p></article>
            <article><span>03</span><h3>第一人称意义</h3><p>他能否用“我选择 / 我发现 / 我改变”解释作品？</p></article>
            <article><span>04</span><h3>署名与担责</h3><p>他是否愿意演示、回应反馈，并说出作品仍有什么问题？</p></article>
          </div>
        </section>

        <section className="pilot-thresholds" aria-labelledby="threshold-title">
          <header><p className="eyebrow">阶段门槛</p><h2 id="threshold-title">达到这些条件，才进入下一轮扩展</h2></header>
          <ul>
            <li><strong>≥ 70%</strong><span>在 15 分钟内看到自己的可见变化</span></li>
            <li><strong>≥ 60%</strong><span>在现场完成可以演示的版本</span></li>
            <li><strong>≥ 50%</strong><span>能清楚解释一个作者决定及其理由</span></li>
            <li><strong>100%</strong><span>遵守隐私边界；同时记录成人介入发生在哪一步</span></li>
          </ul>
          <p>门槛用于判断教学设计是否可用，不用于给学习者分数或贴标签。任何一项未达标，都先修改任务或引导方式，再增加案例数量。</p>
        </section>

        <section className="pilot-stop-rules" aria-labelledby="stop-title">
          <header><p className="eyebrow">现场止损</p><h2 id="stop-title">出现这些情况，先暂停</h2></header>
          <ol>
            <li><strong>环境故障超过 10 分钟：</strong>记为工具准备问题，切换到预检备用环境，不把装环境耗时算成学习者的困难。</li>
            <li><strong>出现身份或隐私信息：</strong>立即停止记录并删除；照片、视频或外部作品公开必须另行取得机构与监护人许可。</li>
            <li><strong>AI 直接产出整个方案：</strong>要求学习者重新选择、改写和验证；无法解释的功能不计为作者证据。</li>
            <li><strong>明显不适或同伴压力：</strong>允许退出展示或改为私下演示，不以“完成活动”为由强迫公开。</li>
          </ol>
        </section>

        <footer className="pilot-guide-footer">
          <div><strong>场次：</strong>____________</div>
          <div><strong>日期：</strong>____________</div>
          <div><strong>引导者：</strong>____________</div>
          <div><strong>下一轮只改一件事：</strong>________________________________________</div>
          <Link className="button button-primary no-print" href="/pilot">记录匿名整场结果</Link>
        </footer>
      </div>
    </div>
  );
}
