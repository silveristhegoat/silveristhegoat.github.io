const stage = document.getElementById("stage");
const ctx = stage.getContext("2d", { willReadFrequently: true });

const photoInput = document.getElementById("photoInput");
const cameraToggle = document.getElementById("cameraToggle");
const micToggle = document.getElementById("micToggle");
const mirrorToggle = document.getElementById("mirrorToggle");
const asciiToggle = document.getElementById("asciiToggle");
const snapshotBtn = document.getElementById("snapshot");
const saveChaosBtn = document.getElementById("saveChaos");

const sourceVideo = document.createElement("video");
sourceVideo.autoplay = true;
sourceVideo.playsInline = true;
sourceVideo.muted = true;

const sourceCanvas = document.createElement("canvas");
const sourceCtx = sourceCanvas.getContext("2d");
const feedbackCanvas = document.createElement("canvas");
const feedbackCtx = feedbackCanvas.getContext("2d");
const noiseCanvas = document.createElement("canvas");
const noiseCtx = noiseCanvas.getContext("2d", { willReadFrequently: true });
const mirrorCanvas = document.createElement("canvas");
const mirrorCtx = mirrorCanvas.getContext("2d");
const freezeCanvas = document.createElement("canvas");
const freezeCtx = freezeCanvas.getContext("2d");
const asciiCanvas = document.createElement("canvas");
const asciiCtx = asciiCanvas.getContext("2d", { willReadFrequently: true });

const state = {
  stream: null,
  cameraOn: false,
  freezeRegionActive: false,
  freezeRect: null,
  imageEl: null,
  pointerX: 0.5,
  pointerY: 0.5,
  pointerVX: 0,
  pointerVY: 0,
  lastPointerUpdate: performance.now(),
  clickEnergy: 0,
  lastTime: performance.now(),
  isSelecting: false,
  selectionStartX: 0,
  selectionStartY: 0,
  selectionCurrentX: 0,
  selectionCurrentY: 0,
  sortRect: null,
  micEnabled: false,
  micLevel: 0,
  micSmoothed: 0,
  micContext: null,
  micAnalyser: null,
  micData: null,
  micStream: null,
  mirrorSectors: 0,
  asciiMode: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fitCanvasToViewport() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const maxWidth = Math.min(window.innerWidth * 0.94, 1080);
  const maxHeight = Math.min(window.innerHeight * 0.68, 740);

  let w = Math.floor(maxWidth);
  let h = Math.floor(maxWidth * 9 / 16);

  if (h > maxHeight) {
    h = Math.floor(maxHeight);
    w = Math.floor(maxHeight * 16 / 9);
  }

  stage.width = Math.max(320, Math.floor(w * dpr));
  stage.height = Math.max(220, Math.floor(h * dpr));
  stage.style.height = `${Math.floor(stage.height / dpr)}px`;
}

function drawFallbackMessage() {
  ctx.fillStyle = "#0d0a13";
  ctx.fillRect(0, 0, stage.width, stage.height);

  ctx.fillStyle = "#19f0ff";
  ctx.font = `${Math.max(16, stage.width * 0.03)}px Space Mono`;
  ctx.textAlign = "center";
  ctx.fillText("Upload a photo or enable your camera", stage.width / 2, stage.height / 2 - 10);

  ctx.fillStyle = "#ff2da6";
  ctx.font = `${Math.max(12, stage.width * 0.02)}px Space Mono`;
  ctx.fillText("Move the mouse and click to inject chaos", stage.width / 2, stage.height / 2 + 24);
}

