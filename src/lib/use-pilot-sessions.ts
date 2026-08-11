"use client";

import { useEffect, useState } from "react";

import type { PilotSessionCollection } from "../../packages/schema/src/index";
import {
  PILOT_EVENT,
  PILOT_STORAGE_KEY,
  readPilotSessions,
} from "./pilot-feedback";

export function usePilotSessions(): PilotSessionCollection | null {
  const [collection, setCollection] = useState<PilotSessionCollection | null>(null);

  useEffect(() => {
    const refresh = () => setCollection(readPilotSessions());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PILOT_STORAGE_KEY) refresh();
    };

    refresh();
    window.addEventListener(PILOT_EVENT, refresh);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PILOT_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return collection;
}
