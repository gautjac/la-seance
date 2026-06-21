// Shared types for La Séance — the shape the deconstruction engine returns and
// the shapes the local Dexie store keeps. Dependency-free so the Netlify
// function can mirror the same contract.

export type Lang = "fr" | "en";

/** Bilingual text block. */
export interface Bilingual {
  fr: string;
  en: string;
}

/**
 * A curated, real, verifiable scene seed. The deterministic daily pick chooses
 * one of these by date. The deconstruction (the heavy, bilingual analysis) is
 * fetched on demand from /api/seance and cached, so the seed itself stays light.
 */
export interface SceneSeed {
  /** stable id — never changes once shipped (used as the cache key) */
  id: string;
  /** film title, in its consecrated form */
  film: string;
  /** director, exactly */
  director: string;
  /** release year */
  year: number;
  /** the specific scene, named precisely (FR/EN) */
  scene: Bilingual;
  /** where to watch / the timecode hint (FR/EN) */
  whereToWatch: Bilingual;
  /** keyword query (title + director) to locate the film on Wikipedia, never a URL */
  mediaQuery: string;
  /** loose tag for the cinémathèque filter / texture */
  craft: CraftTag;
}

/** A craft emphasis tag — what the scene is famous for teaching. */
export type CraftTag =
  | "montage" // cutting rhythm
  | "planséquence" // long take / blocking
  | "son" // sound design
  | "lumière" // light & lens
  | "jeu" // performance
  | "suspense"; // tension construction

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

/** One key beat of the scene — a single shot/movement, with an optional diagram. */
export interface Beat {
  /** approximate timecode within the scene, e.g. "0:00–0:14" or "@1:32" */
  timecode: string;
  /** what we SEE — the shot, framing, blocking, camera move (bilingual) */
  shot: Bilingual;
  /** why this beat lands — the read (bilingual) */
  read: Bilingual;
  /** optional schematic for the reusable SVG shot-diagram component */
  diagram?: ShotDiagram;
}

/** A simple framing/blocking schematic — drawn by the ShotDiagram component. */
export interface ShotDiagram {
  /** aspect of the frame: "scope" 2.39, "wide" 1.85, "academy" 1.37, "tv" 1.33 */
  aspect?: "scope" | "wide" | "academy" | "tv";
  /** shot size label shown under the frame, e.g. "GP" / "CU", "PE" / "WS" */
  size?: string;
  /** subject blocks placed in the frame (normalized 0..1 coords) */
  subjects?: DiagramSubject[];
  /** a camera move arrow, if any */
  move?: DiagramMove;
}

export interface DiagramSubject {
  /** 0..1 left, 0..1 top, 0..1 width, 0..1 height */
  x: number;
  y: number;
  w: number;
  h: number;
  /** short label, e.g. "A", "B", a name initial */
  label?: string;
  /** accent the block (the dramatic focus) */
  accent?: boolean;
}

export interface DiagramMove {
  kind: "pan" | "tilt" | "dolly-in" | "dolly-out" | "track" | "crane" | "zoom" | "handheld";
  /** start point (0..1) */
  from: { x: number; y: number };
  /** end point (0..1) */
  to: { x: number; y: number };
}

/** A "aller plus loin" thread — a related scene/film to explore. */
export interface Thread {
  film: string;
  note: Bilingual;
}

/** The full deconstruction payload returned by /api/seance. */
export interface Deconstruction {
  /** echoes the seed's identity so the cache is self-describing */
  film: string;
  director: string;
  year: number;
  scene: Bilingual;
  whereToWatch: Bilingual;
  mediaQuery?: string;
  /** one-line evocative hook for the header */
  logline: Bilingual;
  /** the setup — what the scene needs to accomplish, where it sits in the film */
  setup: Bilingual;
  /** the shot-by-shot beats (4–7) */
  beats: Beat[];
  /** what the SOUND is doing across the scene */
  sound: Bilingual;
  /** the performance turn — the acting beat that matters */
  performance: Bilingual;
  /** the heart — why it works, earned and specific */
  pourquoi: Bilingual;
  /** the single transferable move — pinnable */
  geste: Bilingual;
  /** 2–3 threads to go further */
  goFurther: Thread[];
}

export interface SeanceRequest {
  /** identity of the scene being deconstructed (from seed, or freshly named) */
  film?: string;
  director?: string;
  year?: number;
  /** the specific scene to read (free text for "Demander", or seed's FR scene) */
  scene?: string;
  /** free-form ask for "Demander" — a film/scene by name or description */
  ask?: string;
  lang: Lang;
  /** scenes already covered (film — scene), so fresh picks avoid repeats */
  avoid?: string[];
}

/** A logged séance, stored locally in Dexie. */
export interface SeanceLog {
  id?: number;
  /** YYYY-MM-DD for the daily pick, or `ask-<ts>` for an on-demand request */
  date: string;
  /** the seed id when this came from the daily list, else null */
  seedId: string | null;
  decon: Deconstruction;
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
  /** local streak counters */
  streakCount: number;
  /** YYYY-MM-DD of the last day a séance was opened */
  lastSeenDate: string | null;
}
