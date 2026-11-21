/**
 * Spot illustrations for empty states. Decorative: hidden from assistive technology, so the text
 * beside each one has to say everything. Colours are the --art-* tokens in src/app/globals.css,
 * which switch with dark mode.
 */

const outline = { stroke: "var(--art-outline)", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Bigfoot asleep in its hood beside an empty calendar: nothing coming up (BIG-97). */
export function SleepingBigfoot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 8 200 164" aria-hidden focusable="false" className={className}>
      <circle cx="100" cy="90" r="80" fill="var(--art-halo)" />

      {/* Zz */}
      <path d="M102 36h11l-11 13h11M92 60h7l-7 8h7" fill="none" stroke="var(--art-accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Bigfoot: ears and shoulders behind the hood, then the hood, then the face */}
      <circle cx="31" cy="112" r="6" fill="var(--art-fur)" {...outline} />
      <circle cx="101" cy="100" r="6" fill="var(--art-fur)" {...outline} />
      <path d="M32 157c0-20 12-32 28-32h12c16 0 28 12 28 32Z" fill="var(--art-fur)" {...outline} />
      <path d="M50 65l2-12 6 9M58 62l4-10 4 10" fill="var(--art-fur)" {...outline} />
      <path d="M31 129C22 96 35 63 62 61c26-2 42 24 41 57Z" fill="var(--art-fur)" {...outline} />
      <ellipse cx="68" cy="108" rx="21" ry="17" transform="rotate(-10 68 108)" fill="var(--art-face)" />
      <path d="M54 106q4 3 8 0M70 103q4 3 8 0" fill="none" {...outline} strokeWidth="2.5" />
      <ellipse cx="67" cy="111" rx="3.5" ry="2.5" fill="var(--art-fur)" />
      <ellipse cx="70" cy="117" rx="2" ry="2.5" fill="var(--art-outline)" />

      {/* Calendar */}
      <rect x="118" y="58" width="67" height="77" rx="9" fill="var(--art-paper)" {...outline} />
      <path d="M118 80V67a9 9 0 0 1 9-9h49a9 9 0 0 1 9 9v13Z" fill="var(--art-accent)" {...outline} />
      <path d="M136 52v12M167 52v12" {...outline} />
      {[92, 103.5, 115].flatMap((y) =>
        [134, 150, 166].map((x) => <rect key={`${x}-${y}`} x={x - 5} y={y - 3} width="10" height="6" rx="2" fill="var(--art-cell)" />),
      )}

      <path d="M8 157.5h184" {...outline} />
    </svg>
  );
}
