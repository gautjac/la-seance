import type { Lang, SeanceLog } from "../types";
import { pick, t } from "../lib/i18n";

type EmptyKey = "emptyFil" | "emptyCinematheque";

export default function Timeline({
  logs,
  lang,
  emptyKey,
  onOpen,
  onRemove,
}: {
  logs: SeanceLog[];
  lang: Lang;
  emptyKey: EmptyKey;
  onOpen: (log: SeanceLog) => void;
  onRemove?: (log: SeanceLog) => void;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink/20 bg-craie/40 px-6 py-12 text-center">
        <p className="mx-auto max-w-sm font-text text-[1.05rem] italic leading-relaxed text-ink/55">
          {t(emptyKey, lang)}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => {
        const d = log.decon;
        const dayLabel =
          log.date.startsWith("ask-")
            ? t("onDemand", lang)
            : new Date(log.date + "T00:00:00").toLocaleDateString(
                lang === "fr" ? "fr-CA" : "en-CA",
                { day: "numeric", month: "short", year: "numeric" },
              );
        return (
          <li
            key={log.id ?? log.date}
            className="group relative overflow-hidden rounded-lg border border-ink/12 bg-craie/60 shadow-panel transition-shadow hover:shadow-sheet"
          >
            <button
              type="button"
              onClick={() => onOpen(log)}
              className="block w-full px-5 py-4 text-left"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-laiton">
                  {dayLabel}
                </p>
                <div className="flex items-center gap-2">
                  {log.rating > 0 && (
                    <span className="font-mono text-[0.8rem] text-rouge tnum">
                      {"◆".repeat(log.rating)}
                    </span>
                  )}
                  {log.watched && (
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink/50">
                      ✓ {t("watched", lang)}
                    </span>
                  )}
                  {log.bookmarked && <span className="text-rouge">♦</span>}
                </div>
              </div>
              <h3 className="mt-1.5 font-display text-[1.3rem] font-bold leading-tight text-ink">
                {d.film}
                <span className="ml-2 font-text text-[0.95rem] font-normal text-ink/45">
                  {d.year || ""}
                </span>
              </h3>
              <p className="mt-0.5 font-text text-[1rem] italic text-rouge/85">
                « {pick(d.scene, lang)} »
              </p>
              <p className="mt-1 font-text text-[0.88rem] text-ink/50">
                {t("by", lang)} {d.director}
              </p>
              {log.note.trim() && (
                <p className="mt-2 line-clamp-2 font-text text-[0.92rem] italic text-ink/55">
                  ✎ {log.note}
                </p>
              )}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(log)}
                aria-label={t("remove", lang)}
                className="absolute right-3 top-3 rounded-full border border-ink/20 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-ink/40 opacity-0 transition-opacity hover:border-rouge hover:text-rouge group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
