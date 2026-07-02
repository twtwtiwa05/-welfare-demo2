// 공모전용 QR 생성 — 배포 URL을 QR PNG로 굽는다.
// 실행: npm run gen:qr            (기본 URL)
//       npm run gen:qr -- https://실제-배포-주소.vercel.app
// 산출: public/qr.png (install.html·발표자료·제안서에 삽입)

import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "qr.png");

const url = process.argv[2] ?? "https://welfare-demo2.vercel.app";

const buf = await QRCode.toBuffer(url, {
  type: "png",
  width: 640,
  margin: 2,
  errorCorrectionLevel: "M", // 인쇄물 손상 대비 중간 보정
  color: { dark: "#03163A", light: "#FFFFFF" }, // KRDS brand-900 톤
});
writeFileSync(OUT, buf);
console.log(`  ✓ public/qr.png ← ${url}`);
console.log("  (배포 주소가 다르면: npm run gen:qr -- https://주소)");
