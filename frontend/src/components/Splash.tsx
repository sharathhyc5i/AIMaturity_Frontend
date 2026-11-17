import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BrandLogo } from './BrandLogo'
import { DesktopArt, LaptopArt, SuiteArt, TwoInOneArt } from './DeviceArt'
import './splash.css'

const RETAILERS = [
  { id: "best-buy", name: "Best Buy", market: "United States" },
  { id: "currys", name: "Currys", market: "United Kingdom" },
  { id: "yodobashi", name: "Yodobashi Camera", market: "Japan" },
  { id: "jb-hi-fi", name: "JB Hi-Fi", market: "Australia" },
  { id: "c5i", name: "C5I", market: "" },
  { id: 'ingram-micro', name: 'Ingram Micro', market: 'Canada' },
];
const DEVICES = [
  { name: 'Surface devices', Art: TwoInOneArt },
  { name: 'Copilot+ PCs', Art: LaptopArt },
  { name: 'Windows 11 PCs', Art: DesktopArt },
  { name: 'Microsoft 365', Art: SuiteArt },
]

export const SPLASH_MS = 5000

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onDone, 450)
    return () => window.clearTimeout(t)
  }, [leaving, onDone])

  return (
    <motion.div
      className="splash"
      role="dialog"
      aria-label="Loading Retail AI readiness"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.02 : 1 }}
      transition={{ duration: 0.45, ease: [0.33, 0, 0.1, 1] }}
    >
      <div className="splash__glow" aria-hidden="true" />
      <div className="splash__field" aria-hidden="true">
        {RETAILERS.map((r, i) => (
          <motion.div
            key={r.id}
            className={`float-item retailer-tile slot-r${i}`}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.15 + i * 0.12,
              duration: 0.7,
              ease: [0, 0, 0, 1],
            }}
          >
            <div className="bob" style={{ animationDelay: `${i * -1.3}s` }}>
              <BrandLogo id={r.id} name={r.name} height={18} />
              {/* <span className="retailer-tile__market">{r.market}</span> */}
            </div>
          </motion.div>
        ))}
        {DEVICES.map(({ name, Art }, i) => (
          <motion.figure
            key={name}
            className={`float-item device-card slot-d${i}`}
            initial={{ opacity: 0, y: 28, rotate: i % 2 ? 4 : -4 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2 : -2 }}
            transition={{
              delay: 0.75 + i * 0.12,
              duration: 0.8,
              ease: [0, 0, 0, 1],
            }}
          >
            <div
              className="bob bob--slow"
              style={{ animationDelay: `${i * -1.7}s` }}
            >
              <Art />
              <figcaption>{name}</figcaption>
            </div>
          </motion.figure>
        ))}
      </div>

      <motion.div
        className="splash__center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0, 0, 0, 1] }}
      >
        <div className="splash__brand">
          <img
            src="/microsoft.png"
            alt="Microsoft"
            className="header__ms"
            width={50}
            height={50}
          />
          <h1 className="splash__title">Retailer AI Maturity</h1>
        </div>
        {/* <p className="splash__lede">
          How five retail accounts are set up to sell Surface, Copilot+ PCs, Windows&nbsp;11 and Microsoft&nbsp;365 through AI.
        </p> */}
        <div
          className="splash__progress"
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ animationDuration: `${SPLASH_MS}ms` }} />
        </div>
        {/* <button type="button" className="splash__skip" onClick={() => setLeaving(true)}>
          Skip intro
        </button> */}
      </motion.div>
    </motion.div>
  );
}
