/**
 * An ECG trace across the foot of a dark hero — the one ornament that says
 * "medicine" without pretending to be a photograph of anywhere. Pure SVG, no
 * request. A soft pulse travels along it once a few seconds; under
 * prefers-reduced-motion it is a still line (see .pulse-travel in
 * styles/utilities.css).
 */
export default function PulseLine({ className = "" }: { className?: string }) {
  // One beat: flat, P wave, QRS spike, T wave, flat — repeated across 1200 units.
  const beat = (x: number) =>
    `L${x + 40},60 Q${x + 52},50 ${x + 64},60 L${x + 84},60 L${x + 92},66 L${x + 102},14 L${x + 112},92 L${x + 122},60 L${x + 142},60 Q${x + 160},44 ${x + 178},60 L${x + 240},60`;
  const d = `M0,60 ${[0, 240, 480, 720, 960].map(beat).join(" ")}`;
  return (
    <svg
      viewBox="0 0 1200 110"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pulse-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="0.25" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#2dd4bf" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#pulse-fade)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#a5f3fc" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="pulse-travel" />
    </svg>
  );
}
