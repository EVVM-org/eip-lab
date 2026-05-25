/**
 * Scanlines + CRT vignette are applied via classes on <body> in
 * layout.tsx (`scanlines` and `vignette` utility classes from globals.css).
 *
 * This component is reserved as the place to add optional overlays
 * (e.g., a "noise" texture, a "screen flicker" effect) if we want them
 * later. For now it's a no-op so we have a single import point.
 */
export default function Scanlines() {
  return null;
}
