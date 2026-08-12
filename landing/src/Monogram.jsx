import React from "react";
import logoSrc from "@logo";

/**
 * Shorthorn Cargo official CS monogram mark.
 * Uses the real brand asset (logo.png) — white transparent PNG icon only.
 */
export default function Monogram({ className = "", title }) {
  return (
    <img
      src={logoSrc}
      alt={title ?? ""}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={className}
    />
  );
}
