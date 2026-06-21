import type { Deconstruction, Lang, SeanceLog } from "../types";
import { t } from "../lib/i18n";
import ShotDiagram from "./ShotDiagram";

/* The full deconstruction "sheet" for one scene — the découpage.
 * `decon` is already in the active language (monolingual). */
export default function Decoupage({
  decon,
  log,
  lang,
  onUpdate,
}: {
  decon: Deconstruction;
  log: SeanceLog;
  lang: Lang;
  onUpdate: (patch: Partial<SeanceLog>) => void;
}) {
  const d = decon;
  const wikiHref = d.mediaQuery
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(d.mediaQuery)}`
    : null;

  return (
    <article className="animate-riseIn">
      {/* Masthead of the sheet */}
      <header className="relative overflow-hidden rounded-lg border border-ink/15 bg-craie/70 px-6 py-7 shadow-panel sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3 sprockets opacity-60" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-3 sprockets opacity-60" />
        <div className="relative pl-3 pr-3 sm:pl-5 sm:pr-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="label text-rouge">
              {log.seedId ? t("sceneDuJour", lang) : t("onDemand", lang)}
            </p>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink/45 tnum">
              {d.year || ""}
            </p>
          </div>

          <h1
            className="mt-2 font-display font-black leading-[0.95] tracking-tight text-ink"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
          >
            {d.film}
          </h1>
          <p className="mt-2 font-text text-[1.05rem] text-ink/70">
            <span className="font-mono text-[0.74rem] uppercase tracking-[0.16em] text-laiton">
              {t("by", lang)}
            </span>{" "}
            {d.director}
          </p>

          <div className="mt-5 rule" />

          <p className="mt-5 font-display text-[1.4rem] font-medium italic leading-snug text-rouge sm:text-[1.7rem]">
            « {d.scene} »
          </p>
          {d.logline && (
            <p className="mt-3 max-w-prose font-text text-[1.05rem] leading-relaxed text-ink/75">
              {d.logline}
            </p>
          )}

          {/* where to watch */}
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.72rem] uppercase tracking-[0.14em]">
            <span className="rounded-sm bg-ink px-2 py-1 text-papier">{t("whereToWatch", lang)}</span>
            <span className="text-ink/70 normal-case tracking-normal font-text text-[0.95rem]">
              {d.whereToWatch}
            </span>
            {wikiHref && (
              <a
                href={wikiHref}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-laiton/60 underline-offset-2 hover:text-rouge"
              >
                ↗ {t("watchOnWiki", lang)}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* The setup */}
      <Section label={t("setup", lang)} index="00">
        <p className="font-text text-[1.08rem] leading-relaxed text-ink/85">{d.setup}</p>
      </Section>

      {/* The breakdown — shot by shot */}
      <Section label={t("decoupage", lang)} index="①">
        <ol className="space-y-7">
          {d.beats.map((b, i) => (
            <li key={i} className="relative grid gap-4 sm:grid-cols-[auto,1fr]">
              <div className="flex flex-row items-start gap-3 sm:w-[200px] sm:flex-col">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-[0.72rem] font-bold text-papier">
                    {i + 1}
                  </span>
                  {b.timecode && (
                    <span className="font-mono text-[0.7rem] tracking-wide text-laiton tnum">
                      {b.timecode}
                    </span>
                  )}
                </div>
                {b.diagram && (
                  <div className="w-full max-w-[200px]">
                    <ShotDiagram diagram={b.diagram} />
                  </div>
                )}
              </div>
              <div className="border-l-2 border-ink/12 pl-4">
                <p className="font-text text-[1.04rem] leading-relaxed text-ink/90">{b.shot}</p>
                <p className="mt-2 font-text text-[0.98rem] italic leading-relaxed text-ink/60">
                  → {b.read}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Sound + Performance, two columns */}
      <div className="mt-9 grid gap-7 md:grid-cols-2">
        <CardSection label={t("sound", lang)} accent="laiton">
          <p className="font-text text-[1.02rem] leading-relaxed text-ink/85">{d.sound}</p>
        </CardSection>
        <CardSection label={t("performance", lang)} accent="sauge">
          <p className="font-text text-[1.02rem] leading-relaxed text-ink/85">{d.performance}</p>
        </CardSection>
      </div>

      {/* Pourquoi — the heart, with drop cap */}
      <Section label={t("pourquoi", lang)} index="★">
        <p className="lede font-text text-[1.12rem] leading-relaxed text-ink/90">{d.pourquoi}</p>
      </Section>

      {/* Le geste — chalk on slate */}
      <div className="mt-9 overflow-hidden rounded-lg slate px-6 py-7 shadow-sheet sm:px-9">
        <p className="label text-laiton-soft">{t("geste", lang)}</p>
        <p className="mt-3 font-display text-[1.5rem] font-semibold leading-snug text-craie sm:text-[1.95rem]">
          {d.geste}
        </p>
      </div>

      {/* Aller plus loin */}
      {d.goFurther.length > 0 && (
        <Section label={t("goFurther", lang)} index="↗">
          <ul className="space-y-3">
            {d.goFurther.map((g, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 font-mono text-rouge">·</span>
                <p className="font-text text-[1.02rem] leading-relaxed text-ink/85">
                  <span className="font-display font-semibold text-ink">{g.film}</span>
                  <span className="text-ink/55"> — {g.note}</span>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Honesty note */}
      <p className="mt-8 max-w-prose font-text text-[0.82rem] italic leading-relaxed text-ink/40">
        {t("diagramNote", lang)}
      </p>

      {/* The viewer's marginalia */}
      <Marginalia log={log} lang={lang} onUpdate={onUpdate} />
    </article>
  );
}

function Section({
  label,
  index,
  children,
}: {
  label: string;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[0.95rem] text-rouge">{index}</span>
        <h2 className="font-mono text-[0.74rem] uppercase tracking-[0.22em] text-ink/70">{label}</h2>
        <span className="h-px flex-1 bg-ink/12" />
      </div>
      {children}
    </section>
  );
}

function CardSection({
  label,
  accent,
  children,
}: {
  label: string;
  accent: "laiton" | "sauge";
  children: React.ReactNode;
}) {
  const bar = accent === "laiton" ? "bg-laiton" : "bg-sauge";
  return (
    <section className="rounded-lg border border-ink/12 bg-papier-deep/50 p-5 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${bar}`} />
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ink/70">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Marginalia({
  log,
  lang,
  onUpdate,
}: {
  log: SeanceLog;
  lang: Lang;
  onUpdate: (patch: Partial<SeanceLog>) => void;
}) {
  return (
    <section className="mt-10 rounded-lg border border-dashed border-ink/25 bg-craie/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onUpdate({ watched: !log.watched })}
          className={`rounded-full px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors ${
            log.watched ? "bg-ink text-papier" : "border border-ink/30 text-ink/70 hover:border-ink"
          }`}
          aria-pressed={log.watched}
        >
          {log.watched ? `✓ ${t("watched", lang)}` : t("markWatched", lang)}
        </button>

        <button
          type="button"
          onClick={() => onUpdate({ bookmarked: !log.bookmarked })}
          className={`rounded-full px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition-colors ${
            log.bookmarked
              ? "bg-rouge text-craie"
              : "border border-rouge/40 text-rouge hover:border-rouge"
          }`}
          aria-pressed={log.bookmarked}
        >
          {log.bookmarked ? `♦ ${t("bookmarked", lang)}` : `♢ ${t("bookmark", lang)}`}
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-ink/45">
            {t("rating", lang)}
          </span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n}/5`}
              onClick={() => onUpdate({ rating: log.rating === n ? 0 : n })}
              className="text-[1.25rem] leading-none transition-transform hover:scale-110"
            >
              <span className={n <= log.rating ? "text-rouge" : "text-ink/20"}>◆</span>
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={log.note}
        onChange={(e) => onUpdate({ note: e.target.value })}
        placeholder={t("notePlaceholder", lang)}
        rows={2}
        className="mt-4 w-full resize-y rounded-md border border-ink/15 bg-papier/60 px-4 py-3 font-text text-[1rem] text-ink outline-none placeholder:text-ink/35 focus:border-rouge"
      />
    </section>
  );
}
