/* Original line illustrations of the four product families in the run ([VENDOR SKUS]). */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function LaptopArt() {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <defs>
        <linearGradient id="la-s" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0eefc" />
          <stop offset="1" stopColor="#f4ecfb" />
        </linearGradient>
      </defs>
      <rect {...stroke} x="18" y="8" width="84" height="54" rx="5" fill="url(#la-s)" />
      <path {...stroke} d="M8 66h104l-6 9H14z" fill="#fff" />
      <path {...stroke} d="M52 70h16" />
      {/* sparkle = on-device AI */}
      <path d="M60 22l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#0F6CBD" stroke="none" />
      <circle cx="76" cy="24" r="2.5" fill="#8764B8" />
    </svg>
  )
}

export function TwoInOneArt() {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <rect {...stroke} x="22" y="6" width="70" height="50" rx="5" fill="#eef4fb" />
      <rect x="28" y="12" width="58" height="38" rx="2" fill="#fff" stroke="none" />
      <path d="M34 42c10-14 18-14 26-6s14 4 20-6" fill="none" stroke="#0F6CBD" strokeWidth="2.4" strokeLinecap="round" />
      <path {...stroke} d="M30 56l-10 18h76" />
      <path {...stroke} d="M86 56l8 18" />
      {/* pen */}
      <path {...stroke} d="M100 14l8 3-12 38-5 3-1-6z" fill="#fff" />
    </svg>
  )
}

export function DesktopArt() {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <rect {...stroke} x="12" y="6" width="96" height="58" rx="5" fill="#f3f7fd" />
      <path {...stroke} d="M12 52h96" />
      <g fill="#0F6CBD">
        <rect x="47" y="56" width="5" height="5" rx="1" />
        <rect x="55" y="56" width="5" height="5" rx="1" opacity=".7" />
        <rect x="63" y="56" width="5" height="5" rx="1" opacity=".5" />
        <rect x="71" y="56" width="5" height="5" rx="1" opacity=".35" />
      </g>
      <rect {...stroke} x="22" y="14" width="40" height="30" rx="3" fill="#fff" strokeWidth={1.6} />
      <rect {...stroke} x="68" y="14" width="30" height="14" rx="3" fill="#fff" strokeWidth={1.6} />
      <path {...stroke} d="M52 64l-4 12h24l-4-12" fill="#fff" />
    </svg>
  )
}

export function SuiteArt() {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <path {...stroke} d="M30 8h34l14 14v50a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff" />
      <path {...stroke} d="M64 8v14h14" />
      <path {...stroke} d="M34 34h34M34 42h34M34 50h22" strokeWidth={1.6} />
      <rect {...stroke} x="62" y="44" width="40" height="30" rx="5" fill="#eaf5ea" />
      <path {...stroke} d="M62 54h40M62 64h40M75 44v30M88 44v30" strokeWidth={1.4} />
      <circle {...stroke} cx="96" cy="22" r="11" fill="#f5eefc" />
      <path {...stroke} d="M96 13v9h9" strokeWidth={1.6} />
    </svg>
  )
}
