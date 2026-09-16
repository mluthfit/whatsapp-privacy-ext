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

function appendCubic(points, start, control1, control2, end) {
  for (let step = 1; step <= 18; step += 1) {
    const t = step / 18;
    const inverse = 1 - t;
    points.push([
      inverse ** 3 * start[0]
        + 3 * inverse ** 2 * t * control1[0]
        + 3 * inverse * t ** 2 * control2[0]
        + t ** 3 * end[0],
      inverse ** 3 * start[1]
        + 3 * inverse ** 2 * t * control1[1]
        + 3 * inverse * t ** 2 * control2[1]
        + t ** 3 * end[1],
    ]);
  }
}

function makeShieldPolygon({ start, topRight, rightBottom, leftBottom, topLeft }) {
  const points = [start];
  appendCubic(points, start, ...topRight);
  points.push(rightBottom[0]);
  appendCubic(points, rightBottom[0], ...rightBottom.slice(1));
  appendCubic(points, rightBottom[3], ...leftBottom);
  points.push(topLeft[0]);
  appendCubic(points, topLeft[0], ...topLeft.slice(1));
  return points;
}

function distanceToPolygon(x, y, points) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared));
    minimum = Math.min(minimum, Math.hypot(
      x - (start[0] + projection * dx),
      y - (start[1] + projection * dy),
    ));
  }
  return minimum;
}

const outerShield = makeShieldPolygon({
  start: [196, 12],
  topRight: [[245, 42], [300, 58], [356, 66]],
  rightBottom: [[356, 192], [356, 288], [296, 374], [196, 420]],
  leftBottom: [[96, 374], [36, 288], [36, 192]],
  topLeft: [[36, 66], [92, 58], [147, 42], [196, 12]],
});
const innerShield = makeShieldPolygon({
  start: [196, 28],
  topRight: [[242, 55], [293, 70], [340, 78]],
  rightBottom: [[340, 192], [340, 278], [286, 355], [196, 398]],
  leftBottom: [[106, 355], [52, 278], [52, 192]],
  topLeft: [[52, 78], [99, 70], [150, 55], [196, 28]],
});
const shieldCore = makeShieldPolygon({
  start: [196, 51],
  topRight: [[235, 73], [277, 86], [316, 94]],
  rightBottom: [[316, 190], [316, 261], [273, 326], [196, 366]],
  leftBottom: [[119, 326], [76, 261], [76, 190]],
  topLeft: [[76, 94], [115, 86], [157, 73], [196, 51]],
});

function makePhonePolygon() {
  const points = [[7.643, 7.906]];
  appendCubic(points, points.at(-1), [9.489, 11.535], [12.465, 14.511], [16.094, 16.357]);
  points.push([18.916, 13.536]);
  appendCubic(points, points.at(-1), [19.262, 13.19], [19.775, 13.074], [20.224, 13.228]);
  appendCubic(points, points.at(-1), [21.66, 13.703], [23.212, 13.959], [24.802, 13.959]);
  appendCubic(points, points.at(-1), [25.508, 13.959], [26.085, 14.536], [26.085, 15.242]);
  points.push([26.085, 19.718]);
  appendCubic(points, points.at(-1), [26.085, 20.423], [25.508, 21], [24.802, 21]);
  appendCubic(points, points.at(-1), [12.76, 21], [3, 11.24], [3, -0.802]);
  appendCubic(points, points.at(-1), [3, -1.508], [3.577, -2.085], [4.282, -2.085]);
  points.push([8.771, -2.085]);
  appendCubic(points, points.at(-1), [9.477, -2.085], [10.054, -1.508], [10.054, -0.802]);
  appendCubic(points, points.at(-1), [10.054, 0.801], [10.31, 2.34], [10.785, 3.776]);
  appendCubic(points, points.at(-1), [10.926, 4.225], [10.823, 4.725], [10.464, 5.084]);
  points.push([7.643, 7.906]);

  return points.map(([x, y]) => [
    81.751 + ((x + 0.847) / 30.78) * 218.023,
    90.751 + ((y + 5.932) / 30.78) * 218.023,
  ]);
}

const phone = makePhonePolygon();

const enabledPalette = {
  outer: [18, 61, 49],
  border: [25, 189, 124],
  inner: [7, 95, 69],
  core: [8, 124, 88],
  phone: [237, 247, 241],
};
const disabledPalette = {
  outer: [51, 58, 55],
  border: [154, 163, 159],
  inner: [89, 97, 93],
  core: [115, 124, 119],
  phone: [238, 241, 239],
};

function makeIcon(size, palette) {
  const stride = size * 4 + 1;
  const pixels = Buffer.alloc(stride * size);
  const samplesPerAxis = 4;
  const sampleCount = samplesPerAxis ** 2;
  const logoHeight = 0.94;
  const logoWidth = (392 / 430) * logoHeight;
  const logoLeft = (1 - logoWidth) / 2;
  const logoTop = (1 - logoHeight) / 2;

  for (let y = 0; y < size; y += 1) {
    pixels[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = y * stride + 1 + x * 4;
      const totals = [0, 0, 0];
      let coverage = 0;

      for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
        for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
          const nx = (x + (sampleX + 0.5) / samplesPerAxis) / size;
          const ny = (y + (sampleY + 0.5) / samplesPerAxis) / size;
          const vx = ((nx - logoLeft) / logoWidth) * 392;
          const vy = ((ny - logoTop) / logoHeight) * 430;
          let color;

          if (isInsidePolygon(vx, vy, outerShield)) color = palette.outer;
          if (distanceToPolygon(vx, vy, innerShield) <= 4) color = palette.border;
          if (isInsidePolygon(vx, vy, innerShield)) color = palette.inner;
          if (isInsidePolygon(vx, vy, innerShield) && distanceToPolygon(vx, vy, innerShield) <= 4) {
            color = palette.border;
          }
          if (isInsidePolygon(vx, vy, shieldCore)) color = palette.core;
          if (isInsidePolygon(vx, vy, phone)) color = palette.phone;

          if (color) {
            coverage += 1;
            for (let channel = 0; channel < 3; channel += 1) totals[channel] += color[channel];
          }
        }
      }

      if (coverage > 0) {
        pixels[offset] = Math.round(totals[0] / coverage);
        pixels[offset + 1] = Math.round(totals[1] / coverage);
        pixels[offset + 2] = Math.round(totals[2] / coverage);
        pixels[offset + 3] = Math.round((coverage / sampleCount) * 255);
      }
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
  writeFileSync(resolve(iconDirectory, `icon-${size}.png`), makeIcon(size, enabledPalette));
  writeFileSync(resolve(iconDirectory, `icon-off-${size}.png`), makeIcon(size, disabledPalette));
}
