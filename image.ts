// image.ts: a small raster canvas, a 5x7 bitmap font and a PNG encoder, Node standard library only.
// main.ts lays out the news page with these; nothing here reads the network or the clock.

import { deflateSync } from 'node:zlib';

export type RGB = [number, number, number];

// Seven rows of five pixels a glyph, as seven hex bytes; bit 4 is the leftmost pixel.
const GLYPHS: Record<string, string> = {
  A: '0E11111F111111', B: '1E11111E11111E', C: '0E11101010110E', D: '1E11111111111E',
  E: '1F10101E10101F', F: '1F10101E101010', G: '0E11101711110F', H: '1111111F111111',
  I: '0E04040404040E', J: '0702020202120C', K: '11121418141211', L: '1010101010101F',
  M: '111B1515111111', N: '11111915131111', O: '0E11111111110E', P: '1E11111E101010',
  Q: '0E11111115120D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
  U: '1111111111110E', V: '11111111110A04', W: '1111111515150A', X: '11110A040A1111',
  Y: '11110A04040404', Z: '1F01020408101F',
  '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
  '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
  '8': '0E11110E11110E', '9': '0E11110F01020C',
  ' ': '00000000000000', '.': '00000000000C0C', ',': '000000000C0408', ':': '000C0C000C0C00',
  '-': '0000001F000000', "'": '04040800000000', '/': '01010204081010', '%': '18190204081303',
  '(': '02040808080402', ')': '08040202020408', '!': '04040404040004', '?': '0E110102040004',
  '&': '0C12140815120D', '$': '040F140E051E04', '+': '0004041F040400',
};

export class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.rect(0, 0, w, h, bg);
  }

  dot(x: number, y: number, c: RGB): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = Math.max(0, Math.round(y)); yy < y1; yy++)
      for (let xx = Math.max(0, Math.round(x)); xx < x1; xx++) this.dot(xx, yy, c);
  }

  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) this.dot(cx + x, cy + y, c);
  }

  /** An elliptical outline t pixels thick. */
  ring(cx: number, cy: number, rx: number, ry: number, t: number, c: RGB): void {
    const ox = rx + t / 2, oy = ry + t / 2, ix = Math.max(1, rx - t / 2), iy = Math.max(1, ry - t / 2);
    for (let y = -Math.ceil(oy); y <= Math.ceil(oy); y++)
      for (let x = -Math.ceil(ox); x <= Math.ceil(ox); x++)
        if ((x * x) / (ox * ox) + (y * y) / (oy * oy) <= 1 && (x * x) / (ix * ix) + (y * y) / (iy * iy) >= 1) this.dot(cx + x, cy + y, c);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.disc(x + r, y + r, r, c);
    this.disc(x + w - r - 1, y + r, r, c);
    this.disc(x + r, y + h - r - 1, r, c);
    this.disc(x + w - r - 1, y + h - r - 1, r, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.disc(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, Math.floor(t / 2), c);
  }

  polygon(pts: [number, number][], c: RGB): void {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[(i + 1) % pts.length]!;
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k]!); x <= Math.floor(xs[k + 1]!); x++) this.dot(x, y, c);
    }
  }

  /** Width in pixels of text at scale s: six columns a character, the last one a gap. */
  static textWidth(text: string, s: number): number {
    return text.length * 6 * s - s;
  }

  text(x: number, y: number, text: string, s: number, c: RGB): void {
    let cx = x;
    for (const ch of text.toUpperCase()) {
      const g = GLYPHS[ch] ?? GLYPHS['?']!;
      for (let row = 0; row < 7; row++) {
        const bits = parseInt(g.slice(row * 2, row * 2 + 2), 16);
        for (let col = 0; col < 5; col++) if (bits & (16 >> col)) this.rect(cx + col * s, y + row * s, s, s, c);
      }
      cx += 6 * s;
    }
  }

  png(): Buffer {
    const stride = this.w * 3 + 1;
    const raw = Buffer.alloc(stride * this.h);
    for (let y = 0; y < this.h; y++) raw.set(this.px.subarray(y * this.w * 3, (y + 1) * this.w * 3), y * stride + 1);
    const head = Buffer.alloc(13);
    head.writeUInt32BE(this.w, 0);
    head.writeUInt32BE(this.h, 4);
    head.set([8, 2, 0, 0, 0], 8);
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', head),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Greedy word wrap to at most `cols` characters a line. */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/)) {
    if (cur === '') cur = word;
    else if (cur.length + 1 + word.length <= cols) cur += ' ' + word;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur !== '') out.push(cur);
  return out;
}
