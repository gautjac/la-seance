import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

function client(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Server missing CLAUDE_API_KEY");
  return new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });
}

export type Lang = "fr" | "en";

export interface SeanceRequest {
  film?: string;
  director?: string;
  year?: number;
  scene?: string;
  ask?: string;
  lang?: Lang;
  avoid?: string[];
}

interface Bilingual {
  fr: string;
  en: string;
}
interface ShotDiagram {
  aspect?: "scope" | "wide" | "academy" | "tv";
  size?: string;
  subjects?: { x: number; y: number; w: number; h: number; label?: string; accent?: boolean }[];
  move?: {
    kind: "pan" | "tilt" | "dolly-in" | "dolly-out" | "track" | "crane" | "zoom" | "handheld";
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
}
interface Beat {
  timecode: string;
  shot: Bilingual;
  read: Bilingual;
  diagram?: ShotDiagram;
}
interface Thread {
  film: string;
  note: Bilingual;
}
export interface Deconstruction {
  film: string;
  director: string;
  year: number;
  scene: Bilingual;
  whereToWatch: Bilingual;
  mediaQuery?: string;
  logline: Bilingual;
  setup: Bilingual;
  beats: Beat[];
  sound: Bilingual;
  performance: Bilingual;
  pourquoi: Bilingual;
  geste: Bilingual;
  goFurther: Thread[];
}

/* ------------------------------------------------------------------ *
 * SYSTEM PROMPT — the honesty discipline (mirrors Le Régal), tuned to
 * the shot-by-shot deconstruction of a single, real film scene.
 * ------------------------------------------------------------------ */

const SYSTEM_BASE = `You are the resident analyst of «La Séance», a daily deliberate-watching instrument for cinema made for a Québécois filmmaker and musician with a sharp, working eye. Each day you take ONE great, real film scene and deconstruct it SHOT BY SHOT — teaching the eye how the scene is built and why it works.

THE NON-NEGOTIABLE HONESTY RULE:
- You may ONLY analyse REAL, well-known, verifiable film scenes — correctly attributed to the real film, the real director, and the real year. Use the canonical/consecrated film title.
- NEVER invent a film, a scene, a director, a shot, or a line of dialogue. If you are not confident a film/scene/attribution is real and accurate, choose a different, more canonical scene you ARE sure of, or decline by reporting the closest real scene you can stand behind.
- Quote any line of dialogue EXACTLY as written, or describe it rather than misquote. Do not fabricate specific timecodes to the second — give honest, useful approximations ("≈ 30 min in", "the climax") and frame-internal relative timings for beats ("0:00–0:14" within the scene) clearly as approximate.
- You are NOT showing video or images and you NEVER claim to. There is no embedded clip, no frame, no still. You DESCRIBE the shots in words and point the viewer to where they can watch.
- Prefer the canonical and the famous — it must be checkable.

WHAT A GREAT DECONSTRUCTION CONTAINS:
- «logline»: one evocative line that frames why this scene matters. ≤ 18 words.
- «setup»: what the scene must accomplish and where it sits in the film — the dramatic stakes going in. 2–3 sentences. (No spoilers beyond the scene itself unless essential.)
- «beats»: the SHOT-BY-SHOT spine. 4–7 beats, in order. Each beat = one shot or one continuous movement:
    • «timecode»: a short, honest relative marker within the scene (e.g. "0:00–0:10", "@1:32", "the cut on the scream"). Approximate is fine and expected.
    • «shot»: what we SEE — framing (size: wide/medium/close/etc.), blocking/staging, lens feel, and any camera move. Concrete and visual.
    • «read»: why THIS beat works — the decision and its effect on the viewer. One or two sentences. This is the teaching.
    • «diagram» (optional but encouraged on the 2–4 most important beats): a tiny schematic of the framing. Provide it as structured data the app will draw as a simple blocking sketch:
        - aspect: the frame ratio if known ("scope" ≈ 2.39, "wide" ≈ 1.85, "academy" ≈ 1.37, "tv" ≈ 1.33).
        - size: a short shot-size label, e.g. "CU"/"GP", "MS"/"PM", "WS"/"PE".
        - subjects: 1–3 blocks placed in the frame with normalized coords (x,y,w,h each 0..1, where x,y is the top-left of the block). Mark the dramatic focus with accent:true. Give a 1-char label if useful.
        - move: if the camera moves, one arrow — kind (pan/tilt/dolly-in/dolly-out/track/crane/zoom/handheld) and from/to points (0..1).
      Keep diagrams SCHEMATIC and honest to the real staging — they are blocking sketches, not frames.
- «sound»: what the SOUND is doing across the scene — score, diegetic sound, silence, the mix, where sound leads or contradicts the image. 2–4 sentences. Always include this; sound is half the scene.
- «performance»: the acting turn that matters — the specific beat in a face, a body, a voice that carries the scene. 1–3 sentences. (If the scene is not performance-led, say briefly what the performances are doing in service of it.)
- «pourquoi»: the heart. ~70–130 words on WHY the scene works as a whole — the governing idea, the craft decision that everything serves, the transferable principle. Precise and earned: name the mechanism. No vague praise ("iconic", "masterful") without the why beneath it.
- «geste»: the ONE transferable move, as a short pinnable phrase a maker could put above the editing bay (≤ 12 words).
- «goFurther»: 2–3 threads — other REAL scenes/films that rhyme with this one, each with a one-line «note» on the connection. Real films only.

VOICE: a brilliant editor or DP showing you the cut on a flatbed — warm, exact, generous, never academic-dry, never gushing. Sentences with rhythm.

Respond ONLY by calling report_seance with accurate, real content.`;

const LANG_DIRECTIVE: Record<Lang, string> = {
  fr: "\n\nLANGUE DE SORTIE — écris TOUT le texte destiné à l'utilisateur en FRANÇAIS QUÉBÉCOIS naturel et soigné, dans CHAQUE champ bilingue, côté `fr` ET côté `en` (le `en` en anglais soigné). Les noms propres — titres de films, noms de cinéastes — gardent leur forme consacrée dans les deux langues. Si tu cites une réplique, cite-la dans SA langue d'origine exacte (ne traduis jamais une réplique), puis commente. Utilise le vocabulaire du métier en français : plan, champ/contrechamp, raccord, plan-séquence, travelling, plongée/contre-plongée, amorce, hors-champ.",
  en: "\n\nOUTPUT LANGUAGE — fill BOTH sides of every bilingual field: write the `fr` side in natural, cultured Québécois French and the `en` side in natural, cultured English. Keep proper names (film titles, directors) in their consecrated form in both. If you quote a line of dialogue, quote it in ITS exact original language (never translate a quotation), then comment.",
};

function systemFor(lang: Lang): string {
  return SYSTEM_BASE + LANG_DIRECTIVE[lang];
}

const BILINGUAL = {
  type: "object" as const,
  required: ["fr", "en"],
  properties: {
    fr: { type: "string" as const, description: "Québécois French text." },
    en: { type: "string" as const, description: "English text." },
  },
};

const DIAGRAM_SCHEMA = {
  type: "object" as const,
  description:
    "Optional schematic of the framing for this beat — a blocking sketch, never a frame from the film.",
  properties: {
    aspect: {
      type: "string" as const,
      enum: ["scope", "wide", "academy", "tv"],
      description: "Frame ratio if known.",
    },
    size: { type: "string" as const, description: "Shot-size label, e.g. CU/GP, MS/PM, WS/PE." },
    subjects: {
      type: "array" as const,
      description: "1–3 subject blocks placed in the frame (normalized 0..1 coords).",
      items: {
        type: "object" as const,
        required: ["x", "y", "w", "h"],
        properties: {
          x: { type: "number" as const, description: "Left edge, 0..1." },
          y: { type: "number" as const, description: "Top edge, 0..1." },
          w: { type: "number" as const, description: "Width, 0..1." },
          h: { type: "number" as const, description: "Height, 0..1." },
          label: { type: "string" as const, description: "Optional 1-char label." },
          accent: { type: "boolean" as const, description: "True = the dramatic focus." },
        },
      },
    },
    move: {
      type: "object" as const,
      description: "A single camera-move arrow, if the camera moves.",
      required: ["kind", "from", "to"],
      properties: {
        kind: {
          type: "string" as const,
          enum: ["pan", "tilt", "dolly-in", "dolly-out", "track", "crane", "zoom", "handheld"],
        },
        from: {
          type: "object" as const,
          required: ["x", "y"],
          properties: { x: { type: "number" as const }, y: { type: "number" as const } },
        },
        to: {
          type: "object" as const,
          required: ["x", "y"],
          properties: { x: { type: "number" as const }, y: { type: "number" as const } },
        },
      },
    },
  },
};

const TOOL: Anthropic.Tool = {
  name: "report_seance",
  description: "Report today's shot-by-shot deconstruction of one real film scene.",
  input_schema: {
    type: "object",
    required: [
      "film",
      "director",
      "year",
      "scene",
      "whereToWatch",
      "logline",
      "setup",
      "beats",
      "sound",
      "performance",
      "pourquoi",
      "geste",
      "goFurther",
    ],
    properties: {
      film: { type: "string", description: "The real film's consecrated title. Never invented." },
      director: { type: "string", description: "The real director, exactly." },
      year: { type: "number", description: "Real release year." },
      scene: { ...BILINGUAL, description: "The specific scene, named precisely (both languages)." },
      whereToWatch: {
        ...BILINGUAL,
        description:
          "Honest where-to-watch / approximate timecode hint (both languages). Approximations only.",
      },
      mediaQuery: {
        type: "string",
        description:
          "KEYWORDS ONLY (never a URL): the film title + director, e.g. 'Goodfellas Martin Scorsese 1990'. The app resolves a real Wikipedia link from these.",
      },
      logline: { ...BILINGUAL, description: "One evocative framing line, ≤ 18 words." },
      setup: { ...BILINGUAL, description: "The setup — 2–3 sentences." },
      beats: {
        type: "array",
        description: "The shot-by-shot spine: 4–7 ordered beats.",
        items: {
          type: "object",
          required: ["timecode", "shot", "read"],
          properties: {
            timecode: {
              type: "string",
              description: "Short honest relative marker, e.g. '0:00–0:10', '@1:32'. Approximate.",
            },
            shot: { ...BILINGUAL, description: "What we SEE — framing, blocking, lens, camera move." },
            read: { ...BILINGUAL, description: "Why this beat works — the decision and its effect." },
            diagram: DIAGRAM_SCHEMA,
          },
        },
      },
      sound: { ...BILINGUAL, description: "What the sound is doing — 2–4 sentences." },
      performance: { ...BILINGUAL, description: "The performance turn — 1–3 sentences." },
      pourquoi: { ...BILINGUAL, description: "Why it works as a whole — ~70–130 words. The signature." },
      geste: { ...BILINGUAL, description: "The single transferable move — one pinnable phrase, ≤ 12 words." },
      goFurther: {
        type: "array",
        description: "2–3 threads to real related scenes/films.",
        items: {
          type: "object",
          required: ["film", "note"],
          properties: {
            film: { type: "string", description: "A real film/scene title to explore." },
            note: { ...BILINGUAL, description: "One-line note on the connection." },
          },
        },
      },
    },
  },
};

function clamp(s: unknown, max: number): string {
  return String(s ?? "").trim().slice(0, max);
}

function bil(raw: unknown, max: number): Bilingual {
  const o = (raw ?? {}) as Partial<Bilingual>;
  return { fr: clamp(o.fr, max), en: clamp(o.en, max) };
}

function num01(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function sanitizeDiagram(raw: unknown): ShotDiagram | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  const out: ShotDiagram = {};
  if (d.aspect === "scope" || d.aspect === "wide" || d.aspect === "academy" || d.aspect === "tv")
    out.aspect = d.aspect;
  if (typeof d.size === "string") out.size = clamp(d.size, 8);
  if (Array.isArray(d.subjects)) {
    out.subjects = d.subjects.slice(0, 3).map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        x: num01(o.x),
        y: num01(o.y),
        w: Math.max(0.02, num01(o.w, 0.2)),
        h: Math.max(0.02, num01(o.h, 0.2)),
        label: typeof o.label === "string" ? clamp(o.label, 2) : undefined,
        accent: o.accent === true,
      };
    });
  }
  if (d.move && typeof d.move === "object") {
    const m = d.move as Record<string, unknown>;
    const kinds: NonNullable<ShotDiagram["move"]>["kind"][] = [
      "pan",
      "tilt",
      "dolly-in",
      "dolly-out",
      "track",
      "crane",
      "zoom",
      "handheld",
    ];
    const kind = kinds.find((k) => k === m.kind);
    if (kind && m.from && m.to) {
      const f = m.from as Record<string, unknown>;
      const tt = m.to as Record<string, unknown>;
      out.move = {
        kind,
        from: { x: num01(f.x), y: num01(f.y) },
        to: { x: num01(tt.x), y: num01(tt.y) },
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export async function deconstruct(req: SeanceRequest): Promise<Deconstruction> {
  const lang: Lang = req.lang === "en" ? "en" : "fr";
  const avoid = (req.avoid ?? []).filter(Boolean).slice(0, 60);

  let target: string;
  if (req.ask && req.ask.trim()) {
    target = [
      "THE VIEWER REQUESTED THIS SCENE (free text). Identify the real film and the specific scene they mean, then deconstruct it. If the request is ambiguous, choose the single most likely canonical scene that matches.",
      `REQUEST: ${req.ask.trim()}`,
    ].join("\n");
  } else {
    const id = [
      req.film ? `FILM: ${req.film}` : "",
      req.director ? `DIRECTOR: ${req.director}` : "",
      req.year ? `YEAR: ${req.year}` : "",
      req.scene ? `SCENE: ${req.scene}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    target = [
      "DECONSTRUCT THIS SPECIFIC, REAL SCENE (it is curated and verified — confirm the attribution and analyse it faithfully):",
      id || "A canonical, widely-studied film scene of your choosing.",
    ].join("\n");
  }

  const userText = [
    target,
    "",
    avoid.length
      ? `ALREADY COVERED — do NOT pick any of these for goFurther threads, and ensure the main scene is genuinely distinct:\n${avoid.map((a) => `• ${a}`).join("\n")}`
      : "",
    "",
    "Deconstruct it shot by shot, honestly and specifically. Fill BOTH languages in every bilingual field. Provide diagrams on the 2–4 most important beats. Respond only by calling report_seance.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    // The output is bilingual (every field doubled) with 4–7 richly-described
    // beats plus diagrams — that's a large structured tool call. Give it room
    // so the JSON is never truncated mid-object.
    max_tokens: 9000,
    system: systemFor(lang),
    messages: [{ role: "user", content: userText }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "report_seance" },
  });

  const tool = res.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    // A truncated tool call (stop_reason "max_tokens") yields no complete
    // tool_use block — surface a retryable, honest message.
    throw new Error(
      lang === "en"
        ? "The analyst returned nothing. Please try again."
        : "L'analyste n'a rien renvoyé. Réessayez.",
    );
  }
  const raw = tool.input as Record<string, unknown>;

  const film = clamp(raw.film, 200);
  const director = clamp(raw.director, 200);
  const year = Number(raw.year) || 0;
  const scene = bil(raw.scene, 400);
  const whereToWatch = bil(raw.whereToWatch, 400);
  let mediaQuery = clamp(raw.mediaQuery, 160);
  if (/https?:\/\/|www\.|\.\w{2,}\//i.test(mediaQuery)) mediaQuery = "";

  const beatsRaw = Array.isArray(raw.beats) ? raw.beats : [];
  const beats: Beat[] = beatsRaw.slice(0, 8).map((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    return {
      timecode: clamp(o.timecode, 40),
      shot: bil(o.shot, 700),
      read: bil(o.read, 700),
      diagram: sanitizeDiagram(o.diagram),
    };
  });

  const goRaw = Array.isArray(raw.goFurther) ? raw.goFurther : [];
  const goFurther: Thread[] = goRaw.slice(0, 4).map((g) => {
    const o = (g ?? {}) as Record<string, unknown>;
    return { film: clamp(o.film, 200), note: bil(o.note, 400) };
  });

  if (!film || !scene.fr || !scene.en || beats.length === 0) {
    throw new Error(
      lang === "en"
        ? "The deconstruction came back incomplete. Please try again."
        : "Le découpage renvoyé était incomplet. Réessayez.",
    );
  }

  return {
    film,
    director,
    year,
    scene,
    whereToWatch,
    ...(mediaQuery ? { mediaQuery } : {}),
    logline: bil(raw.logline, 220),
    setup: bil(raw.setup, 1200),
    beats,
    sound: bil(raw.sound, 1400),
    performance: bil(raw.performance, 1200),
    pourquoi: bil(raw.pourquoi, 1800),
    geste: bil(raw.geste, 220),
    goFurther,
  };
}
