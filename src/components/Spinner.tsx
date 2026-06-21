import type { Lang } from "../types";
import { t } from "../lib/i18n";

export default function Spinner({ lang, message }: { lang: Lang; message?: string }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center py-14 text-center animate-fadeIn">
      {/* a turning reel */}
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 animate-[spin_2.4s_linear_infinite]">
          <circle cx="32" cy="32" r="29" fill="none" stroke="#15110E" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="6" fill="#B5202B" />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const r = (deg * Math.PI) / 180;
            const cx = 32 + Math.cos(r) * 18;
            const cy = 32 + Math.sin(r) * 18;
            return <circle key={deg} cx={cx} cy={cy} r="3.6" fill="none" stroke="#15110E" strokeWidth="2" />;
          })}
        </svg>
      </div>
      <p className="mt-5 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ink/60">
        {message ?? t("loading", lang)}
      </p>
      <p className="mt-1.5 font-text text-[0.92rem] italic text-ink/45">{t("threading", lang)}…</p>
    </div>
  );
}
