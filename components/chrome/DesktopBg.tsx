/**
 * DesktopBg — fixed full-screen background layers.
 *
 * Stacks (z-index -1 throughout):
 *   1. Sunset-gradient base
 *   2. Vaporwave grid (perspective-masked)
 *   3. Vaporwave sun (horizontal-band-masked)
 *
 * All pointer-events:none so the page content stays interactive.
 */
export default function DesktopBg() {
  return (
    <>
      <div className="desktop-bg" aria-hidden />
      <div className="desktop-sun" aria-hidden />
      <div className="desktop-grid" aria-hidden />
    </>
  );
}
