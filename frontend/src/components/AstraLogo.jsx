export default function AstraLogo({ size = "md", showWordmark = true, variant = "default", className = "" }) {
  // Dimensions map
  const sizeMap = {
    xs: { icon: 18, text: "text-xs", sub: "text-[9px]" },
    sm: { icon: 24, text: "text-sm", sub: "text-[10px]" },
    md: { icon: 32, text: "text-base", sub: "text-[11px]" },
    lg: { icon: 40, text: "text-lg", sub: "text-xs" },
    xl: { icon: 52, text: "text-2xl", sub: "text-sm" },
  };

  const { icon, text, sub } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Quantum Star Astra Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0B0F17] via-[#111827] to-[#1E1B4B] p-1.5 shadow-lg shadow-[rgba(0,240,255,0.15)] border border-[rgba(0,240,255,0.25)] transition-all duration-300 hover:border-[rgba(0,240,255,0.6)] hover:shadow-[rgba(0,240,255,0.3)]"
        style={{ width: icon + 10, height: icon + 10 }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-500 hover:scale-105"
        >
          <defs>
            {/* Primary Electric Cyan to Royal Indigo Gradient */}
            <linearGradient id="astraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            {/* Neural Core Radial Glow */}
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0B0F17" stopOpacity="0" />
            </radialGradient>

            {/* Subtle Star Ray Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Orbital Ring */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#astraGrad)"
            strokeWidth="1.25"
            strokeDasharray="4 3"
            opacity="0.5"
            className="animate-[spin_20s_linear_infinite]"
          />

          {/* Four-Point Geometric Quantum Nexus (Astra Star) */}
          <path
            d="M24 3L27.5 18.5L43 22L27.5 25.5L24 41L20.5 25.5L5 22L20.5 18.5L24 3Z"
            fill="url(#astraGrad)"
            filter="url(#glow)"
            opacity="0.95"
          />

          {/* Secondary Intersecting Diamond Core */}
          <polygon
            points="24,10 32,24 24,38 16,24"
            fill="#0B0F17"
            stroke="#00F0FF"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Pulsing Cognitive Core */}
          <circle cx="24" cy="24" r="4.5" fill="url(#coreGlow)" />
          <circle cx="24" cy="24" r="2" fill="#FFFFFF" />

          {/* Stellar Node Connectors */}
          <circle cx="24" cy="4" r="1.5" fill="#00F0FF" />
          <circle cx="42" cy="22" r="1.5" fill="#38BDF8" />
          <circle cx="24" cy="40" r="1.5" fill="#6366F1" />
          <circle cx="6" cy="22" r="1.5" fill="#818CF8" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-[var(--ink-1)] ${text}`}>
              Astra<span className="text-[var(--astra-cyan)]">.AI</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)]">
              GPT-6
            </span>
          </div>
          <span className={`font-mono text-[var(--ink-3)] uppercase tracking-widest ${sub} mt-0.5`}>
            Autonomous Workspace
          </span>
        </div>
      )}
    </div>
  );
}
