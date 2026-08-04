import sharp from "sharp";
import path from "path";

// Measured directly from the two real reference photos (assets/mockup-templates/)
// by scanning pixel rows to find the cup's actual left/right edges at many
// heights. Piecewise-interpolated between these points at render time —
// NOT a simple top/bottom linear taper, since the real cup shape isn't
// perfectly linear (the wood template's rim area is actually slightly wider
// than the point right below it, which a 2-point model completely missed
// and caused a visible gap on the right side).
export type MockupPoint = { y: number; left: number; right: number };

export type MockupTemplate = {
  name: string;
  file: string;
  points: MockupPoint[]; // sorted by y ascending
};

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    name: "red-neon",
    file: "tumbler-red.png",
    points: [
      { y: 184, left: 276, right: 516 },
      { y: 196, left: 278, right: 514 },
      { y: 208, left: 279, right: 513 },
      { y: 220, left: 279, right: 513 },
      { y: 232, left: 280, right: 512 },
      { y: 244, left: 281, right: 511 },
      { y: 256, left: 282, right: 511 },
      { y: 268, left: 282, right: 510 },
      { y: 280, left: 283, right: 510 },
      { y: 292, left: 284, right: 509 },
      { y: 304, left: 284, right: 508 },
      { y: 316, left: 285, right: 508 },
      { y: 328, left: 286, right: 507 },
      { y: 340, left: 286, right: 507 },
      { y: 352, left: 287, right: 506 },
      { y: 364, left: 288, right: 505 },
      { y: 376, left: 289, right: 505 },
      { y: 388, left: 289, right: 504 },
      { y: 400, left: 290, right: 503 },
      { y: 412, left: 291, right: 503 },
      { y: 424, left: 291, right: 502 },
      { y: 436, left: 292, right: 501 },
      { y: 448, left: 293, right: 501 },
      { y: 460, left: 293, right: 500 },
      { y: 472, left: 294, right: 500 },
      { y: 484, left: 295, right: 499 },
      { y: 496, left: 295, right: 498 },
      { y: 508, left: 296, right: 497 },
      { y: 520, left: 297, right: 497 },
      { y: 532, left: 297, right: 496 },
      { y: 544, left: 298, right: 496 },
      { y: 556, left: 298, right: 495 },
      { y: 568, left: 299, right: 494 },
      { y: 580, left: 300, right: 494 },
      { y: 592, left: 300, right: 493 },
      { y: 604, left: 301, right: 492 },
      { y: 616, left: 301, right: 492 },
      { y: 628, left: 302, right: 491 },
      { y: 640, left: 303, right: 491 },
      { y: 652, left: 304, right: 488 },
    ],
  },
  {
    name: "wood-counter",
    file: "tumbler-wood.png",
    points: [
      { y: 207, left: 284, right: 528 },
      { y: 219, left: 284, right: 527 },
      { y: 231, left: 285, right: 527 },
      { y: 243, left: 285, right: 526 },
      { y: 255, left: 285, right: 526 },
      { y: 267, left: 286, right: 526 },
      { y: 279, left: 286, right: 525 },
      { y: 291, left: 287, right: 524 },
      { y: 303, left: 288, right: 523 },
      { y: 315, left: 288, right: 522 },
      { y: 327, left: 289, right: 522 },
      { y: 339, left: 290, right: 521 },
      { y: 351, left: 290, right: 520 },
      { y: 363, left: 291, right: 519 },
      { y: 375, left: 291, right: 519 },
      { y: 387, left: 292, right: 518 },
      { y: 399, left: 293, right: 517 },
      { y: 411, left: 294, right: 516 },
      { y: 423, left: 295, right: 515 },
      { y: 435, left: 296, right: 514 },
      { y: 447, left: 297, right: 513 },
      { y: 459, left: 298, right: 512 },
      { y: 471, left: 299, right: 511 },
      { y: 483, left: 300, right: 510 },
      { y: 495, left: 301, right: 509 },
      { y: 507, left: 302, right: 508 },
      { y: 519, left: 303, right: 507 },
      { y: 531, left: 304, right: 506 },
      { y: 543, left: 305, right: 505 },
      { y: 555, left: 306, right: 504 },
      { y: 567, left: 307, right: 502 },
      { y: 579, left: 309, right: 501 },
      { y: 591, left: 310, right: 500 },
      { y: 603, left: 311, right: 498 },
      { y: 615, left: 312, right: 496 },
      { y: 627, left: 313, right: 497 },
      { y: 639, left: 313, right: 496 },
      { y: 651, left: 314, right: 494 },
    ],
  },
];

