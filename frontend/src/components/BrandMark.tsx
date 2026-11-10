import { NavLink } from "react-router-dom";

/** Spec 190 logo: a club-style shield holding a match ball, a gold star above and a
 *  cyan replay swoosh, drawn as one crisp SVG so it stays sharp at every size. */
export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg data-logo="crest" width={size} height={(size * 56) / 48} viewBox="0 0 48 56" aria-hidden className="brand-crest shrink-0">
      <defs>
        <linearGradient id="fm-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b63" />
          <stop offset="1" stopColor="#0a1027" />
        </linearGradient>
        <linearGradient id="fm-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="0.55" stopColor="#818cf8" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <radialGradient id="fm-ball" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d3ea" />
        </radialGradient>
        <linearGradient id="fm-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1b0" />
          <stop offset="1" stopColor="#f5b70a" />
        </linearGradient>
      </defs>
      <path d="M24 2.5 43.5 8.5V26c0 13.6-8.7 22.6-19.5 27.5C13.2 48.6 4.5 39.6 4.5 26V8.5Z" fill="url(#fm-shield)" stroke="url(#fm-edge)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M9.5 12.2 24 7.8l14.5 4.4" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 9.2l1.25 2.55 2.8.4-2.03 1.98.48 2.79L24 15.6l-2.5 1.32.48-2.79-2.03-1.98 2.8-.4Z" fill="url(#fm-gold)" />
      <path d="M10.6 36.5a15 15 0 0 1 2.1-17.3" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path d="M12.7 19.2l-.4 3.4 3.1-1.3" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="30" r="11.2" fill="url(#fm-ball)" stroke="#0a1027" strokeWidth="0.8" />
      <path d="M25 25.6l4.18 3.04-1.6 4.91h-5.16l-1.6-4.91Z" fill="#111a3d" />
      <g stroke="#111a3d" strokeWidth="1.1" strokeLinecap="round">
        <path d="M25 25.6V18.9" /><path d="M29.18 28.64l6.3-2.05" /><path d="M27.58 33.55l3.9 5.37" />
        <path d="M22.42 33.55l-3.9 5.37" /><path d="M20.82 28.64l-6.3-2.05" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <NavLink to="/" className="app-brand flex items-center gap-3" aria-label="Football Memories home">
      <Crest />
      <span className="brand-wordmark flex flex-col leading-none">
        <span className="brand-kicker">Football</span>
        <span className="brand-name">Memories</span>
      </span>
    </NavLink>
  );
}
