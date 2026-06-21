// Shared types for La Séance — the shape the deconstruction engine returns and
// the shapes the local Dexie store keeps. Dependency-free so the Netlify
// function can mirror the same contract.
//
// The deconstruction is generated and stored in ONE language per object (the
// language it was requested in). The client caches by (cacheKey, lang); when
// the viewer switches language, the scene is refetched in the new language and
// cached, so the second switch is instant.

export type Lang = "fr" | "en";

/** Bilingual text block — used only by the curated seed list (light, static). */
export interface Bilingual {
  fr: string;
  en: string;
}

export interface SceneSeed {
  /** stable id — never changes once shipped (used as the cache key) */
  id: string;
  film: string;
  director: string;
  year: number;
  scene: Bilingual;
  whereToWatch: Bilingual;
  /** keyword query (title + director) to locate the film, never a URL */
  mediaQuery: string;
  craft: CraftTag;
}

export type CraftTag =
  | "montage"
  | "planséquence"
  | "son"
  | "lumière"
  | "jeu"
  | "suspense";

export interface CraftDef {
  key: CraftTag;
  fr: string;
  en: string;
}

export const CRAFTS: CraftDef[] = [
  { key: "montage", fr: "Montage", en: "Editing" },
  { key: "planséquence", fr: "Plan-séquence", en: "Long take" },
  { key: "son", fr: "Son", en: "Sound" },
  { key: "lumière", fr: "Lumière & objectif", en: "Light & lens" },
  { key: "jeu", fr: "Jeu", en: "Performance" },
  { key: "suspense", fr: "Tension", en: "Tension" },
];

/** A simple framing/blocking schematic — drawn by the ShotDiagram component. */
export interface ShotDiagram {
  aspect?: "scope" | "wide" | "academy" | "tv";
  size?: string;
  subjects?: DiagramSubject[];
  move?: DiagramMove;
}

export interface DiagramSubject {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  accent?: boolean;
}

export interface DiagramMove {
  kind: "pan" | "tilt" | "dolly-in" | "dolly-out" | "track" | "crane" | "zoom" | "handheld";
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/** One key beat of the scene — a single shot/movement, with an optional diagram. */
export interface Beat {
  timecode: string;
  shot: string;
  read: string;
  diagram?: ShotDiagram;
}

/** A "aller plus loin" thread — a related scene/film to explore. */
export interface Thread {
  film: string;
  note: string;
}

/** The full, monolingual deconstruction payload returned by /api/seance. */
export interface Deconstruction {
  /** the language this object is written in */
  lang: Lang;
  film: string;
  director: string;
  year: number;
  scene: string;
  whereToWatch: string;
  mediaQuery?: string;
  logline: string;
  setup: string;
  beats: Beat[];
  sound: string;
  performance: string;
  pourquoi: string;
  geste: string;
  goFurther: Thread[];
}

export interface SeanceRequest {
  film?: string;
  director?: string;
  year?: number;
  scene?: string;
  ask?: string;
  lang: Lang;
  avoid?: string[];
}

/** A logged séance, stored locally in Dexie. */
export interface SeanceLog {
  id?: number;
  /** YYYY-MM-DD for the daily pick, or `ask-<ts>` for an on-demand request */
  date: string;
  /** the seed id when this came from the daily list, else null */
  seedId: string | null;
  /**
   * Per-language deconstructions of THIS scene. The daily/asked scene is the
   * same scene regardless of UI language; we cache each language as we fetch it
   * so switching FR↔EN is instant after the first fetch in each.
   */
  decons: Partial<Record<Lang, Deconstruction>>;
  watched: boolean;
  rating: number; // 0..5
  note: string;
  bookmarked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  id?: number;
  lang: Lang;
  onboarded: boolean;
  streakCount: number;
  lastSeenDate: string | null;
}
