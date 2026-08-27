import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const apps = [
  { name: "admin-dashboard", publicDir: path.join(import.meta.dirname, "..", "admin-dashboard", "public") },
  { name: "student-website", publicDir: path.join(import.meta.dirname, "..", "student-website", "public") },
];

const sizes = [16, 32, 180, 192, 512];

for (const app of apps) {
  const svgPath = path.join(app.publicDir, "teza-tech-lab-logo.svg");
  const svgBuffer = await fs.readFile(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(app.publicDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`[${app.name}] Generated ${outputPath}`);
  }
}

console.log("All PWA icons generated.");
