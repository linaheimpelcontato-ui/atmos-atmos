import type { CSSProperties } from "react";

type AtmosWordmarkProps = {
  className?: string;
  onAnimationComplete?: () => void;
};

const WORDMARK_STYLES = [
  ".atmos-wordmark-glyph{fill:currentColor;fill-opacity:0;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;opacity:0;animation:atmos-wordmark-glyph-draw 720ms cubic-bezier(.77,0,.18,1) forwards}",
  "@keyframes atmos-wordmark-glyph-draw{0%{opacity:0;stroke-dashoffset:1;fill-opacity:0}20%{opacity:1;stroke-dashoffset:1;fill-opacity:0}74%{opacity:1;stroke-dashoffset:0;fill-opacity:0}100%{opacity:1;stroke-dashoffset:0;fill-opacity:1}}",
  "@media (prefers-reduced-motion:reduce){.atmos-wordmark-glyph{animation:none;opacity:1;stroke-dashoffset:0;fill-opacity:1}}",
].join("");

// Traced from the official ATMOS wordmark so the loader does not depend on a
// locally installed font or a raster image while it is being animated.
const GLYPHS = [
  {
    delay: "0ms",
    path:
      "M 38.81,45.19 53.43,45.61 59.7,47.7 64.3,51.46 64.3,52.3 65.55,53.13 66.39,54.81 67.64,58.99 67.64,81.55 54.69,81.55 54.69,77.37 53.85,77.37 51.76,79.04 43.82,81.55 31.7,81.97 26.27,80.72 21.67,77.37 20,73.61 20,68.6 21.25,65.67 26.27,61.49 31.28,59.82 37.97,58.99 48,59.4 54.69,61.07 53.01,57.73 50.09,56.48 46.75,56.06 36.3,56.48 27.1,58.15 22.93,48.54 30.45,46.45 Z M 38.81,66.93 35.04,67.76 33.37,69.01 33.37,71.52 35.46,72.78 43.4,72.78 54.69,69.85 54.69,68.18 51.76,67.34 Z",
  },
  {
    delay: "115ms",
    path:
      "M 88.96,36 90.21,36 90.21,45.61 105.25,45.61 105.25,56.9 90.21,56.9 90.63,69.01 93.13,70.69 105.25,70.27 105.25,81.13 100.24,81.97 88.12,81.97 81.43,79.88 78.51,77.37 76.84,73.61 76.84,56.9 68.9,56.9 68.9,45.61 76.84,45.61 77.25,38.93 Z",
  },
  {
    delay: "230ms",
    path:
      "M 133.25,45.19 141.19,45.19 144.54,46.03 147.46,47.7 149.97,50.21 150.39,51.46 156.66,47.28 164.18,45.19 172.54,45.19 175.88,46.03 178.81,47.7 181.73,50.63 183.82,56.06 183.82,81.55 170.45,81.13 170.45,61.49 169.19,58.57 166.27,56.9 160,56.9 154.57,59.4 152.48,61.49 152.48,81.55 139.1,81.55 139.1,61.91 137.43,58.15 134.93,56.9 128.66,56.9 124.48,58.57 120.72,61.49 120.72,81.55 107.76,81.55 107.34,46.03 120.72,45.61 120.72,51.04 121.55,51.04 124.06,48.54 128.24,46.45 Z",
  },
  {
    delay: "345ms",
    path:
      "M 204.3,45.19 216,45.19 222.27,46.45 227.7,48.96 231.46,52.3 234.39,58.99 234.39,68.18 232.3,73.61 227.7,78.21 223.52,80.3 218.51,81.55 204.72,81.97 195.52,79.88 193.01,78.63 188.84,74.87 186.33,70.27 185.49,66.09 185.49,61.07 187.16,54.81 188,54.39 188.42,52.72 193.85,48.12 199.28,46.03 Z M 208.06,56.06 203.04,56.9 199.7,59.4 198.87,61.91 198.87,65.25 199.7,67.76 201.37,69.43 205.13,70.69 215.16,70.69 219.34,69.01 221.01,66.51 221.43,64 220.18,58.99 218.93,57.73 215.58,56.48 Z",
  },
  {
    delay: "460ms",
    path:
      "M 252.36,45.19 271.58,45.61 277.43,47.28 281.19,50.21 282.87,53.55 282.87,57.31 269.91,57.31 269.91,56.48 268.66,55.22 266.15,54.81 252.36,54.81 250.27,55.22 249.43,56.06 250.27,57.73 252.36,58.15 272.84,59.4 280.78,61.91 283.7,65.25 284.54,70.27 282.87,76.12 279.94,79.04 277.01,79.88 276.18,80.72 268.66,81.97 253.19,81.97 244,80.3 239.82,78.21 237.31,75.7 235.64,72.36 235.64,68.6 248.6,68.6 249.85,71.1 254.45,72.36 267.4,72.36 269.91,71.94 271.16,70.69 270.75,69.01 268.66,68.18 246.93,66.93 241.91,65.67 238.15,63.16 236.48,59.82 236.48,53.55 237.73,51.04 240.24,48.54 243.58,46.87 Z",
  },
  {
    delay: "575ms",
    path: "M 287.04,71.1 300,71.1 300,81.55 286.63,81.55 Z",
  },
] as const;

export default function AtmosWordmark({
  className = "",
  onAnimationComplete,
}: AtmosWordmarkProps) {
  const lastGlyphIndex = GLYPHS.length - 1;

  return (
    <>
      <svg
        viewBox="0 0 320 120"
        role="img"
        aria-label="ATMOS"
        className={className}
        focusable="false"
      >
        <title>ATMOS</title>
        {GLYPHS.map(({ delay, path }, index) => (
          <path
            key={index}
            d={path}
            pathLength={1}
            fillRule="evenodd"
            className="atmos-wordmark-glyph"
            style={{ animationDelay: delay } as CSSProperties}
            onAnimationEnd={
              index === lastGlyphIndex ? onAnimationComplete : undefined
            }
          />
        ))}
      </svg>
      <style>{WORDMARK_STYLES}</style>
    </>
  );
}
