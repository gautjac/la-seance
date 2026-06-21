import type { Bilingual, Lang } from "../types";

/* ------------------------------------------------------------------ *
 * Shared language key — `atelier:lang` is shared across the whole
 * Atelier family on purpose, so picking FR/EN in one app carries to the
 * others. We auto-detect from the browser on first visit (FR fallback,
 * since Jac is FR-first / Québécois) and one-time-migrate any app-local
 * lang that predates the shared key.
 * ------------------------------------------------------------------ */

const LANG_KEY = "atelier:lang"; // SHARED across all Atelier apps on purpose

export function storedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

export function detectLang(): Lang {
  const saved = storedLang();
  if (saved) return saved;
  const n = (typeof navigator !== "undefined" && navigator.language) || "fr";
  return n.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* localStorage unavailable */
  }
  try {
    document.documentElement.lang = lang;
  } catch {
    /* no document (SSR) */
  }
}

/** One-time migration from a pre-existing app-local lang into the shared key. */
export function migrateLang(appLocal: Lang | undefined): Lang {
  const saved = storedLang();
  if (saved) return saved;
  const chosen: Lang = appLocal === "en" || appLocal === "fr" ? appLocal : detectLang();
  persistLang(chosen);
  return chosen;
}

type Dict = Record<string, Bilingual>;

const STR: Dict = {
  appTagline: {
    fr: "Le visionnement lent — une scène par jour, plan par plan",
    en: "Slow watching — one scene a day, shot by shot",
  },
  // nav
  today: { fr: "Aujourd'hui", en: "Today" },
  fil: { fr: "Le fil", en: "The thread" },
  cinematheque: { fr: "Ma cinémathèque", en: "My cinémathèque" },
  demander: { fr: "Demander", en: "Request" },

  // scene-of-the-day
  sceneDuJour: { fr: "La scène du jour", en: "Scene of the day" },
  whereToWatch: { fr: "Où la (re)voir", en: "Where to watch" },
  setup: { fr: "La mise en place", en: "The setup" },
  decoupage: { fr: "Le découpage", en: "The breakdown" },
  sound: { fr: "Le son", en: "The sound" },
  performance: { fr: "Le jeu", en: "The performance" },
  pourquoi: { fr: "Pourquoi ça marche", en: "Why it works" },
  geste: { fr: "Le geste", en: "The move" },
  goFurther: { fr: "Aller plus loin", en: "Go further" },

  // actions
  watched: { fr: "Vu", en: "Watched" },
  markWatched: { fr: "Marquer comme vu", en: "Mark as watched" },
  rating: { fr: "Note", en: "Rating" },
  note: { fr: "Note personnelle", en: "Your note" },
  notePlaceholder: {
    fr: "Une observation, un raccord à voler, une question…",
    en: "An observation, a cut to steal, a question…",
  },
  bookmark: { fr: "Garder dans ma cinémathèque", en: "Save to my cinémathèque" },
  bookmarked: { fr: "Dans ma cinémathèque", en: "In my cinémathèque" },
  remove: { fr: "Retirer", en: "Remove" },
  open: { fr: "Ouvrir", en: "Open" },
  retry: { fr: "Réessayer", en: "Try again" },
  reroll: { fr: "Une autre scène", en: "Another scene" },
  backToToday: { fr: "La scène du jour", en: "Scene of the day" },
  watchOnWiki: { fr: "Chercher le film", en: "Look up the film" },

  // loading
  loading: { fr: "On décortique la scène…", en: "Breaking the scene down…" },
  loadingAsk: { fr: "On cherche et on décortique…", en: "Finding it and breaking it down…" },
  threading: { fr: "On déroule la pellicule", en: "Threading the reel" },

  // demander
  askTitle: { fr: "Demander une scène", en: "Request a scene" },
  askHelp: {
    fr: "Nomme un film et une scène, ou décris-la. « la scène d'ouverture de Drive », « le dîner dans Heat », « le plan-séquence de Birdman »…",
    en: "Name a film and a scene, or describe it. “the opening of Drive”, “the diner in Heat”, “the long take in Birdman”…",
  },
  askPlaceholder: { fr: "Quel film, quelle scène ?", en: "Which film, which scene?" },
  ask: { fr: "Décortique-la", en: "Break it down" },

  // empty states
  emptyFil: {
    fr: "Rien dans le fil pour l'instant. Reviens demain, ou demande une scène.",
    en: "Nothing in the thread yet. Come back tomorrow, or request a scene.",
  },
  emptyCinematheque: {
    fr: "Aucune scène gardée. Marque tes coups de cœur ♦ pour les retrouver ici.",
    en: "No scenes saved. Bookmark your favourites ♦ to find them here.",
  },

  // misc
  by: { fr: "réal.", en: "dir." },
  onDemand: { fr: "À la demande", en: "On request" },
  close: { fr: "Fermer", en: "Close" },
  streak: { fr: "jours d'affilée", en: "day streak" },
  diagramNote: {
    fr: "Schémas de cadrage — un croquis de mise en cadre, pas une image du film.",
    en: "Framing schematics — a blocking sketch, not a frame from the film.",
  },
  honesty: {
    fr: "La Séance ne montre jamais d'images du film : elle les décrit et te dit où les voir.",
    en: "La Séance never shows frames from the film: it describes them and tells you where to watch.",
  },

  // onboarding
  introTitle: { fr: "La Séance", en: "La Séance" },
  intro: {
    fr: "Chaque jour, une grande scène de cinéma — décortiquée plan par plan. On regarde lentement : la mise en place, le montage, la caméra, le son, le jeu. Puis pourquoi ça marche, et le geste à retenir.",
    en: "Each day, one great film scene — broken down shot by shot. We watch slowly: the setup, the cutting, the camera, the sound, the acting. Then why it works, and the move to keep.",
  },
  introHonesty: {
    fr: "Que des scènes réelles et vérifiables, attribuées exactement. Pas de fausses images : des mots, des schémas, et où aller la voir.",
    en: "Only real, verifiable scenes, attributed exactly. No fake stills: words, diagrams, and where to go watch it.",
  },
  begin: { fr: "Entrer dans la salle", en: "Enter the screening room" },
  skip: { fr: "Passer", en: "Skip" },
};

export function t(key: keyof typeof STR, lang: Lang): string {
  const e = STR[key];
  return e ? e[lang] : String(key);
}

export function pick(b: Bilingual | undefined, lang: Lang): string {
  if (!b) return "";
  return (lang === "en" ? b.en : b.fr) || b.fr || b.en || "";
}
