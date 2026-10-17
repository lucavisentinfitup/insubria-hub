// Genera le icone PNG dell'app senza dipendenze: quadrato verde Insubria con una "i" bianca.
import fs from "node:fs";
import zlib from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      // 4x4 supersampling per bordi morbidi
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const p = pixel((x + (sx + .5) / 4) / size, (y + (sy + .5) / 4) / size);
        acc = acc.map((v, i) => v + p[i]);
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      acc.forEach((v, i) => (raw[o + i] = Math.round(v / 16)));
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const roundRect = (x, y, r, inset = 0) => { const a = .5 - inset; const dx = Math.max(Math.abs(x - .5) - (a - r), 0), dy = Math.max(Math.abs(y - .5) - (a - r), 0); return Math.hypot(dx, dy) <= r && Math.abs(x - .5) <= a && Math.abs(y - .5) <= a; };
// la "i": puntino + asta arrotondata, scalabile per l'area sicura delle icone maskable
const letter = (x, y, s = 1) => { const u = (x - .5) / s + .5, v = (y - .5) / s + .5; const dot = Math.hypot(u - .5, v - .3) <= .075; const stem = Math.abs(u - .5) <= .065 && v >= .43 && v <= .75; const cap = Math.hypot(u - .5, v - .75) <= .065; return dot || stem || cap; };
const GREEN_TOP = [8, 122, 103], GREEN_BOTTOM = [0, 78, 67], WHITE = [255, 255, 255, 255], CLEAR = [0, 0, 0, 0];
const grad = y => [...GREEN_TOP.map((c, i) => Math.round(c + (GREEN_BOTTOM[i] - c) * y)), 255];

const icon = (radius, scale, full) => (x, y) => {
  if (!full && !roundRect(x, y, radius)) return CLEAR;
  return letter(x, y, scale) ? WHITE : grad(y);
};
const out = "public/icons/";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + "icon-192.png", png(192, icon(.22, 1)));
fs.writeFileSync(out + "icon-512.png", png(512, icon(.22, 1)));
fs.writeFileSync(out + "maskable-512.png", png(512, icon(0, .72, true)));         // sfondo pieno, simbolo dentro l'area sicura
fs.writeFileSync(out + "apple-touch-icon.png", png(180, icon(0, .9, true)));       // iOS arrotonda da sé gli angoli
fs.writeFileSync(out + "badge-96.png", png(96, (x, y) => (letter(x, y, 1.15) ? WHITE : CLEAR)));   // Android usa solo l'alfa
console.log("icone generate in", out);
