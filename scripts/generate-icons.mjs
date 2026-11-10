import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer: (width * 4 + 1) * height (each row starts with 0 for filter type None)
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.38 : width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background (Deep navy #020617 to teal #0f766e / emerald #10b981)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(2 + gradRatio * 14);
      let g = Math.round(6 + gradRatio * 179);
      let b = Math.round(23 + gradRatio * 106);
      let a = 255;

      // Draw soundwaves in the center (5 rounded bars)
      const normX = (x - cx) / (width * 0.35); // -1 to 1
      const normY = (y - cy) / (height * 0.35); // -1 to 1

      // Bar heights
      const barHeights = [0.4, 0.75, 1.0, 0.65, 0.35];
      const barCount = barHeights.length;
      const barWidth = 0.12;
      const barSpacing = 0.22;

      let inBar = false;
      for (let i = 0; i < barCount; i++) {
        const barCenter = (i - (barCount - 1) / 2) * barSpacing;
        const h = barHeights[i];
        if (Math.abs(normX - barCenter) < barWidth / 2 && Math.abs(normY) < h / 2) {
          inBar = true;
          break;
        }
      }

      if (inBar) {
        // Bright emerald/cyan icon bar
        r = 52;
        g = 211;
        b = 153; // #34d399
      }

      if (!isMaskable) {
        // Rounded corners
        const cornerRadius = width * 0.22;
        const rx = Math.abs(dx) - (cx - cornerRadius);
        const ry = Math.abs(dy) - (cy - cornerRadius);
        if (rx > 0 && ry > 0 && (rx * rx + ry * ry > cornerRadius * cornerRadius)) {
          a = 0;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Deflate IDAT data
  const compressedData = zlib.deflateSync(rawData);

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 6; // color type RGBA
  ihdr[18] = 0; // compression
  ihdr[19] = 0; // filter
  ihdr[20] = 0; // interlace
  const ihdrCrc = crc32(ihdr.subarray(4, 21));
  ihdr.writeInt32BE(ihdrCrc, 21);

  // IDAT
  const idat = Buffer.alloc(12 + compressedData.length);
  idat.writeUInt32BE(compressedData.length, 0);
  idat.write('IDAT', 4);
  compressedData.copy(idat, 8);
  const idatCrc = crc32(idat.subarray(4, 8 + compressedData.length));
  idat.writeInt32BE(idatCrc, 8 + compressedData.length);

  // IEND
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  const iendCrc = crc32(iend.subarray(4, 8));
  iend.writeInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 table & calculator
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
console.log('Icons generated successfully in public/');
