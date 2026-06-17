// THROWAWAY: generate the tuned multi-size app/favicon.ico (16 / 32 / 48 px).
//
// The committed deliverable is `app/favicon.ico`; this script is how it's
// reproduced. Keeps `app/icon.svg` as the primary scalable/high-DPI icon —
// Next.js App Router serves BOTH from `app/` (favicon.ico is a supported
// metadata-file convention), so the SVG keeps handling dark mode while the
// .ico gives small browser tabs a crisp, tuned raster + a 200 on the
// automatic /favicon.ico probe.
//
// No new deps: sharp (already in node_modules via Next) rasterizes SVG → PNG,
// and a ~40-line pure-Node ICO encoder packs the three PNGs into one container.
//
// Each size is a TUNED drawing, not a naive downscale:
//   48 / 32 — the existing app/icon.svg art (detail headroom, light variant only).
//   16     — a genuinely simplified redraw: the knocked-out spine notch and the
//            thin open-cover wedges turn to mush at tab scale, so it's drawn as a
//            solid, confident heart-book mass (notch dropped, covers fattened/merged).
//
// The .ico is a static raster — it can't do prefers-color-scheme, so it renders
// the LIGHT variant only (cream chip + dark ink). Light-only .ico is standard.
//
// Run: npm run proto:favicon

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const PROOF_DIR = path.join(process.cwd(), "output", "favicon-proof");
const OUTPUT_ICO = path.join(process.cwd(), "app", "favicon.ico");

// Light variant palette (cream chip + dark ink), matching app/icon.svg's
// non-dark-mode block. The .ico is light-only by design (see header).
const CHIP = "#FBF7EE";
const INK = "#221C16";

/**
 * 48 / 32 px source — the existing app/icon.svg drawing (solid covers + heart
 * from the page-tops + a knocked-out spine notch). Rendered at the target px so
 * it's the same art at higher res, not an auto-scaled bitmap.
 */
function detailedSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="${CHIP}"/>
  <g transform="translate(5 5.2) scale(0.478)">
    <path fill="${INK}" d="M23 35 C18 31 11.5 30.5 6 32.4 L6 20.5 C11.5 18.6 18 19.4 23 23.5 Z"/>
    <path fill="${INK}" d="M23 35 C28 31 34.5 30.5 40 32.4 L40 20.5 C34.5 18.6 28 19.4 23 23.5 Z"/>
    <path fill="${INK}" d="M23 14 C23 8 17 6 13 9 C9 12 11 17 23 25 C35 17 37 12 33 9 C29 6 23 8 23 14 Z"/>
    <path fill="${CHIP}" d="M22.3 14 H23.7 V24 H22.3 Z"/>
  </g>
</svg>`;
}

/**
 * 16 px source — a simplified redraw, NOT a downscale of the 32. The spine notch
 * is dropped and the two open covers are fattened into one bold, merged base so
 * the glyph reads as a solid heart-book mass at tab scale. Generous chip padding
 * + rounded corners are kept. Drawn on the same 0 0 32 32 chip so it shares the
 * detailed art's framing.
 */
function simpleSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="${CHIP}"/>
  <g transform="translate(5 5.2) scale(0.478)">
    <!-- One merged, fattened open-cover base (no spine notch): the two wedges
         joined into a single bold mass so it stays solid at 16px. Raised so it
         overlaps the heart's lower point — heart + base read as one mass, not
         two pieces with a light gap between them at tab scale. -->
    <path fill="${INK}" d="M23 37 C16.5 32 9 31.5 4 34 L4 18 C10 15.5 17.5 16.5 23 21 C28.5 16.5 36 15.5 42 18 L42 34 C37 31.5 29.5 32 23 37 Z"/>
    <!-- Solid heart rising from the page-tops, heavier than the 32 and dropped
         to overlap the base so the silhouette stays connected. -->
    <path fill="${INK}" d="M23 14 C23 7 16 5 11.5 8.5 C7 12 9.5 18 23 27 C36.5 18 39 12 34.5 8.5 C30 5 23 7 23 14 Z"/>
  </g>
</svg>`;
}

/** Rasterize a tuned SVG source to a PNG buffer at exactly size×size px. */
async function rasterize(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/**
 * Pack PNG buffers into a single .ico container (PNG-in-ICO, read by every
 * modern browser). Layout: 6-byte ICONDIR header + one 16-byte ICONDIRENTRY per
 * image + the PNG bytes appended after all entries.
 */
function encodeIco(images: { size: number; png: Buffer }[]): Buffer {
  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4); // image count

  const entries: Buffer[] = [];
  let offset = HEADER + ENTRY * images.length; // first PNG starts after all entries

  for (const { size, png } of images) {
    const entry = Buffer.alloc(ENTRY);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 means 256)
    entry.writeUInt8(0, 2); // palette count (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image byte size
    entry.writeUInt32LE(offset, 12); // image byte offset
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main(): Promise<void> {
  const sizes = [16, 32, 48] as const;

  await mkdir(PROOF_DIR, { recursive: true });

  const images: { size: number; png: Buffer }[] = [];
  for (const size of sizes) {
    const svg = size === 16 ? simpleSvg(size) : detailedSvg(size);
    const png = await rasterize(svg, size);
    images.push({ size, png });

    // Emit each intermediate PNG (gitignored output/) so 16px can be eyeballed.
    const proof = path.join(PROOF_DIR, `favicon-${size}.png`);
    await writeFile(proof, png);
    console.log(`  ${size}px  →  ${path.relative(process.cwd(), proof)} (${png.length} bytes)`);
  }

  const ico = encodeIco(images);
  await writeFile(OUTPUT_ICO, ico);
  console.log(
    `\nDone → ${path.relative(process.cwd(), OUTPUT_ICO)} ` +
      `(${ico.length} bytes, ${images.length} images: ${sizes.join("/")}px).`,
  );
}

main().catch((e) => {
  console.error(`favicon-ico failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
