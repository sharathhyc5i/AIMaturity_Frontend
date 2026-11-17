import { useState } from 'react'

/**
 * Logo slot. Drop an official logo file into /public/logos/<id>.svg (or .png)
 * and it is used automatically; until then a plain typographic name is shown.
 * Brand artwork is not bundled with the project — use the files your
 * organisation is licensed to use.
 */
const NAMES: Record<string, string> = {
  microsoft: 'Microsoft',
  'best-buy': 'Best Buy',
  currys: 'Currys',
  yodobashi: 'Yodobashi Camera',
  'jb-hi-fi': 'JB Hi-Fi',
  'ingram-micro': 'Ingram Micro',
  amazon: 'Amazon',
  'c5i': 'C5i',
  
}

const LOGOS: Record<string, string> = {
  microsoft: "/microsoft.png", // or .svg
  c5i: "/c5ilogo.png",
  "best-buy": "/bestbuy.png",
  currys: "/Currys.png",
  yodobashi: "/Yodobashi.png",
  "jb-hi-fi": "/JB_HiFi.png",
  "ingram-micro": "/Ingram.png", // if available
  amazon: "/amazon.png",
};

/** Microsoft logo: the four-square mark and the wordmark set in Segoe UI Semibold. */
export function MicrosoftLogo({ height = 24, className = '' }: { height?: number; className?: string }) {
  const sq = height * 0.9
  const cell = (sq - sq * 0.045) / 2
  const gap = sq - cell * 2
  return (
    <span className={`ms-logo ${className}`} role="img" aria-label="Microsoft" style={{ height, gap: Math.round(height * 0.3) }}>
      <svg width={sq} height={sq} viewBox={`0 0 ${sq} ${sq}`} aria-hidden="true">
        <rect x="0" y="0" width={cell} height={cell} fill="#F25022" />
        <rect x={cell + gap} y="0" width={cell} height={cell} fill="#7FBA00" />
        <rect x="0" y={cell + gap} width={cell} height={cell} fill="#00A4EF" />
        <rect x={cell + gap} y={cell + gap} width={cell} height={cell} fill="#FFB900" />
      </svg>
      <span className="ms-logo__word" style={{ fontSize: Math.round(height * 0.98) }} aria-hidden="true">Microsoft</span>
    </span>
  )
}

// export function C5iLogo({
//   height = 24,
//   className = "",
// }: {
//   height?: number;
//   className?: string;
// }) {
//   const sq = height * 0.9;
//   const cell = (sq - sq * 0.045) / 2;
//   const gap = sq - cell * 2;
//   return (
//     <span
//       className={`ms-logo ${className}`}
//       role="img"
//       aria-label="Microsoft"
//       style={{ height, gap: Math.round(height * 0.3) }}
//     >
//       <svg
//         width={sq}
//         height={sq}
//         viewBox={`0 0 ${sq} ${sq}`}
//         aria-hidden="true"
//       >
//         <rect x="0" y="0" width={cell} height={cell} fill="#F25022" />
//         <rect x={cell + gap} y="0" width={cell} height={cell} fill="#7FBA00" />
//         <rect x="0" y={cell + gap} width={cell} height={cell} fill="#00A4EF" />
//         <rect
//           x={cell + gap}
//           y={cell + gap}
//           width={cell}
//           height={cell}
//           fill="#FFB900"
//         />
//       </svg>
//       {/* <span
//         className="ms-logo__word"
//         style={{ fontSize: Math.round(height * 0.98) }}
//         aria-hidden="true"
//       >
//         Microsoft
//       </span> */}
//     </span>
//   );
// }

export function BrandLogo({
  id,
  name,
  height = 20,
  className = "",
}: {
  id: string;
  name?: string;
  height?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  const label = name ?? NAMES[id] ?? id;
  const logo = LOGOS[id];

  if (!error && logo) {
    return (
      <img
        src={logo}
        alt={label}
        className={`brand-logo ${className}`}
        style={
          id === "c5i"
            ? {
                width: 140,
                height: 60,
                objectFit: "contain",
              }
            : id === "ingram-micro"
              ? {
                  width: 140,
                  height: 70,
                  objectFit: "contain",
                }
              : undefined
        }
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span
      className={`brand-word ${className}`}
      style={{ fontSize: Math.round(height * 0.72) }}
    >
      {label}
    </span>
  );
}

export function BrandLogoCmp({
  id,
  name,
  height = 14,
  className = "",
}: {
  id: string;
  name?: string;
  height?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  const label = name ?? NAMES[id] ?? id;
  const logo = LOGOS[id];

  if (!error && logo) {
    return (
      <img
        src={logo}
        alt={label}
        className={`brand-logo ${"retailer-logo-cmp"}`}
        style={
          id === "c5i"
            ? {
                width: 140,
                height: 60,
                objectFit: "contain",
              }
            : id === "ingram-micro"
              ? {
                  width: 140,
                  height: 70,
                  objectFit: "contain",
                }
              : undefined
        }
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span
      className={`brand-word ${className}`}
      style={{ fontSize: Math.round(height * 0.72) }}
    >
      {label}
    </span>
  );
}

// function FileLogo({ id, name, height = 24, className = '' }: { id: string; name?: string; height?: number; className?: string }) {
//   const [src, setSrc] = useState<string | null>(`/logos/${id}.svg`)
//   const label = name ?? NAMES[id] ?? id
//   if (src) {
//     return (
//       <img
//         className={`brand-logo ${className}`}
//         src={src}
//         alt={label}
//         style={{ height }}
//         onError={() => setSrc(src.endsWith('.svg') ? `/logos/${id}.png` : null)}
//       />
//     )
//   }
//   return (
//     <span className={`brand-word brand-word--${id} ${className}`} style={{ fontSize: Math.round(height * 0.72) }} aria-label={label}>
//       {label}
//     </span>
//   )
// }
