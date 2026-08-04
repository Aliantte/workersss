import sharp from "sharp";
import path from "path";

// Measured directly from the two real reference photos (assets/mockup-templates/)
// by scanning pixel rows to find the cup's actual left/right edges at each
// height. Hardcoded once here since the template photos are fixed files —
// no need to recompute this at request time.
export type MockupTemplate = {
  name: string;
  file: string;
  topY: number;
  bottomY: number;
  centerX: number;
  widthTop: number;
  widthBottom: number;
};

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    name: "red-neon",
    file: "tumbler-red.png",
    topY: 184,
    bottomY: 655,
    centerX: 396,
    widthTop: 240,
    widthBottom: 187,
  },
  {
    name: "wood-counter",
    file: "tumbler-wood.png",
    topY: 195,
    bottomY: 661,
    centerX: 403,
    widthTop: 235,
    widthBottom: 175,
  },
];

const TEMPLATE_DIR = path.join(process.cwd(), "assets", "mockup-templates");

/**
 * Composites a design image onto a real product photo — slices the design
 * into horizontal bands matched to the cup's measured taper at each height
 * (approximates the cylindrical wrap without full 3D projection), then
 * applies a per-pixel shading pass pulled from the real photo's own
 * highlights/shadows so the result doesn't look like a flat sticker.
 * Visually verified against both templates before this shipped.
 */
export async function generateMockup(designBuffer: Buffer, template: MockupTemplate, nBands = 30): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, template.file);
  const { topY, bottomY, centerX, widthTop, widthBottom } = template;

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
    const frac = i / (nBands - 1);
    const bandWidth = Math.max(1, Math.round(widthTop + (widthBottom - widthTop) * frac));
    const yDst = Math.round(topY + i * bandHDst);
    const ySrc0 = Math.floor(i * bandHSrc);
    const ySrc1 = Math.min(dh, Math.floor((i + 1) * bandHSrc) + 1);
    const stripHeightSrc = ySrc1 - ySrc0;
    if (stripHeightSrc <= 0) continue;

    const stripBuffer = await sharp(designBuffer)
      .extract({ left: 0, top: ySrc0, width: dw, height: stripHeightSrc })
      .resize(bandWidth, Math.round(bandHDst) + 1)
      .toBuffer();

    const xDst = Math.round(centerX - bandWidth / 2);
    compositeOps.push({ input: stripBuffer, left: xDst, top: yDst });
  }

  const warpedBuffer = await sharp({
    create: { width: tw, height: th, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(compositeOps)
    .png()
    .toBuffer();

  // Shading pass: pull real lighting from the template's own cup region.
  const cupRegionLeft = Math.round(centerX - widthTop);
  const cupRegionWidth = widthTop * 2;

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
