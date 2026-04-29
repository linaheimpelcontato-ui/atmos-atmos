import React from "react";

interface HelmetIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const HelmetIcon: React.FC<HelmetIconProps> = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Dome / shell – side profile */}
    <path d="M4 14c0-5 3.5-9 8.5-9S20 9 20 14" />
    {/* Brim / lower edge */}
    <path d="M3 14h18" />
    {/* Ventilation slots */}
    <line x1="8" y1="9" x2="11" y2="9" />
    <line x1="9" y1="11" x2="12" y2="11" />
    {/* Chin strap */}
    <path d="M6 14l-1 4" />
    <path d="M18 14l1 4" />
    {/* Buckle */}
    <circle cx="5" cy="18.5" r="1" />
    <circle cx="19" cy="18.5" r="1" />
    <line x1="6" y1="18.5" x2="18" y2="18.5" />
  </svg>
);

export default HelmetIcon;
