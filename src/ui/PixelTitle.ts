/**
 * “我的世界”风格像素标题：零依赖。
 * 原理：把文字画在低分辨率离屏画布上（石头渐变面 + 黑色描边 + 立体投影），
 * 再用最近邻（imageSmoothingEnabled=false）整数倍放大 → 像素方块感。
 * 不需要任何像素字体资源，中文也能像素化。
 */
export function renderPixelTitle(text: string, canvas: HTMLCanvasElement, scale = 4): void {
  const src = document.createElement('canvas');
  const sctx = src.getContext('2d');
  if (!sctx) return;

  const fontSize = 26;
  const font = `900 ${fontSize}px "PingFang SC","Microsoft YaHei","Heiti SC","Noto Sans SC",sans-serif`;
  const pad = 3;
  const depth = 3; // 立体投影层数

  sctx.font = font;
  const m = sctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.9;
  const descent = m.actualBoundingBoxDescent || fontSize * 0.3;
  const textW = Math.ceil(m.width);
  const textH = Math.ceil(ascent + descent);

  src.width = textW + pad * 2 + depth;
  src.height = textH + pad * 2 + depth;

  // 画布尺寸变化后 font 会重置，需重设
  sctx.font = font;
  sctx.textBaseline = 'alphabetic';
  const x = pad;
  const y = pad + ascent;

  const paint = (dx: number, dy: number, style: string | CanvasGradient) => {
    sctx.fillStyle = style;
    sctx.fillText(text, x + dx, y + dy);
  };

  // 1) 立体投影：深灰，向右下逐层偏移（方块厚度感）
  for (let i = depth; i >= 1; i--) paint(i, i, '#2b2b2b');

  // 2) 黑色描边（8 方向）
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      paint(dx, dy, '#0e0e0e');
    }
  }

  // 3) 石材质感正面：自上而下灰色渐变 + 中间一道亮带
  const face = sctx.createLinearGradient(0, y - ascent, 0, y + descent);
  face.addColorStop(0, '#f0f0f0');
  face.addColorStop(0.45, '#c4c4c4');
  face.addColorStop(0.55, '#a9a9a9');
  face.addColorStop(1, '#7d7d7d');
  paint(0, 0, face);

  // 最近邻整数倍放大 → 像素感
  canvas.width = src.width * scale;
  canvas.height = src.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
}
