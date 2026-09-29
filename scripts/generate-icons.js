import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.45);

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: none
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Paytm navy & vibrant blue gradient background
      const t = (x + y) / (width + height);
      let r = Math.round(0 * (1 - t) + 0 * t);
      let g = Math.round(41 * (1 - t) + 186 * t);
      let b = Math.round(112 * (1 - t) + 242 * t);
      let a = 255;

      // Draw rounded card inside center
      const inCardX = x >= width * 0.22 && x <= width * 0.78;
      const inCardY = y >= height * 0.28 && y <= height * 0.72;
      if (inCardX && inCardY) {
        // white card
        r = 255; g = 255; b = 255;
        
        // Rupee mark representation (dark navy center)
        const inStroke1 = (y >= height * 0.38 && y <= height * 0.42) && (x >= width * 0.38 && x <= width * 0.62);
        const inStroke2 = (y >= height * 0.46 && y <= height * 0.50) && (x >= width * 0.38 && x <= width * 0.58);
        const inStem = (x >= width * 0.38 && x <= width * 0.43) && (y >= height * 0.38 && y <= height * 0.64);
        const inLoop = (x >= width * 0.43 && x <= width * 0.58) && (y >= height * 0.38 && y <= height * 0.54) && (dist < width * 0.16);
        const inDiagonal = (y >= height * 0.50 && y <= height * 0.64) && Math.abs((y - height * 0.50) - (x - width * 0.46)) < 12;

        if (inStroke1 || inStroke2 || inStem || (inLoop && !(x < width * 0.52 && y > height * 0.42 && y < height * 0.50)) || inDiagonal) {
          r = 0; g = 41; b = 112; // #002970 navy
        }
      }

      // If not maskable, round outer corners
      if (!isMaskable) {
        const cornerR = width * 0.22;
        const cornerDist = Math.max(
          Math.abs(x - cx) - (cx - cornerR),
          0
        );
        const cornerDistY = Math.max(
          Math.abs(y - cy) - (cy - cornerR),
          0
        );
        if (cornerDist > 0 && cornerDistY > 0) {
          if (Math.hypot(cornerDist, cornerDistY) > cornerR) {
            a = 0;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const idat = zlib.deflateSync(rawData);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', iend),
  ]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('Successfully generated all PWA icons: 192x192, 512x512, maskable 512x512, apple-touch-icon, and favicon.ico');
