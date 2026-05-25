import sharp from "sharp";
import fs from "node:fs";

const svgPath = "/Users/apple/Projects/champions-tracker/src/app/icon.svg";
const svgBuf = fs.readFileSync(svgPath);

const targets = [
  { out: "/Users/apple/Projects/champions-tracker/public/icon-192.png", size: 192 },
  { out: "/Users/apple/Projects/champions-tracker/public/icon-512.png", size: 512 },
  { out: "/Users/apple/Projects/champions-tracker/src/app/apple-icon.png", size: 180 },
];

for (const t of targets) {
  await sharp(svgBuf, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(t.out);
  const stat = fs.statSync(t.out);
  console.log(`✓ ${t.out.split("/").pop()} (${t.size}x${t.size}, ${stat.size} bytes)`);
}
