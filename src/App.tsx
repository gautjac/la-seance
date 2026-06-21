import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Lang, SeanceLog, SceneSeed, Settings } from "./types";
import { fetchSeance } from "./api";
import {
  addDemandLog,
  db,
  deleteLog,
  getDayLog,
  getSettings,
  recentScenes,
  seenSeedIds,
  setSettings as persistSettings,
  updateLog,
  upsertDayLog,
} from "./db";
import { migrateLang, persistLang, t } from "./lib/i18n";
import { SEEDS, seedForDate } from "./lib/seeds";
import Decoupage from "./components/Decoupage";
import Timeline from "./components/Timeline";
import Spinner from "./components/Spinner";

type Tab = "today" | "fil" | "cinematheque" | "demander";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The daily pick is date-deterministic, but we nudge past the seed for the day
 * if it's already been seen, walking forward through the list so the daily
 * scene avoids repeats while staying stable for the date. Returns the seed AND
 * whether everything has been seen (then we allow a repeat).
 */
function pickSeedForDate(date: string, seen: Set<string>): SceneSeed {
  const base = seedForDate(date);
  if (!seen.has(base.id) || seen.size >= SEEDS.length) return base;
  const startIdx = SEEDS.findIndex((s) => s.id === base.id);
  for (let step = 1; step < SEEDS.length; step++) {
    const cand = SEEDS[(startIdx + step) % SEEDS.length];
    if (!seen.has(cand.id)) return cand;
  }
  return base;
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<Tab>("today");

  const [dayLog, setDayLog] = useState<SeanceLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opened, setOpened] = useState<SeanceLog | null>(null);

  const [askText, setAskText] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [askResult, setAskResult] = useState<SeanceLog | null>(null);

  const [lang, setLangState] = useState<Lang>("fr");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persistLang(l);
    void persistSettings({ lang: l });
  }, []);

  // Load settings once; resolve shared language; bump the gentle streak.
  useEffect(() => {
    getSettings().then((s) => {
      const resolved = migrateLang(s.lang);
      // streak: increment if last seen was yesterday, reset if older, keep if today
      const today = todayStr();
      let streakCount = s.streakCount ?? 0;
      if (s.lastSeenDate !== today) {
        const last = s.lastSeenDate ? new Date(s.lastSeenDate + "T00:00:00") : null;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        streakCount = last && s.lastSeenDate === yStr ? streakCount + 1 : 1;
      }
      const next: Settings = {
        ...s,
        lang: resolved,
        streakCount,
        lastSeenDate: today,
      };
      setSettings(next);
      setLangState(resolved);
      persistLang(resolved);
      void persistSettings({ lang: resolved, streakCount, lastSeenDate: today });
    });
  }, []);

  const date = todayStr();

  const loadDay = useCallback(
    async (force = false) => {
      if (!settings) return;
      setError(null);
      if (!force) {
        const existing = await getDayLog(date);
        if (existing) {
          setDayLog(existing);
          return;
        }
      }
      setLoading(true);
      try {
        const seen = await seenSeedIds();
        // on a forced reroll, also avoid today's already-stored seed
        const existing = await getDayLog(date);
        if (force && existing?.seedId) seen.add(existing.seedId);
        const seed = pickSeedForDate(date, seen);
        const avoid = await recentScenes(lang);
        const decon = await fetchSeance({
          film: seed.film,
          director: seed.director,
          year: seed.year,
          scene: lang === "en" ? seed.scene.en : seed.scene.fr,
          lang,
          avoid,
        });
        if (force && existing?.id) await deleteLog(existing.id);
        const saved = await upsertDayLog(date, seed.id, decon);
        setDayLog(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    },
    [settings, date, lang],
  );

  // Fetch today's scene once settings are ready and onboarding is done.
  useEffect(() => {
    if (settings?.onboarded && !dayLog && !loading) {
      void loadDay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.onboarded]);

  const allLogs = useLiveQuery(
    () => db.logs.orderBy("createdAt").reverse().toArray(),
    [],
    [] as SeanceLog[],
  );
  const filLogs = useMemo(() => allLogs ?? [], [allLogs]);
  const cinemathequeLogs = useMemo(
    () => (allLogs ?? []).filter((l) => l.bookmarked),
    [allLogs],
  );

  const patchSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    await persistSettings(patch);
  };

  const patchLog = async (log: SeanceLog, patch: Partial<SeanceLog>) => {
    if (log.id == null) return;
    await updateLog(log.id, patch);
    const merged = { ...log, ...patch, updatedAt: Date.now() };
    if (dayLog?.id === log.id) setDayLog(merged);
    if (opened?.id === log.id) setOpened(merged);
    if (askResult?.id === log.id) setAskResult(merged);
  };

  const runAsk = async () => {
    if (!settings || askText.trim().length < 2) return;
    setAskError(null);
    setAskLoading(true);
    setAskResult(null);
    try {
      const avoid = await recentScenes(lang);
      const decon = await fetchSeance({ ask: askText.trim(), lang, avoid });
      const saved = await addDemandLog(decon);
      setAskResult(saved);
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setAskLoading(false);
    }
  };

  const openLog = (log: SeanceLog) => {
    setOpened(log);
    setTab("today");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeLog = async (log: SeanceLog) => {
    if (log.id == null) return;
    await deleteLog(log.id);
    if (opened?.id === log.id) setOpened(null);
    if (dayLog?.id === log.id) setDayLog(null);
  };

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-[spin_1.4s_linear_infinite] rounded-full border-2 border-ink/15 border-t-rouge" />
      </div>
    );
  }

  if (!settings.onboarded) {
    return (
      <Onboarding
        lang={lang}
        onSetLang={setLang}
        onDone={() => void patchSettings({ onboarded: true })}
      />
    );
  }

  const tabs: { key: Tab; labelKey: Parameters<typeof t>[0] }[] = [
    { key: "today", labelKey: "today" },
    { key: "fil", labelKey: "fil" },
    { key: "cinematheque", labelKey: "cinematheque" },
    { key: "demander", labelKey: "demander" },
  ];

  const shown = opened ?? dayLog;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 pb-24 pt-7 sm:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setOpened(null);
              setTab("today");
            }}
            className="group flex items-center gap-3 text-left"
          >
            <ReelMark />
            <div>
              <h1 className="font-display text-[1.85rem] font-black leading-none tracking-tight text-ink">
                La Séance
              </h1>
              <p className="label mt-1 text-ink/45">{t("appTagline", lang)}</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {settings.streakCount > 1 && (
              <span
                className="hidden items-center gap-1.5 rounded-full border border-laiton/40 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-laiton sm:inline-flex"
                title={`${settings.streakCount} ${t("streak", lang)}`}
              >
                <span className="text-rouge">●</span> {settings.streakCount}
              </span>
            )}
            <button
              type="button"
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
              className="rounded-full border border-ink/25 px-3 py-1 font-mono text-[0.72rem] uppercase tracking-widest text-ink/70 hover:border-rouge hover:text-rouge"
              title="FR / EN"
            >
              {lang === "fr" ? "FR · en" : "fr · EN"}
            </button>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-1.5 border-b border-ink/15">
          {tabs.map((tb) => {
            const isActive = tab === tb.key;
            return (
              <button
                key={tb.key}
                type="button"
                onClick={() => {
                  setTab(tb.key);
                  if (tb.key === "today") setOpened(null);
                }}
                className={`relative -mb-px rounded-t px-3.5 py-2 font-mono text-[0.74rem] uppercase tracking-widest transition-colors ${
                  isActive ? "text-ink" : "text-ink/45 hover:text-ink/75"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {t(tb.labelKey, lang)}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-rouge" />
                )}
                {tb.key === "cinematheque" && cinemathequeLogs.length > 0 && (
                  <span className="ml-1.5 text-rouge">{cinemathequeLogs.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main>
        {tab === "today" && (
          <>
            {opened && (
              <button
                type="button"
                onClick={() => setOpened(null)}
                className="mb-5 inline-flex items-center gap-1.5 font-mono text-[0.74rem] uppercase tracking-widest text-rouge hover:text-laiton"
              >
                ← {t("backToToday", lang)}
              </button>
            )}
            {loading && !shown && <Spinner lang={lang} />}
            {error && !shown && (
              <ErrorBox lang={lang} message={error} onRetry={() => loadDay(true)} />
            )}
            {shown && (
              <>
                <Decoupage log={shown} lang={lang} onUpdate={(p) => patchLog(shown, p)} />
                {!opened && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => loadDay(true)}
                      disabled={loading}
                      className="rounded-full border border-ink/25 px-5 py-2 font-mono text-[0.74rem] uppercase tracking-widest text-ink/65 hover:border-rouge hover:text-rouge disabled:opacity-40"
                    >
                      {loading ? "…" : `↻ ${t("reroll", lang)}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "fil" && (
          <Section title={t("fil", lang)}>
            <Timeline
              logs={filLogs}
              lang={lang}
              emptyKey="emptyFil"
              onOpen={openLog}
              onRemove={removeLog}
            />
          </Section>
        )}

        {tab === "cinematheque" && (
          <Section title={t("cinematheque", lang)}>
            <Timeline
              logs={cinemathequeLogs}
              lang={lang}
              emptyKey="emptyCinematheque"
              onOpen={openLog}
            />
          </Section>
        )}

        {tab === "demander" && (
          <Section title={t("askTitle", lang)}>
            <p className="mb-4 max-w-prose font-text text-[1.02rem] italic text-ink/70">
              {t("askHelp", lang)}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAsk()}
                placeholder={t("askPlaceholder", lang)}
                className="flex-1 rounded-md border border-ink/20 bg-craie/60 px-4 py-3 font-text text-[1.04rem] text-ink outline-none placeholder:text-ink/35 focus:border-rouge"
              />
              <button
                type="button"
                onClick={runAsk}
                disabled={askLoading || askText.trim().length < 2}
                className="rounded-md bg-rouge px-5 py-3 font-mono text-[0.78rem] uppercase tracking-widest text-craie hover:bg-rouge-bright disabled:opacity-40"
              >
                {askLoading ? "…" : t("ask", lang)}
              </button>
            </div>

            {askLoading && <Spinner lang={lang} message={t("loadingAsk", lang)} />}
            {askError && (
              <div className="mt-6">
                <ErrorBox lang={lang} message={askError} onRetry={runAsk} />
              </div>
            )}
            {askResult && !askLoading && (
              <div className="mt-9 border-t border-ink/15 pt-9">
                <Decoupage
                  log={askResult}
                  lang={lang}
                  onUpdate={(p) => patchLog(askResult, p)}
                />
              </div>
            )}
          </Section>
        )}
      </main>

      <footer className="mt-20 border-t border-ink/15 pt-6 text-center">
        <p className="label text-ink/35">La Séance · {t("honesty", lang)}</p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-riseIn">
      <h2 className="mb-6 font-display text-3xl font-black tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ErrorBox({
  lang,
  message,
  onRetry,
}: {
  lang: Lang;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-md border border-rouge/40 bg-rouge/5 px-5 py-6 text-center">
      <p className="font-text text-[1rem] text-ink/85">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full border border-rouge px-4 py-1.5 font-mono text-[0.74rem] uppercase tracking-widest text-rouge hover:bg-rouge hover:text-craie"
      >
        ↻ {t("retry", lang)}
      </button>
    </div>
  );
}

function ReelMark() {
  return (
    <span className="relative inline-block h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-11 w-11">
        <circle cx="22" cy="22" r="20" fill="#15110E" />
        <circle cx="22" cy="22" r="4.5" fill="#B5202B" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={22 + Math.cos(r) * 12}
              cy={22 + Math.sin(r) * 12}
              r="2.6"
              fill="none"
              stroke="#EDE4D2"
              strokeWidth="1.6"
            />
          );
        })}
      </svg>
    </span>
  );
}

