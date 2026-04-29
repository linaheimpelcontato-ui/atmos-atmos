export default function MapSvgDefs() {
  return (
    <defs>
      {/* Background gradient — deep cerrado green */}
      <radialGradient id="bgGrad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#1e3f0e" />
        <stop offset="40%" stopColor="#162e09" />
        <stop offset="80%" stopColor="#0f2206" />
        <stop offset="100%" stopColor="#091504" />
      </radialGradient>

      {/* Vegetation texture — noise pattern */}
      <filter id="vegetationNoise" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="3" result="noise" />
        <feColorMatrix
          type="matrix"
          in="noise"
          values="0 0 0 0 0.12
                  0 0 0 0 0.22
                  0 0 0 0 0.06
                  0 0 0 0.15 0"
          result="greenNoise"
        />
      </filter>

      {/* Coarse vegetation texture */}
      <filter id="coarseVeg" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="3" seed="7" result="noise" />
        <feColorMatrix
          type="matrix"
          in="noise"
          values="0 0 0 0 0.08
                  0 0 0 0 0.18
                  0 0 0 0 0.04
                  0 0 0 0.1 0"
        />
      </filter>

      {/* Fine detail texture */}
      <filter id="fineDetail" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="turbulence" baseFrequency="1.5" numOctaves="2" seed="11" result="fine" />
        <feColorMatrix
          type="matrix"
          in="fine"
          values="0 0 0 0 0.06
                  0 0 0 0 0.12
                  0 0 0 0 0.03
                  0 0 0 0.06 0"
        />
      </filter>

      {/* River glow */}
      <filter id="riverGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Point glow */}
      <filter id="pointGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Fog blur */}
      <filter id="fogBlur">
        <feGaussianBlur stdDeviation="20" />
      </filter>

      {/* Town glow */}
      <filter id="townGlow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Terrain gradient for park area */}
      <radialGradient id="parkGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3a6e1a" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#3a6e1a" stopOpacity="0" />
      </radialGradient>

      {/* Road pattern */}
      <pattern id="roadDash" patternUnits="userSpaceOnUse" width="12" height="4">
        <rect width="8" height="4" fill="#C49A3C" opacity="0.6" />
      </pattern>
    </defs>
  );
}
