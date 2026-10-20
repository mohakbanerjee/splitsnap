import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1180" viewBox="0 0 720 1180">
  <rect width="720" height="1180" fill="#f7f3ee"/>
  <rect x="48" y="36" width="624" height="1108" rx="8" fill="#fffdf8" stroke="#e7e0d6"/>
  <text x="360" y="110" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" fill="#1c1917">BELLA CUCINA</text>
  <text x="360" y="148" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#44403c">Trattoria &amp; Wine Bar</text>
  <text x="360" y="180" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="16" fill="#57534e">184 King Street, San Francisco</text>
  <text x="360" y="206" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="16" fill="#57534e">Server Maya   Table 12</text>
  <text x="360" y="232" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="16" fill="#57534e">Oct 18, 2026   7:42 PM</text>
  <text x="88" y="280" font-family="Consolas, 'Courier New', monospace" font-size="18" fill="#a8a29e">----------------------------------------</text>
  <text x="88" y="330" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Burrata &amp; Heirloom Tomato</text>
  <text x="632" y="330" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">14.00</text>
  <text x="88" y="390" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Caesar Salad</text>
  <text x="632" y="390" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">13.50</text>
  <text x="88" y="450" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Margherita Pizza</text>
  <text x="632" y="450" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">18.00</text>
  <text x="88" y="510" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Rigatoni Bolognese</text>
  <text x="632" y="510" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">22.00</text>
  <text x="88" y="570" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Grilled Salmon</text>
  <text x="632" y="570" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">29.00</text>
  <text x="88" y="630" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Truffle Fries</text>
  <text x="632" y="630" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">9.50</text>
  <text x="88" y="690" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Tiramisu</text>
  <text x="632" y="690" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">11.00</text>
  <text x="88" y="750" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Sparkling Water</text>
  <text x="632" y="750" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">8.00</text>
  <text x="88" y="782" font-family="Consolas, 'Courier New', monospace" font-size="16" fill="#57534e">2 x 4.00 each</text>
  <text x="88" y="830" font-family="Consolas, 'Courier New', monospace" font-size="18" fill="#a8a29e">----------------------------------------</text>
  <text x="88" y="880" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Subtotal</text>
  <text x="632" y="880" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">125.00</text>
  <text x="88" y="922" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Tax 8.5%</text>
  <text x="632" y="922" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">10.63</text>
  <text x="88" y="964" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">Tip 18%</text>
  <text x="632" y="964" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="20" fill="#1c1917">22.50</text>
  <text x="88" y="1006" font-family="Consolas, 'Courier New', monospace" font-size="18" fill="#a8a29e">----------------------------------------</text>
  <text x="88" y="1060" font-family="Consolas, 'Courier New', monospace" font-size="28" font-weight="700" fill="#1c1917">TOTAL USD</text>
  <text x="632" y="1060" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="28" font-weight="700" fill="#1c1917">158.13</text>
  <text x="360" y="1116" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#57534e">Thank you for dining with us</text>
</svg>`;

const output = path.join(process.cwd(), "public", "sample-receipt.png");
await mkdir(path.dirname(output), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(output);
console.log(`Wrote ${output}`);