function Onboarding({
  lang,
  onSetLang,
  onDone,
}: {
  lang: Lang;
  onSetLang: (l: Lang) => void;
  onDone: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="animate-riseIn">
        <div className="mb-6 flex items-center justify-between">
          <ReelMark />
          <button
            type="button"
            onClick={() => onSetLang(lang === "fr" ? "en" : "fr")}
            aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
            className="rounded-full border border-ink/25 px-3 py-1 font-mono text-[0.72rem] uppercase tracking-widest text-ink/70 hover:border-rouge hover:text-rouge"
          >
            {lang === "fr" ? "FR · en" : "fr · EN"}
          </button>
        </div>

        <h1
          className="font-display font-black leading-[0.9] tracking-tight text-ink"
          style={{ fontSize: "clamp(3rem, 11vw, 6rem)" }}
        >
          La Séance
        </h1>
        <p className="mt-2 font-mono text-[0.8rem] uppercase tracking-[0.22em] text-rouge">
          {t("appTagline", lang)}
        </p>

        <p className="mt-7 max-w-prose font-text text-[1.18rem] leading-relaxed text-ink/85">
          {t("intro", lang)}
        </p>

        <div className="mt-7 flex gap-3 rounded-lg border border-ink/15 bg-craie/50 p-5">
          <span className="mt-0.5 text-[1.3rem] text-laiton">⌖</span>
          <p className="font-text text-[1rem] leading-relaxed text-ink/70">{t("introHonesty", lang)}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDone}
            className="rounded-md bg-rouge px-6 py-4 font-mono text-[0.82rem] uppercase tracking-[0.2em] text-craie transition-colors hover:bg-rouge-bright"
          >
            {t("begin", lang)} →
          </button>
          <button
            type="button"
            onClick={onDone}
            className="font-mono text-[0.74rem] uppercase tracking-widest text-ink/45 hover:text-ink/70"
          >
            {t("skip", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
