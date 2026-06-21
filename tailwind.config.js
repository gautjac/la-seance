/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "salle de projection / découpage" — ink on newsprint, with a
        // deep cinema-red and a brass ochre. Distinct from Le Cadre's
        // projector-amber-on-black.
        ink: "#15110E", // near-black brown-ink (text, frames)
        "ink-soft": "#2A231D",
        papier: "#EDE4D2", // warm newsprint cream (page)
        "papier-deep": "#E3D8C2", // a shade down, for panels
        "papier-edge": "#D6C9AE", // hairlines / borders
        craie: "#FBF7EE", // chalk white (cards, highlights)
        rouge: "#B5202B", // rouge cinéma (primary accent)
        "rouge-bright": "#D2353C",
        laiton: "#A6792E", // brass / ochre (secondary accent, timecodes)
        "laiton-soft": "#C9A85E",
        sauge: "#5E6B57", // muted green (rare third accent)
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        text: ['"Spectral"', "Georgia", "serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(21,17,14,0.04), 0 18px 40px -28px rgba(21,17,14,0.45)",
        sheet: "0 2px 0 rgba(21,17,14,0.06), 0 30px 60px -40px rgba(21,17,14,0.55)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        flicker: {
          "0%,100%": { opacity: "1" },
          "48%": { opacity: "0.86" },
          "52%": { opacity: "0.97" },
        },
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        riseIn: "riseIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
        fadeIn: "fadeIn 0.6s ease both",
        flicker: "flicker 4.5s ease-in-out infinite",
        sweep: "sweep 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
