// Rasterize the application's simple geometric icon without external libraries.
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(name, body) {
  const type = Buffer.from(name); const size = Buffer.alloc(4); size.writeUInt32BE(body.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, body])));
  return Buffer.concat([size, type, body, crc]);
}
for (const size of [192, 512]) {
  const pixels = Buffer.alloc(size * (1 + size * 4));
  const rect = (x,y,a,b,c,d) => x >= a && x <= c && y >= b && y <= d;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = px * 512 / size, y = py * 512 / size;
    let color = [36, 79, 71, 255];
    const white = rect(x,y,112,165,130,365) || rect(x,y,382,165,400,365) || rect(x,y,112,165,400,184) || rect(x,y,112,287,400,306) || rect(x,y,112,347,400,366) || rect(x,y,131,365,149,394) || rect(x,y,363,365,381,394) || rect(x,y,155,230,225,247) || rect(x,y,287,230,357,247);
    if (white) color = [248,245,237,255];
    if (rect(x,y,250,185,261,285)) color = [145,183,164,255];
    const offset = py * (1 + size * 4) + 1 + px * 4;
    for (let i = 0; i < 4; i++) pixels[offset + i] = color[i];
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size,0); header.writeUInt32BE(size,4); header[8] = 8; header[9] = 6;
  await writeFile(`public/icon-${size}.png`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
console.log('PWA icons generated: 192 and 512 pixels.');
