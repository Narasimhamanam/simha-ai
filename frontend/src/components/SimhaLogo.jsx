export default function SimhaLogo({
  size = "md",
  showWordmark = true,
  showTagline = true,
  variant = "default",
  className = "",
}) {
  // Dimensions mapping
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
      {/* Simha Cybernetic Crest Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#070A0F] via-[#0F172A] to-[#1E1B4B] p-1.5 shadow-lg shadow-[rgba(0,240,255,0.15)] border border-[rgba(0,240,255,0.25)] transition-all duration-300 hover:border-[rgba(0,240,255,0.6)] hover:shadow-[rgba(0,240,255,0.3)]"
        style={{ width: icon + 10, height: icon + 10 }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-500 hover:scale-105"
        >
          <defs>
            <linearGradient id="simhaLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            <linearGradient id="simhaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <radialGradient id="simhaLogoGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#2DD4BF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#070A0F" stopOpacity="0" />
            </radialGradient>

            <filter id="simhaLogoBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Orbital Ring */}
          <circle
            cx="32"
            cy="32"
            r="26"
            stroke="url(#simhaLogoGrad)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.45"
            className="animate-[spin_24s_linear_infinite]"
          />

          {/* Lion Crown & Top Mane */}
          <polygon points="32,10 38,18 32,22 26,18" fill="url(#simhaGoldGrad)" opacity="0.95" />
          <polygon points="26,18 19,15 23,24 30,22" fill="url(#simhaLogoGrad)" opacity="0.8" />
          <polygon points="38,18 45,15 41,24 34,22" fill="url(#simhaLogoGrad)" opacity="0.8" />

          {/* Lion Cheeks / Shield */}
          <polygon points="23,24 15,29 21,37 29,32" fill="url(#simhaLogoGrad)" opacity="0.75" />
          <polygon points="41,24 49,29 43,37 35,32" fill="url(#simhaLogoGrad)" opacity="0.75" />

          {/* Jaw / Mane V */}
          <polygon points="21,37 32,54 29,38" fill="url(#simhaLogoGrad)" opacity="0.9" />
          <polygon points="43,37 32,54 35,38" fill="url(#simhaLogoGrad)" opacity="0.9" />
          <polygon points="29,38 32,54 35,38" fill="#00F0FF" opacity="0.75" />

          {/* Central Cognitive Core */}
          <circle cx="32" cy="30" r="5" fill="url(#simhaLogoGlow)" filter="url(#simhaLogoBlur)" />
          <circle cx="32" cy="30" r="2.2" fill="#FFFFFF" />

          {/* Neural Eyes */}
          <circle cx="26.5" cy="27" r="1.3" fill="#00F0FF" />
          <circle cx="37.5" cy="27" r="1.3" fill="#00F0FF" />

          {/* Satellite Nodes */}
          <circle cx="32" cy="6" r="1.5" fill="#FCD34D" />
          <circle cx="58" cy="32" r="1.5" fill="#00F0FF" />
          <circle cx="32" cy="58" r="1.5" fill="#6366F1" />
          <circle cx="6" cy="32" r="1.5" fill="#2DD4BF" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-[var(--ink-1)] ${text}`}>
              Simha<span className="text-[var(--astra-cyan)]">.AI</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)]">
              Multi-Agent
            </span>
          </div>
          {showTagline && (
            <span className={`font-mono text-[var(--ink-3)] uppercase tracking-widest ${sub} mt-0.5`}>
              Intelligent Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
