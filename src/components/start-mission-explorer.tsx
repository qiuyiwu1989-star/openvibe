"use client";

import { useMemo, useState } from "react";

import type { BeginnerMission } from "../../packages/schema/src/index";
import { MissionCard, trackLabels } from "@/components/mission-card";
import {
  k12AgeBandAges,
  k12AgeBandDescriptions,
  k12AgeBandLabels,
  type K12AgeBand,
} from "@/lib/k12";

const ageBands = Object.keys(k12AgeBandLabels) as K12AgeBand[];

type Track = BeginnerMission["track"];

type StartMissionExplorerProps = {
  missions: BeginnerMission[];
};

export function StartMissionExplorer({ missions }: StartMissionExplorerProps) {
  const [ageBand, setAgeBand] = useState<K12AgeBand | "">("");
  const [track, setTrack] = useState<Track | "">("");

  const visibleMissions = useMemo(
    () => missions.filter((mission) => (
      (!ageBand || mission.k12?.ageBands.includes(ageBand)) &&
      (!track || mission.track === track)
    )),
    [ageBand, missions, track],
  );

  const pilotCount = missions.filter((mission) => mission.k12).length;
  const hasFilters = Boolean(ageBand || track);

  return (
    <>
      <section className="k12-path-picker" aria-labelledby="k12-picker-title">
        <div className="section-heading k12-picker-heading">
          <div>
            <p className="eyebrow">K12 PILOT / {pilotCount} 个分龄试点</p>
            <h2 id="k12-picker-title">先选成长阶段，再选想做的作品。</h2>
          </div>
          <p>年龄只是推荐入口，不是能力标签。跨年龄尝试完全可以。</p>
        </div>

        <div className="k12-age-grid" role="group" aria-label="按年龄段筛选">
          {ageBands.map((band) => (
            <button
              className={ageBand === band ? "k12-age-card is-active" : "k12-age-card"}
              key={band}
              type="button"
              aria-pressed={ageBand === band}
              onClick={() => setAgeBand((current) => current === band ? "" : band)}
            >
              <span>{k12AgeBandAges[band]}</span>
              <strong>{k12AgeBandLabels[band]}</strong>
              <small>{k12AgeBandDescriptions[band]}</small>
            </button>
          ))}
        </div>

        <div className="k12-interest-filter" role="group" aria-label="按作品兴趣筛选">
          <span>我想做：</span>
          <button type="button" aria-pressed={!track} onClick={() => setTrack("")}>全部</button>
          {(Object.entries(trackLabels) as Array<[Track, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={track === value}
              onClick={() => setTrack((current) => current === value ? "" : value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="section mission-results" aria-labelledby="mission-list-title">
        <div className="section-heading start-section-heading">
          <div>
            <p className="eyebrow" aria-live="polite">找到 {visibleMissions.length} 个任务</p>
            <h2 id="mission-list-title">
              {ageBand ? `${k12AgeBandLabels[ageBand]}可以从这里开始` : "选一个你真想做的"}
            </h2>
          </div>
          <div className="mission-results-note">
            <p>{hasFilters ? "筛选只帮助你缩小选择，不限制你探索其他任务。" : "不用按顺序。兴趣比“正确路线”更能帮你完成第一个作品。"}</p>
            {hasFilters && (
              <button className="text-button" type="button" onClick={() => { setAgeBand(""); setTrack(""); }}>
                清空筛选
              </button>
            )}
          </div>
        </div>

        {visibleMissions.length > 0 ? (
          <div className="mission-grid">
            {visibleMissions.map((mission) => (
              <MissionCard
                key={mission.slug}
                mission={mission}
                index={missions.indexOf(mission) + 1}
              />
            ))}
          </div>
        ) : (
          <div className="k12-empty">
            <h3>这个组合还没有试点案例。</h3>
            <p>先清空兴趣筛选，查看这个年龄段的全部推荐。</p>
            <button className="button button-ghost" type="button" onClick={() => setTrack("")}>查看全部兴趣</button>
          </div>
        )}
      </section>
    </>
  );
}
