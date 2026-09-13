import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");

rmSync(output, { force: true, recursive: true });
execFileSync(
  process.execPath,
  [resolve(root, "node_modules/typescript/bin/tsc")],
  { cwd: root, stdio: "inherit" },
);
cpSync(resolve(root, "public"), output, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function isInsidePolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[previous];
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
      inside = !inside;
    }
  }
  return inside;
}

function makeIcon(size) {
  const stride = size * 4 + 1;
  const pixels = Buffer.alloc(stride * size);
  const shield = [
    [0.5, 0.14],
    [0.78, 0.27],
    [0.73, 0.61],
    [0.5, 0.84],
    [0.27, 0.61],
    [0.22, 0.27],
  ];

  for (let y = 0; y < size; y += 1) {
    pixels[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const offset = y * stride + 1 + x * 4;
      const edgeX = Math.max(0.13 - nx, nx - 0.87, 0);
      const edgeY = Math.max(0.13 - ny, ny - 0.87, 0);
      const inTile = Math.hypot(edgeX, edgeY) <= 0.13;
      const inShield = isInsidePolygon(nx, ny, shield);
      const inKeyhole = Math.hypot(nx - 0.5, ny - 0.43) < 0.075
        || (nx > 0.46 && nx < 0.54 && ny >= 0.43 && ny < 0.66);

      let color = [0, 0, 0, 0];
      if (inTile) color = [5, 102, 73, 255];
      if (inShield) color = [237, 247, 240, 255];
      if (inShield && inKeyhole) color = [5, 102, 73, 255];
      pixels.set(color, offset);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const iconDirectory = resolve(output, "icons");
mkdirSync(iconDirectory, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(iconDirectory, `icon-${size}.png`), makeIcon(size));
}
