/**
 * CRTOverlay — scanlines + flicker.
 *
 * Scanlines and vignette come from utility classes on <body>
 * (`scanlines vignette` in globals.css). This component renders the
 * subtle screen flicker layer separately so it can be toggled
 * independently if needed.
 */
export default function CRTOverlay() {
  return (
    <div
      aria-hidden
      className="crt-flicker pointer-events-none fixed inset-0 z-[98] bg-[rgba(255,255,255,0.005)]"
    />
  );
}
