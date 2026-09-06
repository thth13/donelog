import type { CSSProperties } from "react";

// A stable palette keeps existing and offline projects consistent everywhere.
const hues = [150, 210, 265, 325, 25, 45, 180, 290];

export function projectStyle(name: string): CSSProperties {
  let hash = 0;
  for (const character of name.trim().toLowerCase()) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  }
  return { "--project-hue": hues[hash % hues.length] } as CSSProperties;
}
