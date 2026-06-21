import Dexie, { type Table } from "dexie";
import type { Deconstruction, Lang, SeanceLog, Settings } from "./types";

class SeanceDB extends Dexie {
  logs!: Table<SeanceLog, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super("la-seance");
    this.version(1).stores({
      // date is the natural key for a day's pick; seedId lets us avoid repeats
      // and dedupe; the flags drive the timelines.
      logs: "++id, date, seedId, watched, bookmarked, rating, createdAt, updatedAt",
      settings: "++id",
    });
  }
}

export const db = new SeanceDB();

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.toCollection().first();
  if (existing) return existing;
  const fresh: Settings = {
    lang: "fr",
    onboarded: false,
    streakCount: 0,
    lastSeenDate: null,
  };
  const id = await db.settings.add(fresh);
  return { ...fresh, id };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const s = await getSettings();
  await db.settings.update(s.id!, patch);
}

/* ------------------------------------------------------------------ *
 * Deconstruction cache — keyed by (seedId | film+scene, lang).
 *
 * The cache lives in the same logs table for daily picks, but the
 * "Demander" path may regenerate; for the daily path we look up by
 * (date) and only generate once. We ALSO keep a lightweight cache keyed
 * by (cacheKey,lang) so re-opening the same seed in the other language
 * doesn't refetch needlessly. Stored on the log itself via a small map.
 * ------------------------------------------------------------------ */

/** Find the log for the daily pick of a given date. */
export async function getDayLog(date: string): Promise<SeanceLog | undefined> {
  // .get-style read on a fresh/empty store returns undefined — callers
  // coalesce with ?? null at the React boundary.
  return db.logs.where("date").equals(date).first();
}

export async function upsertDayLog(
  date: string,
  seedId: string,
  decon: Deconstruction,
): Promise<SeanceLog> {
  const existing = await getDayLog(date);
  if (existing) return existing;
  const now = Date.now();
  const fresh: SeanceLog = {
    date,
    seedId,
    decon,
    watched: false,
    rating: 0,
    note: "",
    bookmarked: false,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.logs.add(fresh);
  return { ...fresh, id };
}

/** Store an on-demand ("Demander") deconstruction as its own row. */
export async function addDemandLog(decon: Deconstruction): Promise<SeanceLog> {
  const now = Date.now();
  const date = `ask-${now}`;
  const fresh: SeanceLog = {
    date,
    seedId: null,
    decon,
    watched: false,
    rating: 0,
    note: "",
    bookmarked: false,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.logs.add(fresh);
  return { ...fresh, id };
}

export async function updateLog(id: number, patch: Partial<SeanceLog>): Promise<void> {
  await db.logs.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteLog(id: number): Promise<void> {
  await db.logs.delete(id);
}

/** Recent scenes (film — scene) to feed the engine's avoid list. */
export async function recentScenes(lang: Lang, limit = 40): Promise<string[]> {
  const rows = await db.logs.orderBy("createdAt").reverse().limit(limit).toArray();
  return rows.map((r) => {
    const scene = lang === "en" ? r.decon.scene.en : r.decon.scene.fr;
    return `${r.decon.film} — ${scene}`;
  });
}

/** Seed ids already seen, so the daily picker can skip repeats over time. */
export async function seenSeedIds(): Promise<Set<string>> {
  const rows = await db.logs.toArray();
  const ids = new Set<string>();
  for (const r of rows) if (r.seedId) ids.add(r.seedId);
  return ids;
}