function syncSourceCanvasDimensions(width, height) {
  if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
    sourceCanvas.width = width;
    sourceCanvas.height = height;
  }

  if (feedbackCanvas.width !== width || feedbackCanvas.height !== height) {
    feedbackCanvas.width = width;
    feedbackCanvas.height = height;
    feedbackCtx.clearRect(0, 0, width, height);
  }

  if (mirrorCanvas.width !== width || mirrorCanvas.height !== height) {
    mirrorCanvas.width = width;
    mirrorCanvas.height = height;
  }

  if (freezeCanvas.width !== width || freezeCanvas.height !== height) {
    freezeCanvas.width = width;
    freezeCanvas.height = height;
    freezeCtx.clearRect(0, 0, width, height);
    if (state.freezeRegionActive) {
      state.freezeRegionActive = false;
      state.freezeRect = null;
      snapshotBtn.textContent = "Freeze Region";
    }
  }

  const targetNoiseWidth = Math.max(120, Math.floor(width / 3));
  const targetNoiseHeight = Math.max(68, Math.floor(height / 3));
  if (noiseCanvas.width !== targetNoiseWidth || noiseCanvas.height !== targetNoiseHeight) {
    noiseCanvas.width = targetNoiseWidth;
    noiseCanvas.height = targetNoiseHeight;
  }
}

function drawSourceFrame() {
  if (state.cameraOn && sourceVideo.readyState >= 2) {
    syncSourceCanvasDimensions(stage.width, stage.height);
    sourceCtx.drawImage(sourceVideo, 0, 0, sourceCanvas.width, sourceCanvas.height);
  }

  if (!state.cameraOn && state.imageEl) {
    syncSourceCanvasDimensions(stage.width, stage.height);
    sourceCtx.drawImage(state.imageEl, 0, 0, sourceCanvas.width, sourceCanvas.height);
  }

  applyFrozenRegionToSource();
}

function resolveFreezeRect() {
  if (state.sortRect) {
    return {
      x: Math.floor(state.sortRect.x),
      y: Math.floor(state.sortRect.y),
      width: Math.floor(state.sortRect.width),
      height: Math.floor(state.sortRect.height),
    };
  }

  const width = Math.floor(stage.width * 0.32);
  const height = Math.floor(stage.height * 0.32);
  const centerX = Math.floor(state.pointerX * stage.width);
  const centerY = Math.floor(state.pointerY * stage.height);
  const x = clamp(centerX - Math.floor(width * 0.5), 0, stage.width - width);
  const y = clamp(centerY - Math.floor(height * 0.5), 0, stage.height - height);
  return { x, y, width, height };
}

function captureFreezeRegion() {
  if (!state.cameraOn && !state.imageEl) {
    return;
  }

  const rect = resolveFreezeRect();
  const x = clamp(rect.x, 0, stage.width - 1);
  const y = clamp(rect.y, 0, stage.height - 1);
  const width = clamp(rect.width, 2, stage.width - x);
  const height = clamp(rect.height, 2, stage.height - y);

  state.freezeRect = { x, y, width, height };
  freezeCtx.clearRect(0, 0, freezeCanvas.width, freezeCanvas.height);
  freezeCtx.drawImage(sourceCanvas, 0, 0);
  state.freezeRegionActive = true;
  snapshotBtn.textContent = "Unfreeze Region";
}

function clearFreezeRegion() {
  state.freezeRegionActive = false;
  state.freezeRect = null;
  snapshotBtn.textContent = "Freeze Region";
}

