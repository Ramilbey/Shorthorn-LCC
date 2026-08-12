import React from "react";

/**
 * Shorthorn Cargo official geometric monogram logo mark.
 * Rebuilt to 100% precision from official brand assets.
 */
export default function Monogram({ className = "", title }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {/* Outer Top-Left Framing Arc */}
      <path
        d="M 30 70 C 18 50 22 22 46 14 H 74"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      {/* Outer Bottom-Right Framing Arc */}
      <path
        d="M 70 30 C 82 50 78 78 54 86 H 26"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      {/* Central Integrated "S" Monogram */}
      <path
        d="M 67 26 H 44 A 10 10 0 0 0 44 46 H 67 L 33 54 H 56 A 10 10 0 0 0 56 74 H 33"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
    </svg>
  );
}
