import missionData from "../../data/beginner-missions.json";

import {
  BeginnerMissionSchema,
  type BeginnerMission,
} from "../../packages/schema/src/index";

const missions = missionData.map((mission) => BeginnerMissionSchema.parse(mission));

export function getBeginnerMissions(): BeginnerMission[] {
  return missions;
}

export function getBeginnerMissionBySlug(slug: string): BeginnerMission | undefined {
  return missions.find((mission) => mission.slug === slug);
}
