// news-image-20261125 entry (Node 22, standard library only): draws one picture of the world's news on
// Wednesday 25 November 2026 and writes it to /output/entry.png. No network, no clock.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, wrap, type RGB } from './image.ts';

const PAPER: RGB = [246, 243, 236];
const INK: RGB = [25, 25, 32];
const NAVY: RGB = [18, 24, 38];
const GOLD: RGB = [214, 178, 92];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [196, 40, 40];
const FLAME: RGB = [232, 104, 30];
const SEA: RGB = [70, 130, 200];
const GREY: RGB = [120, 120, 126];

interface Story {
  tag: string;
  color: RGB;
  icon: string;
  text: string;
}

const STORIES: Story[] = [
  { tag: 'HORMUZ', color: [176, 40, 40], icon: 'tanker', text: 'Iran says two oil tankers hit naval mines and caught fire in the Strait of Hormuz' },
  { tag: 'TRADE', color: [40, 84, 160], icon: 'crate', text: 'US proposes new tariffs of up to 20% on China, the EU and 12 other trading partners' },
  { tag: 'MARKETS', color: [30, 116, 72], icon: 'down', text: "Asian chip stocks slump on AI fears: South Korea's KOSPI falls about 6%" },
  { tag: 'SPACE', color: [200, 112, 20], icon: 'rocket', text: "Pakistan's first astronaut reaches China's Tiangong station on Shenzhou-24" },
  { tag: 'HUAWEI', color: [120, 60, 140], icon: 'gavel', text: 'US jury convicts Huawei of fraud and stealing trade secrets' },
  { tag: 'PACIFIC', color: [80, 86, 96], icon: 'shield', text: 'Solomon Islands signs Australia treaty: no foreign bases' },
];

const img = new Canvas(1024, 1024, PAPER);

/** One small pictogram for a story, centred on (x, y) inside an 80 by 70 box. */
function icon(kind: string, x: number, y: number, c: RGB): void {
  if (kind === 'tanker') {
    img.polygon([[x - 42, y + 2], [x + 40, y + 2], [x + 30, y + 20], [x - 34, y + 20]], c);
    img.rect(x + 14, y - 12, 18, 14, c);
    img.line(x - 46, y + 26, x + 44, y + 26, 4, SEA);
    img.polygon([[x - 30, y + 2], [x - 22, y - 26], [x - 14, y - 10], [x - 6, y - 34], [x + 2, y - 12], [x + 8, y + 2]], FLAME);
  } else if (kind === 'crate') {
    img.rect(x - 34, y - 22, 52, 44, c);
    img.rect(x - 30, y - 18, 44, 36, PAPER);
    img.line(x - 30, y - 18, x + 14, y + 18, 4, c);
    img.line(x + 14, y - 18, x - 30, y + 18, 4, c);
    img.ring(x + 28, y - 18, 12, 12, 4, RED);
    img.text(x + 23, y - 25, '%', 2, RED);
  } else if (kind === 'down') {
    img.line(x - 40, y + 28, x + 40, y + 28, 3, GREY);
    img.line(x - 36, y - 24, x - 12, y - 8, 6, RED);
    img.line(x - 12, y - 8, x + 2, y - 14, 6, RED);
    img.line(x + 2, y - 14, x + 26, y + 12, 6, RED);
    img.polygon([[x + 38, y + 24], [x + 14, y + 20], [x + 32, y + 2]], RED);
  } else if (kind === 'rocket') {
    img.polygon([[x, y - 36], [x + 12, y - 16], [x + 12, y + 14], [x - 12, y + 14], [x - 12, y - 16]], c);
    img.disc(x, y - 8, 5, PAPER);
    img.polygon([[x - 12, y + 2], [x - 24, y + 18], [x - 12, y + 14]], c);
    img.polygon([[x + 12, y + 2], [x + 24, y + 18], [x + 12, y + 14]], c);
    img.polygon([[x - 8, y + 16], [x + 8, y + 16], [x, y + 34]], FLAME);
    img.disc(x - 34, y - 26, 2, GOLD);
    img.disc(x + 30, y - 30, 2, GOLD);
    img.disc(x + 36, y + 6, 2, GOLD);
  } else if (kind === 'gavel') {
    img.line(x - 18, y - 22, x + 10, y + 6, 12, c);
    img.line(x + 4, y - 2, x + 32, y + 26, 5, c);
    img.rect(x - 38, y + 22, 40, 8, GREY);
  } else if (kind === 'shield') {
    img.polygon([[x - 26, y - 30], [x + 26, y - 30], [x + 26, y], [x, y + 32], [x - 26, y]], c);
    img.polygon([[x - 18, y - 22], [x + 18, y - 22], [x + 18, y - 2], [x, y + 20], [x - 18, y - 2]], PAPER);
    img.line(x - 10, y - 4, x - 2, y + 6, 4, c);
    img.line(x - 2, y + 6, x + 12, y - 12, 4, c);
  }
}

// Masthead: the date first, as a reader would look for it.
img.rect(0, 0, 1024, 132, NAVY);
img.text(36, 22, 'THE WORLD ON', 3, GOLD);
img.text(36, 62, 'WEDNESDAY 25 NOVEMBER 2026', 6, WHITE);
img.rect(0, 132, 1024, 4, GOLD);

const CW = 480, CH = 264, GAP = 16, X0 = 24, Y0 = 152;
STORIES.forEach((s, i) => {
  const x = X0 + (i % 2) * (CW + GAP);
  const y = Y0 + Math.floor(i / 2) * (CH + GAP);
  img.roundRect(x, y, CW, CH, 14, [214, 208, 196]);
  img.roundRect(x + 2, y + 2, CW - 4, CH - 4, 12, WHITE);
  img.rect(x + 12, y + 18, 8, CH - 36, s.color);
  img.text(x + 34, y + 24, s.tag, 4, s.color);
  icon(s.icon, x + CW - 62, y + 50, s.color);
  // 4x type is 28 px tall: big enough to read when the page is shrunk to a thumbnail.
  wrap(s.text, 17).forEach((line, k) => img.text(x + 34, y + 90 + k * 34, line, 4, INK));
});

img.text(36, 994, 'REPORTED 25 NOV 2026 BY NEWS AGENCIES AND BROADCASTERS. TANKER CLAIM IS FROM IRAN.', 2, GREY);

const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'entry.png'), img.png());
