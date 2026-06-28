// PWA 아이콘 생성기 — 의존성 없음(Node zlib만). 브랜드 방패 아이콘을 PNG로 그린다.
// 실행: node scripts/gen-icons.mjs  → public/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
//
// ⚠️ 외부 라이브러리(sharp/canvas) 없이 픽셀을 직접 그려 PNG로 인코딩(재현 가능·경량).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public");
mkdirSync(PUB, { recursive: true });

// ── CRC32 ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── 그리기 ────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}
const BRAND_600 = [47, 107, 191];
const BRAND_800 = [40, 73, 117];
const WHITE = [255, 255, 255];

// 방패 폴리곤(정규화 0~1) — 육각형 실루엣
const SHIELD = [
  [0.30, 0.30],
  [0.50, 0.235],
  [0.70, 0.30],
  [0.70, 0.52],
  [0.50, 0.775],
  [0.30, 0.52],
];
// 체크마크 경로
const CHECK = [
  [0.415, 0.49],
  [0.475, 0.57],
  [0.60, 0.39],
];

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distToSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - a[0]) * dx + (py - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function distToCheck(px, py) {
  let d = Infinity;
  for (let i = 0; i < CHECK.length - 1; i++) d = Math.min(d, distToSeg(px, py, CHECK[i], CHECK[i + 1]));
  return d;
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const checkW = 0.022; // 체크 두께(정규화)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size;
      // 배경 대각 그라데이션
      let col = mix(BRAND_600, BRAND_800, (nx + ny) / 2);
      const inShield = pointInPoly(nx, ny, SHIELD);
      if (inShield) {
        col = WHITE;
        if (distToCheck(nx, ny) < checkW) col = BRAND_600; // 체크마크
      }
      const i = (y * size + x) * 4;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];
for (const [name, size] of targets) {
  writeFileSync(join(PUB, name), drawIcon(size));
  console.log(`  ✓ public/${name} (${size}×${size})`);
}

// favicon.svg (간단한 벡터)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2f6bbf"/><stop offset="1" stop-color="#284975"/>
  </linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <polygon points="30,30 50,23.5 70,30 70,52 50,77.5 30,52" fill="#fff"/>
  <polyline points="41.5,49 47.5,57 60,39" fill="none" stroke="#2f6bbf" stroke-width="5"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
writeFileSync(join(PUB, "favicon.svg"), favicon, "utf-8");
console.log("  ✓ public/favicon.svg");
console.log("PWA 아이콘 생성 완료 → public/");