function interpolateAt(points: MockupPoint[], y: number): { left: number; right: number } {
  if (y <= points[0].y) return points[0];
  const last = points[points.length - 1];
  if (y >= last.y) return last;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y);
      return { left: a.left + (b.left - a.left) * t, right: a.right + (b.right - a.right) * t };
    }
  }
  return last;
}

const TEMPLATE_DIR = path.join(process.cwd(), "assets", "mockup-templates");

/**
 * Composites a design image onto a real product photo — slices the design
 * into horizontal bands, each placed and widthed to exactly match the cup's
 * real measured left/right edges at that height (piecewise-interpolated
 * across many real sample points, not a crude 2-point taper), then applies
 * a per-pixel shading pass pulled from the real photo's own lighting so the
 * result doesn't look like a flat sticker.
 */
export async function generateMockup(designBuffer: Buffer, template: MockupTemplate, nBands = 40): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, template.file);
  const points = template.points;
  const topY = points[0].y;
  const bottomY = points[points.length - 1].y;

  const templateMeta = await sharp(templatePath).metadata();
  const tw = templateMeta.width!;
  const th = templateMeta.height!;

  const designMeta = await sharp(designBuffer).metadata();
  const dw = designMeta.width!;
  const dh = designMeta.height!;

  const bandHDst = (bottomY - topY) / nBands;
  const bandHSrc = dh / nBands;

  const compositeOps: sharp.OverlayOptions[] = [];
  for (let i = 0; i < nBands; i++) {
    const yDst = Math.round(topY + i * bandHDst);
    const { left, right } = interpolateAt(points, yDst);
    const bandWidth = Math.max(1, Math.round(right - left));

    const ySrc0 = Math.floor(i * bandHSrc);
    const ySrc1 = Math.min(dh, Math.floor((i + 1) * bandHSrc) + 1);
    const stripHeightSrc = ySrc1 - ySrc0;
    if (stripHeightSrc <= 0) continue;

    const stripBuffer = await sharp(designBuffer)
      .extract({ left: 0, top: ySrc0, width: dw, height: stripHeightSrc })
      .resize(bandWidth, Math.round(bandHDst) + 1)
      .toBuffer();

    compositeOps.push({ input: stripBuffer, left: Math.round(left), top: yDst });
  }

  const warpedBuffer = await sharp({
    create: { width: tw, height: th, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(compositeOps)
    .png()
    .toBuffer();

  // Shading pass: pull real lighting from the template's own cup region.
  const cupRegionLeft = Math.min(...points.map((p) => p.left));
  const cupRegionRight = Math.max(...points.map((p) => p.right));
  const cupRegionWidth = cupRegionRight - cupRegionLeft;

  const shadingRaw = await sharp(templatePath)
    .extract({ left: cupRegionLeft, top: topY, width: cupRegionWidth, height: bottomY - topY })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const shadingData = shadingRaw.data;
  let sum = 0;
  for (let i = 0; i < shadingData.length; i++) sum += shadingData[i];
  const meanVal = sum / shadingData.length;

  const { data: warpedData, info: warpedInfo } = await sharp(warpedBuffer).raw().toBuffer({ resolveWithObject: true });
  const channels = warpedInfo.channels;

  for (let y = topY; y < bottomY; y++) {
    for (let x = cupRegionLeft; x < cupRegionLeft + cupRegionWidth; x++) {
      if (x < 0 || x >= tw) continue;
      const shadeIdx = (y - topY) * cupRegionWidth + (x - cupRegionLeft);
      const rawVal = shadingData[shadeIdx];
      if (rawVal === undefined) continue;
      let factor = rawVal / meanVal;
      factor = Math.min(1.6, Math.max(0.5, factor));

      const pxIdx = (y * tw + x) * channels;
      if (warpedData[pxIdx + 3] === 0) continue;
      warpedData[pxIdx] = Math.min(255, Math.round(warpedData[pxIdx] * factor));
      warpedData[pxIdx + 1] = Math.min(255, Math.round(warpedData[pxIdx + 1] * factor));
      warpedData[pxIdx + 2] = Math.min(255, Math.round(warpedData[pxIdx + 2] * factor));
    }
  }

  const shadedWarpedBuffer = await sharp(warpedData, { raw: { width: tw, height: th, channels } }).png().toBuffer();

  return sharp(templatePath)
    .ensureAlpha()
    .composite([{ input: shadedWarpedBuffer, left: 0, top: 0 }])
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92 })
    .toBuffer();
}
