/**
 * Minimal store-only (no compression) ZIP writer. Zero dependencies,
 * runs in the browser. Sufficient for bundling a handful of small text
 * files (.sol + .md) into a downloadable archive.
 *
 * Implements the classic local-file-header + central-directory layout
 * with CRC-32 per entry. Compression method 0 (stored).
 */

export interface ZipEntry {
  path: string;
  content: string;
}

// ── CRC-32 ──────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── helpers ─────────────────────────────────────────────────────────
function u16(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/**
 * Build a ZIP archive from the given entries and return it as a Blob.
 */
export function buildZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const fileParts: number[][] = [];
  const central: number[][] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.path);
    const dataBytes = enc.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header
    const local = [
      ...u32(0x04034b50), // signature
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method: stored
      ...u16(0), // mod time
      ...u16(0), // mod date
      ...u32(crc),
      ...u32(size), // compressed size
      ...u32(size), // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0), // extra len
      ...Array.from(nameBytes),
      ...Array.from(dataBytes),
    ];
    fileParts.push(local);

    // Central directory record
    central.push([
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method
      ...u16(0), // mod time
      ...u16(0), // mod date
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk number
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset), // local header offset
      ...Array.from(nameBytes),
    ]);

    offset += local.length;
  }

  const centralFlat = central.flat();
  const centralStart = offset;
  const centralSize = centralFlat.length;

  const end = [
    ...u32(0x06054b50),
    ...u16(0), // disk
    ...u16(0), // disk with central dir
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0), // comment len
  ];

  const all = [...fileParts.flat(), ...centralFlat, ...end];
  return new Blob([new Uint8Array(all)], { type: "application/zip" });
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