function applyFrozenRegionToSource() {
  if (!state.freezeRegionActive || !state.freezeRect) {
    return;
  }

  const rect = state.freezeRect;
  sourceCtx.drawImage(
    freezeCanvas,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
}

function applyCyberpunkMush(dtMs) {
  const src = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const out = ctx.createImageData(sourceCanvas.width, sourceCanvas.height);
  const srcData = src.data;
  const outData = out.data;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const px = state.pointerX * w;
  const py = state.pointerY * h;
  const micDrive = Math.min(1, state.micSmoothed * 2.2);

  const t = performance.now() * 0.001;
  const chaos = 6 + state.clickEnergy * 28 + micDrive * 40;
  const motionShiftX = state.pointerVX * (38 + state.clickEnergy * 24);
  const motionShiftY = state.pointerVY * (24 + state.clickEnergy * 18);
  const shakeX = (Math.random() - 0.5) * micDrive * 16;
  const shakeY = (Math.random() - 0.5) * micDrive * 10;

  for (let y = 0; y < h; y += 1) {
    const dy = y - py;
    for (let x = 0; x < w; x += 1) {
      const dx = x - px;
      const idx = (y * w + x) * 4;

      const radial = Math.hypot(dx, dy) / Math.max(w, h);
      const wave = Math.sin((x * 0.018) + (y * 0.02) + t * (8 + state.clickEnergy * 5));
      const swirl = Math.sin(radial * 40 - t * 9) * chaos;

      const ox = Math.max(0, Math.min(w - 1, Math.floor(x + wave * 9 + swirl + shakeX)));
      const oy = Math.max(0, Math.min(h - 1, Math.floor(y + Math.cos(dx * 0.02 + t * 7) * (4 + chaos * 0.2) + shakeY)));
      const oIdx = (oy * w + ox) * 4;

      // Split channels based on pointer movement direction and speed.
      const baseShift = 2 + state.clickEnergy * 6;
      const rX = clamp(Math.floor(ox + baseShift + motionShiftX), 0, w - 1);
      const rY = clamp(Math.floor(oy + motionShiftY * 0.65), 0, h - 1);
      const gX = clamp(Math.floor(ox - motionShiftX * 0.2), 0, w - 1);
      const gY = clamp(Math.floor(oy - motionShiftY * 0.2), 0, h - 1);
      const bX = clamp(Math.floor(ox - baseShift - motionShiftX), 0, w - 1);
      const bY = clamp(Math.floor(oy - motionShiftY * 0.65), 0, h - 1);

      const rIdx = (rY * w + rX) * 4;
      const gIdx = (gY * w + gX) * 4;
      const bIdx = (bY * w + bX) * 4;

      let r = srcData[rIdx];
      let g = srcData[gIdx + 1];
      let b = srcData[bIdx + 2];

      const glow = Math.max(0, 1 - radial * 1.7) * (18 + state.clickEnergy * 90);
      const scanline = ((y + Math.floor(t * 55)) % 3 === 0) ? 0.84 : 1;
      const hiss = (Math.random() - 0.5) * micDrive * 70;

      r = Math.min(255, Math.max(0, (r + glow * 0.7 + hiss) * scanline));
      g = Math.min(255, Math.max(0, (g + glow * 0.25 + hiss * 0.5)));
      b = Math.min(255, Math.max(0, (b + glow + hiss * 1.2)));

      if (micDrive > 0.25) {
        const posterizeStep = Math.max(8, 40 - micDrive * 28);
        r = Math.round(r / posterizeStep) * posterizeStep;
        g = Math.round(g / posterizeStep) * posterizeStep;
        b = Math.round(b / posterizeStep) * posterizeStep;
      }

      outData[idx] = r;
      outData[idx + 1] = g;
      outData[idx + 2] = b;
      outData[idx + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);

  const stretchX = (state.pointerX - 0.5) * 24 + state.pointerVX * 160;
  const stretchY = (state.pointerY - 0.5) * 16 + state.pointerVY * 120;
  const growX = Math.abs(stretchX);
  const growY = Math.abs(stretchY);

  // Feedback layer: stretch previous frame and blend it into the current frame.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22 + state.clickEnergy * 0.14;
  ctx.drawImage(
    feedbackCanvas,
    -growX * 0.5 + stretchX * 0.25,
    -growY * 0.5 + stretchY * 0.25,
    w + growX,
    h + growY,
  );
  ctx.restore();

  // Overlay hot noise streaks for a mushier look during clicks.
  const streakCount = Math.floor(state.clickEnergy * 22 + micDrive * 36);
  for (let i = 0; i < streakCount; i += 1) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const sw = Math.random() * 64 + 16;

    ctx.fillStyle = `rgba(${200 + Math.floor(Math.random() * 55)}, ${20 + Math.floor(Math.random() * 80)}, ${130 + Math.floor(Math.random() * 120)}, ${0.09 + Math.random() * 0.18})`;
    ctx.fillRect(sx, sy, sw, 1 + Math.random() * 2.2);
  }

  const tearCount = Math.floor(micDrive * 8);
  for (let i = 0; i < tearCount; i += 1) {
    const y = Math.random() * h;
    const tearHeight = 1 + Math.random() * (2 + micDrive * 4);
    const shift = (Math.random() - 0.5) * micDrive * 70;
    ctx.drawImage(stage, 0, y, w, tearHeight, shift, y, w, tearHeight);
  }

  if (state.sortRect) {
    sortPixelsByBrightness(state.sortRect);
  }

  drawCrtStripes(w, h, t, micDrive);
  drawVhsNoise(w, h, t, micDrive);
  applyMirrorDimension(w, h);
  applyAsciiMode(w, h, micDrive);

  feedbackCtx.clearRect(0, 0, w, h);
  feedbackCtx.drawImage(stage, 0, 0, w, h);

  drawSelectionOverlay();

  const decay = dtMs * 0.0017;
  state.clickEnergy = Math.max(0, state.clickEnergy - decay);
  state.pointerVX *= 0.86;
  state.pointerVY *= 0.86;
}

function applyMirrorDimension(width, height) {
  const sectors = state.mirrorSectors;
  if (sectors !== 4 && sectors !== 8) {
    return;
  }

  mirrorCtx.clearRect(0, 0, width, height);
  mirrorCtx.drawImage(stage, 0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.5;
  const radius = Math.hypot(width, height);
  const step = (Math.PI * 2) / sectors;

  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < sectors; i += 1) {
    const start = i * step;
    const end = start + step;
    const mid = start + step * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius);
    ctx.lineTo(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius);
    ctx.closePath();
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(mid);
    if (i % 2 === 1) {
      ctx.scale(-1, 1);
    }
    ctx.rotate(-Math.PI * 0.5);
    ctx.translate(-cx, -cy);
    ctx.drawImage(mirrorCanvas, 0, 0, width, height);
    ctx.restore();
  }
}

function applyAsciiMode(width, height, micDrive) {
  if (!state.asciiMode) {
    return;
  }

  const cellWidth = clamp(Math.floor(width / 130), 6, 12);
  const cellHeight = Math.floor(cellWidth * 1.55);
  const cols = Math.max(1, Math.floor(width / cellWidth));
  const rows = Math.max(1, Math.floor(height / cellHeight));

  if (asciiCanvas.width !== cols || asciiCanvas.height !== rows) {
    asciiCanvas.width = cols;
    asciiCanvas.height = rows;
  }

  asciiCtx.imageSmoothingEnabled = false;
  asciiCtx.drawImage(stage, 0, 0, cols, rows);
  const sampled = asciiCtx.getImageData(0, 0, cols, rows).data;

  const symbols = " .,:;irsXA253hMHGS#9B&@";
  const glitchSymbols = "01[]{}<>=/\\|";

  ctx.save();
  ctx.fillStyle = "rgba(2, 8, 5, 0.9)";
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${cellHeight}px Space Mono`;
  ctx.textBaseline = "top";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const idx = (row * cols + col) * 4;
      const r = sampled[idx];
      const g = sampled[idx + 1];
      const b = sampled[idx + 2];
      const brightness = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

      const symbolIndex = Math.floor(brightness * (symbols.length - 1));
      let glyph = symbols[symbolIndex];

      if (Math.random() < 0.015 + micDrive * 0.05) {
        glyph = glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)];
      }

      const greenBoost = clamp(80 + g * 0.9 + micDrive * 70, 40, 255);
      const redTint = clamp(r * 0.35 + micDrive * 20, 0, 190);
      const blueTint = clamp(b * 0.4 + 10, 0, 190);
      const alpha = clamp(0.2 + brightness * 0.9 + micDrive * 0.2, 0.15, 1);
      ctx.fillStyle = `rgba(${redTint}, ${greenBoost}, ${blueTint}, ${alpha})`;
      ctx.fillText(glyph, col * cellWidth, row * cellHeight);
    }
  }

  ctx.restore();
}

function updateMirrorToggleLabel() {
  if (state.mirrorSectors === 4) {
    mirrorToggle.textContent = "Mirror: 4 Sectors";
    return;
  }
  if (state.mirrorSectors === 8) {
    mirrorToggle.textContent = "Mirror: 8 Sectors";
    return;
  }
  mirrorToggle.textContent = "Mirror: Off";
}

function updateAsciiToggleLabel() {
  asciiToggle.textContent = state.asciiMode ? "ASCII: On" : "ASCII: Off";
}

function applyRandomSaveArtifact(exportCtx, width, height) {
  const artifactType = Math.floor(Math.random() * 5);

  if (artifactType === 0) {
    const bandY = Math.random() * height;
    const bandHeight = Math.max(4, Math.random() * (height * 0.08));
    const shift = (Math.random() - 0.5) * width * 0.2;
    exportCtx.drawImage(
      exportCtx.canvas,
      0,
      bandY,
      width,
      bandHeight,
      shift,
      bandY,
      width,
      bandHeight,
    );
    return;
  }

  if (artifactType === 1) {
    const blockCount = 8 + Math.floor(Math.random() * 18);
    for (let i = 0; i < blockCount; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const w = 8 + Math.random() * (width * 0.12);
      const h = 3 + Math.random() * (height * 0.06);
      exportCtx.fillStyle = `rgba(${120 + Math.floor(Math.random() * 130)}, ${80 + Math.floor(Math.random() * 170)}, ${120 + Math.floor(Math.random() * 130)}, ${0.08 + Math.random() * 0.2})`;
      exportCtx.fillRect(x, y, w, h);
    }
    return;
  }

  if (artifactType === 2) {
    exportCtx.save();
    exportCtx.globalCompositeOperation = "screen";
    const lineCount = 12 + Math.floor(Math.random() * 18);
    for (let i = 0; i < lineCount; i += 1) {
      const y = Math.random() * height;
      exportCtx.fillStyle = `rgba(${160 + Math.floor(Math.random() * 95)}, ${160 + Math.floor(Math.random() * 95)}, ${160 + Math.floor(Math.random() * 95)}, ${0.06 + Math.random() * 0.12})`;
      exportCtx.fillRect(0, y, width, 1 + Math.random() * 2.5);
    }
    exportCtx.restore();
    return;
  }

  if (artifactType === 3) {
    const sliceW = Math.max(20, width * (0.1 + Math.random() * 0.22));
    const x = Math.random() * (width - sliceW);
    const ghostShift = (Math.random() - 0.5) * width * 0.12;
    exportCtx.save();
    exportCtx.globalAlpha = 0.5;
    exportCtx.drawImage(exportCtx.canvas, x, 0, sliceW, height, x + ghostShift, 0, sliceW, height);
    exportCtx.restore();
    return;
  }

  const imageData = exportCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const speckleCount = Math.floor(width * height * 0.004);
  for (let i = 0; i < speckleCount; i += 1) {
    const p = Math.floor(Math.random() * (width * height));
    const idx = p * 4;
    const v = Math.random() < 0.5 ? 0 : 255;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
  }
  exportCtx.putImageData(imageData, 0, 0);
}

function saveChaosFrame() {
  if (!stage.width || !stage.height) {
    return;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = stage.width;
  exportCanvas.height = stage.height;
  const exportCtx = exportCanvas.getContext("2d", { willReadFrequently: true });

  exportCtx.drawImage(stage, 0, 0);
  applyRandomSaveArtifact(exportCtx, exportCanvas.width, exportCanvas.height);

  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `digital-nightmare-chaos-${stamp}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function drawCrtStripes(width, height, timeSec, micDrive) {
  const stripeStep = 3;
  const travel = (timeSec * 90) % stripeStep;
  const stripeAlpha = 0.09 + state.clickEnergy * 0.04 + micDrive * 0.08;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  for (let y = -stripeStep + travel; y < height; y += stripeStep) {
    const flicker = 0.85 + Math.sin((y * 0.045) + timeSec * 13) * 0.15;
    ctx.fillStyle = `rgba(8, 5, 12, ${Math.max(0.02, stripeAlpha * flicker)})`;
    ctx.fillRect(0, y, width, 1);
  }

  // Moving bright roll bar for old CRT vertical sync behavior.
  const rollY = (timeSec * (42 + micDrive * 25)) % (height + 80) - 40;
  const rollHeight = 36 + micDrive * 26;
  const rollGradient = ctx.createLinearGradient(0, rollY, 0, rollY + rollHeight);
  rollGradient.addColorStop(0, "rgba(20, 255, 240, 0)");
  rollGradient.addColorStop(0.5, `rgba(20, 255, 240, ${0.05 + micDrive * 0.09})`);
  rollGradient.addColorStop(1, "rgba(20, 255, 240, 0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = rollGradient;
  ctx.fillRect(0, rollY, width, rollHeight);

  ctx.restore();
}

function drawVhsNoise(width, height, timeSec, micDrive) {
  const noise = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
  const data = noise.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }

  noiseCtx.putImageData(noise, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.045 + state.clickEnergy * 0.03 + micDrive * 0.08;
  ctx.drawImage(noiseCanvas, 0, 0, width, height);

  // Analog tracking noise lines and tearing sparks.
  const lineCount = 2 + Math.floor(Math.random() * 5) + Math.floor(micDrive * 7);
  for (let i = 0; i < lineCount; i += 1) {
    const y = Math.random() * height;
    const thickness = 1 + Math.random() * (1.4 + micDrive * 2.2);
    const shift = (Math.sin(timeSec * 24 + i * 13.4) * 0.5 + 0.5) * 0.25;
    const alpha = 0.05 + Math.random() * 0.12 + micDrive * 0.12;
    ctx.fillStyle = `rgba(${190 + Math.floor(Math.random() * 65)}, ${190 + Math.floor(Math.random() * 65)}, ${190 + Math.floor(Math.random() * 65)}, ${alpha})`;
    ctx.fillRect(shift * width - width * 0.1, y, width * 1.2, thickness);
  }

  ctx.restore();
}

function updateMicLevel() {
  if (!state.micAnalyser || !state.micData) {
    state.micLevel = 0;
    state.micSmoothed *= 0.92;
    return;
  }

  state.micAnalyser.getByteTimeDomainData(state.micData);
  let sum = 0;
  for (let i = 0; i < state.micData.length; i += 1) {
    const centered = (state.micData[i] - 128) / 128;
    sum += centered * centered;
  }

  const rms = Math.sqrt(sum / state.micData.length);
  const boosted = Math.min(1, Math.max(0, (rms - 0.012) * 8));
  state.micLevel = boosted;
  state.micSmoothed = state.micSmoothed * 0.82 + boosted * 0.18;
}

function sortPixelsByBrightness(rect) {
  const x = clamp(Math.floor(rect.x), 0, stage.width - 1);
  const y = clamp(Math.floor(rect.y), 0, stage.height - 1);
  const maxWidth = stage.width - x;
  const maxHeight = stage.height - y;
  const width = clamp(Math.floor(rect.width), 1, maxWidth);
  const height = clamp(Math.floor(rect.height), 1, maxHeight);

  if (width < 2 || height < 2) {
    return;
  }

  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  for (let row = 0; row < height; row += 1) {
    const pixels = [];
    const base = row * width * 4;

    for (let col = 0; col < width; col += 1) {
      const idx = base + col * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const brightness = r * 0.2126 + g * 0.7152 + b * 0.0722;
      pixels.push({ r, g, b, a, brightness });
    }

    pixels.sort((left, right) => left.brightness - right.brightness);

    for (let col = 0; col < width; col += 1) {
      const idx = base + col * 4;
      const p = pixels[col];
      data[idx] = p.r;
      data[idx + 1] = p.g;
      data[idx + 2] = p.b;
      data[idx + 3] = p.a;
    }
  }

  ctx.putImageData(imageData, x, y);
}

function drawSelectionOverlay() {
  const rect = state.isSelecting ? getSelectionRectFromDrag() : state.sortRect;
  if (rect) {
    ctx.save();
    ctx.lineWidth = Math.max(2, Math.floor(stage.width * 0.0022));
    ctx.strokeStyle = "rgba(193, 255, 23, 0.95)";
    ctx.setLineDash([10, 7]);
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
    ctx.fillStyle = "rgba(193, 255, 23, 0.08)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  if (state.freezeRegionActive && state.freezeRect) {
    drawFreezeOverlay();
  }
}

function drawFreezeOverlay() {
  const rect = state.freezeRect;
  if (!rect) {
    return;
  }

  ctx.save();
  ctx.lineWidth = Math.max(2, Math.floor(stage.width * 0.002));
  ctx.strokeStyle = "rgba(255, 45, 166, 0.95)";
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
  ctx.restore();
}

function getSelectionRectFromDrag() {
  const x1 = Math.min(state.selectionStartX, state.selectionCurrentX);
  const y1 = Math.min(state.selectionStartY, state.selectionCurrentY);
  const x2 = Math.max(state.selectionStartX, state.selectionCurrentX);
  const y2 = Math.max(state.selectionStartY, state.selectionCurrentY);
  const width = x2 - x1;
  const height = y2 - y1;

  if (width < 2 || height < 2) {
    return null;
  }

  return {
    x: clamp(x1, 0, stage.width - 1),
    y: clamp(y1, 0, stage.height - 1),
    width: clamp(width, 1, stage.width - x1),
    height: clamp(height, 1, stage.height - y1),
  };
}

function frame(now) {
  const dt = now - state.lastTime;
  state.lastTime = now;

  if (!state.cameraOn && !state.imageEl) {
    drawFallbackMessage();
    requestAnimationFrame(frame);
    return;
  }

  drawSourceFrame();
  updateMicLevel();
  applyCyberpunkMush(dt);
  requestAnimationFrame(frame);
}

async function enableMicReactivity() {
  if (state.micEnabled) {
    disableMicReactivity();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioContext) {
    micToggle.textContent = "Mic unsupported";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const context = new window.AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    state.micStream = stream;
    state.micContext = context;
    state.micAnalyser = analyser;
    state.micData = new Uint8Array(analyser.fftSize);
    state.micEnabled = true;
    micToggle.textContent = "Disable Mic Reactivity";
  } catch {
    micToggle.textContent = "Mic blocked";
    setTimeout(() => {
      micToggle.textContent = state.micEnabled ? "Disable Mic Reactivity" : "Enable Mic Reactivity";
    }, 1700);
  }
}

function disableMicReactivity() {
  if (state.micStream) {
    for (const track of state.micStream.getTracks()) {
      track.stop();
    }
  }

  if (state.micContext) {
    state.micContext.close();
  }

  state.micStream = null;
  state.micContext = null;
  state.micAnalyser = null;
  state.micData = null;
  state.micEnabled = false;
  state.micLevel = 0;
  state.micSmoothed = 0;
  micToggle.textContent = "Enable Mic Reactivity";
}

async function enableCamera() {
  if (state.cameraOn) {
    disableCamera();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    state.stream = stream;
    sourceVideo.srcObject = stream;
    state.cameraOn = true;
    clearFreezeRegion();
    cameraToggle.textContent = "Disable Camera";
  } catch {
    cameraToggle.textContent = "Camera blocked";
    setTimeout(() => {
      cameraToggle.textContent = state.cameraOn ? "Disable Camera" : "Enable Camera";
    }, 1700);
  }
}

function disableCamera() {
  if (!state.stream) {
    return;
  }

  for (const track of state.stream.getTracks()) {
    track.stop();
  }

  state.stream = null;
  state.cameraOn = false;
  clearFreezeRegion();
  sourceVideo.srcObject = null;
  cameraToggle.textContent = "Enable Camera";
}

photoInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  const img = new Image();
  img.onload = () => {
    state.imageEl = img;
    clearFreezeRegion();
  };

  img.src = URL.createObjectURL(file);
});

cameraToggle.addEventListener("click", enableCamera);
micToggle.addEventListener("click", enableMicReactivity);
mirrorToggle.addEventListener("click", () => {
  if (state.mirrorSectors === 0) {
    state.mirrorSectors = 4;
  } else if (state.mirrorSectors === 4) {
    state.mirrorSectors = 8;
  } else {
    state.mirrorSectors = 0;
  }
  updateMirrorToggleLabel();
});
asciiToggle.addEventListener("click", () => {
  state.asciiMode = !state.asciiMode;
  updateAsciiToggleLabel();
});
saveChaosBtn.addEventListener("click", saveChaosFrame);

snapshotBtn.addEventListener("click", () => {
  if (!state.cameraOn && !state.imageEl) {
    return;
  }

  if (state.freezeRegionActive) {
    clearFreezeRegion();
    state.clickEnergy = Math.min(2.1, state.clickEnergy + 0.3);
    return;
  }

  syncSourceCanvasDimensions(stage.width, stage.height);
  drawSourceFrame();
  captureFreezeRegion();
  state.clickEnergy = Math.min(1.8, state.clickEnergy + 0.45);
});

function updatePointer(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const nextX = Math.max(0, Math.min(1, nx));
  const nextY = Math.max(0, Math.min(1, ny));
  const now = performance.now();
  const dt = Math.max(8, now - state.lastPointerUpdate);

  const instantVX = (nextX - state.pointerX) / dt;
  const instantVY = (nextY - state.pointerY) / dt;

  state.pointerVX = state.pointerVX * 0.72 + instantVX * 14;
  state.pointerVY = state.pointerVY * 0.72 + instantVY * 14;
  state.pointerX = nextX;
  state.pointerY = nextY;
  state.lastPointerUpdate = now;
}

function toCanvasCoordinates(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * stage.width;
  const y = ((clientY - rect.top) / rect.height) * stage.height;
  return {
    x: clamp(x, 0, stage.width),
    y: clamp(y, 0, stage.height),
  };
}

function beginSelection(clientX, clientY) {
  const pos = toCanvasCoordinates(clientX, clientY);
  state.isSelecting = true;
  state.selectionStartX = pos.x;
  state.selectionStartY = pos.y;
  state.selectionCurrentX = pos.x;
  state.selectionCurrentY = pos.y;
}

function updateSelection(clientX, clientY) {
  if (!state.isSelecting) {
    return;
  }
  const pos = toCanvasCoordinates(clientX, clientY);
  state.selectionCurrentX = pos.x;
  state.selectionCurrentY = pos.y;
}

function finishSelection() {
  if (!state.isSelecting) {
    return;
  }
  state.isSelecting = false;
  state.sortRect = getSelectionRectFromDrag();
}

stage.addEventListener("mousemove", (event) => {
  updatePointer(event.clientX, event.clientY);
  updateSelection(event.clientX, event.clientY);
});

stage.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }
  beginSelection(event.clientX, event.clientY);
});

stage.addEventListener("mouseup", () => {
  finishSelection();
});

stage.addEventListener("mouseleave", () => {
  finishSelection();
});

stage.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  updatePointer(touch.clientX, touch.clientY);
  updateSelection(touch.clientX, touch.clientY);
}, { passive: true });

stage.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  beginSelection(touch.clientX, touch.clientY);
}, { passive: true });

stage.addEventListener("touchend", () => {
  finishSelection();
}, { passive: true });

stage.addEventListener("click", (event) => {
  if (state.isSelecting) {
    return;
  }
  updatePointer(event.clientX, event.clientY);
  state.clickEnergy = Math.min(2.1, state.clickEnergy + 0.7);
});

stage.addEventListener("dblclick", () => {
  state.sortRect = null;
});

window.addEventListener("resize", () => {
  fitCanvasToViewport();
});

window.addEventListener("beforeunload", () => {
  disableCamera();
  disableMicReactivity();
});

fitCanvasToViewport();
updateMirrorToggleLabel();
updateAsciiToggleLabel();
drawFallbackMessage();
requestAnimationFrame(frame);
