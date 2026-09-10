import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/*
  Generează icoanele pentru ecranul telefonului.

  Desenul: suprafața emailată, cu stropi, și silueta unei case desenate dintr-o
  singură linie — aceeași linie ca icoana din navigare, ca să se recunoască.
  Rulează cu `npm run icoane` doar când se schimbă desenul.
*/

const stropi = Array.from({ length: 34 }, (_, i) => {
  // Poziții fixe, ca icoana să iasă identic la fiecare rulare.
  const x = (i * 137) % 512;
  const y = (i * 241) % 512;
  const r = 1.6 + ((i * 7) % 5) * 0.5;
  const alb = i % 3 !== 0;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${alb ? "#ffffff" : "#000000"}" opacity="${
    alb ? 0.1 : 0.13
  }"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f5138"/>
  ${stropi}
  <rect width="512" height="512" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="10"/>
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <path d="M128 250 256 140l128 110"/>
    <path d="M164 232v140h184V232"/>
    <path d="M224 372v-74h64v74"/>
  </g>
</svg>`;

const public_ = join(process.cwd(), "public");

for (const marime of [192, 512]) {
  const png = await sharp(Buffer.from(svg)).resize(marime, marime).png().toBuffer();
  await writeFile(join(public_, `icoana-${marime}.png`), png);
  console.log(`public/icoana-${marime}.png`);
}

// Ecranul de pornire și favicon-ul din browser.
await writeFile(join(public_, "icoana.svg"), svg);
console.log("public/icoana.svg");
