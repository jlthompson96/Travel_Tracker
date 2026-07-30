import { useCallback, useEffect, useState } from 'react';

/**
 * Notion has no writable "priority rank" or "target timeframe" field, and this
 * app is read-only against Notion (see notionAdapter.ts) — there's no path to
 * persist a ranking back to the database. So the plan lives entirely in the
 * browser's localStorage, same pattern as PasswordGate's unlock flag: it's a
 * personal planning layer on top of the read-only trip data, not a Notion sync.
 */

export type Timeframe = 'This year' | 'Next year' | 'Someday';

const ORDER_KEY = 'travel-tracker-bucket-order';
const TIMEFRAME_KEY = 'travel-tracker-bucket-timeframes';

function readOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function readTimeframes(): Record<string, Timeframe> {
  try {
    const raw = localStorage.getItem(TIMEFRAME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Timeframe>) : {};
  } catch {
    return {};
  }
}

/** Merges saved order with the current trip id list: known ids keep their saved
 * relative order (first), anything new (or no save yet) falls in afterward in
 * its original data order. */
export function useBucketListPlan(tripIds: string[]) {
  const [savedOrder, setSavedOrder] = useState<string[]>(readOrder);
  const [timeframes, setTimeframes] = useState<Record<string, Timeframe>>(readTimeframes);

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(savedOrder));
  }, [savedOrder]);

  useEffect(() => {
    localStorage.setItem(TIMEFRAME_KEY, JSON.stringify(timeframes));
  }, [timeframes]);

  const orderedIds = mergeOrder(savedOrder, tripIds);

  const reorder = useCallback((nextOrder: string[]) => {
    setSavedOrder(nextOrder);
  }, []);

  const setTimeframe = useCallback((tripId: string, timeframe: Timeframe) => {
    setTimeframes((prev) => ({ ...prev, [tripId]: timeframe }));
  }, []);

  return { orderedIds, timeframes, reorder, setTimeframe };
}

function mergeOrder(saved: string[], current: string[]): string[] {
  const currentSet = new Set(current);
  const known = saved.filter((id) => currentSet.has(id));
  const knownSet = new Set(known);
  const unranked = current.filter((id) => !knownSet.has(id));
  return [...known, ...unranked];
}
