import Dexie, { type Table } from "dexie";
import type { Deconstruction, Lang, SeanceLog, Settings } from "./types";

class SeanceDB extends Dexie {
  logs!: Table<SeanceLog, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super("la-seance");
    this.version(1).stores({
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
 * Logs — each holds per-language deconstructions of one scene.
 * Cache key is (seedId | the log row, lang): see deconFor / cacheDecon.
 * ------------------------------------------------------------------ */

/** Read a log's deconstruction in `lang`, or undefined if not yet fetched. */
export function deconFor(log: SeanceLog | null | undefined, lang: Lang): Deconstruction | undefined {
  // Fresh/empty store paths can hand us undefined; coalesce defensively.
  return log?.decons?.[lang] ?? undefined;
}

/** Any deconstruction we have for this log, regardless of language (for previews). */
export function anyDecon(log: SeanceLog): Deconstruction | undefined {
  return log.decons.fr ?? log.decons.en ?? undefined;
}

export async function getDayLog(date: string): Promise<SeanceLog | undefined> {
  return db.logs.where("date").equals(date).first();
}

export async function upsertDayLog(
  date: string,
  seedId: string,
  decon: Deconstruction,
): Promise<SeanceLog> {
  const existing = await getDayLog(date);
  if (existing) {
    // keep its identity, just ensure this language is cached
    const decons = { ...existing.decons, [decon.lang]: decon };
    await db.logs.update(existing.id!, { decons, updatedAt: Date.now() });
    return { ...existing, decons };
  }
  const now = Date.now();
  const fresh: SeanceLog = {
    date,
    seedId,
    decons: { [decon.lang]: decon },
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

export async function addDemandLog(decon: Deconstruction): Promise<SeanceLog> {
  const now = Date.now();
  const date = `ask-${now}`;
  const fresh: SeanceLog = {
    date,
    seedId: null,
    decons: { [decon.lang]: decon },
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

/** Cache a freshly-fetched language variant onto an existing log. */
export async function cacheDecon(id: number, decon: Deconstruction): Promise<SeanceLog | undefined> {
  const log = await db.logs.get(id);
  if (!log) return undefined;
  const decons = { ...log.decons, [decon.lang]: decon };
  await db.logs.update(id, { decons, updatedAt: Date.now() });
  return { ...log, decons };
}

export async function updateLog(id: number, patch: Partial<SeanceLog>): Promise<void> {
  await db.logs.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteLog(id: number): Promise<void> {
  await db.logs.delete(id);
}

/** Recent scenes (film — scene) to feed the engine's avoid list. */
export async function recentScenes(limit = 40): Promise<string[]> {
  const rows = await db.logs.orderBy("createdAt").reverse().limit(limit).toArray();
  return rows
    .map((r) => {
      const d = anyDecon(r);
      return d ? `${d.film} — ${d.scene}` : "";
    })
    .filter(Boolean);
}

/** Seed ids already seen, so the daily picker can skip repeats over time. */
export async function seenSeedIds(): Promise<Set<string>> {
  const rows = await db.logs.toArray();
  const ids = new Set<string>();
  for (const r of rows) if (r.seedId) ids.add(r.seedId);
  return ids;
}
