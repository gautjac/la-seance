import type { ShotDiagram as Diagram } from "../types";

/* ------------------------------------------------------------------ *
 * ShotDiagram — a tiny, hand-drawn framing/blocking schematic.
 *
 * The visual signature of La Séance: NOT a film still. A simple frame
 * rectangle (correct aspect), subject blocks where they sit in frame,
 * and a single camera-move arrow. Drawn in ink on the newsprint, with
 * the dramatic focus in rouge.
 * ------------------------------------------------------------------ */

const ASPECTS: Record<NonNullable<Diagram["aspect"]>, number> = {
  scope: 2.39,
  wide: 1.85,
  academy: 1.37,
  tv: 1.33,
};

const MOVE_LABEL: Record<NonNullable<Diagram["move"]>["kind"], string> = {
  pan: "PAN",
  tilt: "TILT",
  "dolly-in": "DOLLY IN",
  "dolly-out": "DOLLY OUT",
  track: "TRAVELLING",
  crane: "GRUE",
  zoom: "ZOOM",
  handheld: "ÉPAULE",
};

export default function ShotDiagram({ diagram }: { diagram: Diagram }) {
  const ratio = diagram.aspect ? ASPECTS[diagram.aspect] : 1.85;

  // Fixed drawing height; width follows the aspect. Padding around the frame.
  const H = 132;
  const W = Math.round(H * ratio);
  const pad = 14;
  const fx = pad;
  const fy = pad;
  const fw = W;
  const fh = H;
  const totalW = W + pad * 2;
  const totalH = H + pad * 2;

  // map normalized (0..1) coords into the frame box
  const mx = (x: number) => fx + x * fw;
  const my = (y: number) => fy + y * fh;

  const move = diagram.move;
  const arrowId = `arrow-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <figure className="my-1 inline-block">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        width="100%"
        style={{ maxWidth: totalW, height: "auto" }}
        role="img"
        aria-label={
          "Schéma de cadrage" +
          (diagram.size ? ` — ${diagram.size}` : "") +
          (move ? ` — ${MOVE_LABEL[move.kind]}` : "")
        }
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#B5202B" />
          </marker>
        </defs>

        {/* the film frame */}
        <rect
          x={fx}
          y={fy}
          width={fw}
          height={fh}
          fill="rgba(251,247,238,0.55)"
          stroke="#15110E"
          strokeWidth={2}
        />
        {/* rule-of-thirds guides, faint */}
        {[1, 2].map((i) => (
          <line
            key={`v${i}`}
            x1={fx + (fw / 3) * i}
            y1={fy}
            x2={fx + (fw / 3) * i}
            y2={fy + fh}
            stroke="#15110E"
            strokeWidth={0.6}
            strokeDasharray="2 4"
            opacity={0.3}
          />
        ))}
        {[1, 2].map((i) => (
          <line
            key={`h${i}`}
            x1={fx}
            y1={fy + (fh / 3) * i}
            x2={fx + fw}
            y2={fy + (fh / 3) * i}
            stroke="#15110E"
            strokeWidth={0.6}
            strokeDasharray="2 4"
            opacity={0.3}
          />
        ))}

        {/* subjects */}
        {(diagram.subjects ?? []).map((s, i) => {
          const x = mx(s.x);
          const y = my(s.y);
          const w = Math.max(6, s.w * fw);
          const h = Math.max(6, s.h * fh);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={s.accent ? "rgba(181,32,43,0.18)" : "rgba(21,17,14,0.10)"}
                stroke={s.accent ? "#B5202B" : "#15110E"}
                strokeWidth={s.accent ? 2 : 1.4}
              />
              {s.label && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'Space Mono', monospace"
                  fontSize={13}
                  fontWeight={700}
                  fill={s.accent ? "#B5202B" : "#15110E"}
                >
                  {s.label}
                </text>
              )}
            </g>
          );
        })}

        {/* camera move arrow */}
        {move && (
          <line
            x1={mx(move.from.x)}
            y1={my(move.from.y)}
            x2={mx(move.to.x)}
            y2={my(move.to.y)}
            stroke="#B5202B"
            strokeWidth={2.2}
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
          />
        )}

        {/* sprocket ticks on the left edge — film-strip cue */}
        {[0.16, 0.42, 0.68, 0.94].map((p, i) => (
          <rect
            key={`sp${i}`}
            x={3}
            y={fy + p * fh - 4}
            width={5}
            height={7}
            rx={1}
            fill="#A6792E"
            opacity={0.85}
          />
        ))}
      </svg>
      {(diagram.size || move) && (
        <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink/55">
          {diagram.size && <span>{diagram.size}</span>}
          {move && <span className="text-rouge">↳ {MOVE_LABEL[move.kind]}</span>}
        </figcaption>
      )}
    </figure>
  );
}
