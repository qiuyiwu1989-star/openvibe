"use client";

import { useEffect, useState } from "react";

import type { MakerProgressCollection } from "../../packages/schema/src/index";
import {
  MAKER_PROGRESS_EVENT,
  MAKER_PROGRESS_STORAGE_KEY,
  readMakerProgress,
} from "./maker-progress";

export function useMakerProgress(): MakerProgressCollection | null {
  const [collection, setCollection] = useState<MakerProgressCollection | null>(null);

  useEffect(() => {
    const refresh = () => setCollection(readMakerProgress());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MAKER_PROGRESS_STORAGE_KEY) refresh();
    };

    refresh();
    window.addEventListener(MAKER_PROGRESS_EVENT, refresh);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(MAKER_PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return collection;
}
