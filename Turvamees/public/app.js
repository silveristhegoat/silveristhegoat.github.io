const video = document.getElementById("camera");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");
const movementLabel = document.getElementById("movementLabel");
const activeZoneLabel = document.getElementById("activeZoneLabel");
const motionCountLabel = document.getElementById("motionCount");
const motionAreaLabel = document.getElementById("motionArea");
const sensitivityInput = document.getElementById("sensitivity");
const minPixelsInput = document.getElementById("minPixels");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const muteBtn = document.getElementById("muteBtn");
const zoneNameInput = document.getElementById("zoneName");
const zoneAlertSelect = document.getElementById("zoneAlert");
const addZoneBtn = document.getElementById("addZoneBtn");
const clearZonesBtn = document.getElementById("clearZonesBtn");
const zonesList = document.getElementById("zonesList");
const timelineList = document.getElementById("timelineList");
const clearTimelineBtn = document.getElementById("clearTimelineBtn");
const personModeInput = document.getElementById("personMode");
const personModelStatus = document.getElementById("personModelStatus");
const themeSelect = document.getElementById("themeSelect");
const soundPackInput = document.getElementById("soundPackInput");
const clearSoundPackBtn = document.getElementById("clearSoundPackBtn");
const soundPackStatus = document.getElementById("soundPackStatus");
const soundMappingList = document.getElementById("soundMappingList");
const calibrateBtn = document.getElementById("calibrateBtn");
const calibrationStatus = document.getElementById("calibrationStatus");
const cooldownRuleList = document.getElementById("cooldownRuleList");

const processingCanvas = document.createElement("canvas");
const processingCtx = processingCanvas.getContext("2d", { willReadFrequently: true });

const PROCESSING_WIDTH = 160;
const PROCESSING_HEIGHT = 120;
processingCanvas.width = PROCESSING_WIDTH;
processingCanvas.height = PROCESSING_HEIGHT;

let previousFrame = null;
let previousMotion = null;
let rafId = null;
let audioCtx = null;
let muted = false;
let lastSoundTimes = new Map();
let stableMovement = "waiting...";
let pendingMovement = null;
let pendingMovementFrames = 0;
let lastStableMovementAt = 0;
let lastMotionSeenAt = 0;
let zones = [];
let drawingZone = false;
let draftZone = null;
let nextZoneId = 1;
let lastZoneAlertTimes = new Map();
let timelineEvents = [];
let personModel = null;
let personDetectionInFlight = false;
let detectedPeople = [];
let detectionFrameCounter = 0;
let lastPersonSeenAt = 0;
let uploadedSounds = [];
let nextUploadedSoundId = 1;
let movementSoundMap = {
  forward: "__synth__",
  backward: "__synth__",
  left: "__synth__",
  right: "__synth__",
  up: "__synth__",
  down: "__synth__",
  detected: "__synth__",
};
let movementCooldownMap = {
  forward: 700,
  backward: 700,
  left: 700,
  right: 700,
  up: 700,
  down: 700,
  detected: 700,
};
let calibration = {
  active: false,
  startTime: 0,
  avgDeltaSamples: [],
  noisePixelSamples: [],
};

const SOUND_COOLDOWN_MS = 700;
const MOVEMENT_CONFIRM_FRAMES = 3;
const MOVEMENT_HOLD_MS = 280;
const NO_MOTION_GRACE_MS = 450;
const ZONE_ALERT_COOLDOWN_MS = 1200;
const ZONE_COLORS = ["#ff5a36", "#2f6aff", "#0f766e", "#f59e0b", "#ec4899", "#0891b2"];
const MAX_TIMELINE_EVENTS = 80;
const PERSON_DETECTION_EVERY_N_FRAMES = 8;
const PERSON_MIN_SCORE = 0.5;
const PERSON_SEEN_GRACE_MS = 1200;
const THEME_STORAGE_KEY = "turvamees-theme";
const AVAILABLE_THEMES = new Set(["sunrise", "nightwatch", "forest", "steel"]);
const MOVEMENT_TYPES = ["forward", "backward", "left", "right", "up", "down", "detected"];
const SYNTH_FALLBACK_ID = "__synth__";
const CALIBRATION_DURATION_MS = 20000;
const CALIBRATION_NOISE_DELTA = 8;

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.textContent = muted ? "Unmute Sounds" : "Mute Sounds";
});
addZoneBtn.addEventListener("click", addDraftZone);
clearZonesBtn.addEventListener("click", clearZones);
clearTimelineBtn.addEventListener("click", clearTimeline);
personModeInput.addEventListener("change", handlePersonModeChange);
themeSelect.addEventListener("change", handleThemeChange);
soundPackInput.addEventListener("change", handleSoundPackUpload);
clearSoundPackBtn.addEventListener("click", clearUploadedSounds);
calibrateBtn.addEventListener("click", startCalibration);
cooldownRuleList.addEventListener("input", handleCooldownRuleChange);
overlay.addEventListener("pointerdown", beginZoneDraw);
overlay.addEventListener("pointermove", updateZoneDraw);
overlay.addEventListener("pointerup", finishZoneDraw);
overlay.addEventListener("pointerleave", finishZoneDraw);
zonesList.addEventListener("click", removeZoneFromList);

renderZonesList();
renderTimeline();
updatePersonStatus("Model idle");
initTheme();
renderSoundMappings();
updateSoundPackStatus();
updateCalibrationStatus("Calibration idle");
renderCooldownRules();

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = AVAILABLE_THEMES.has(savedTheme) ? savedTheme : "sunrise";
  applyTheme(initialTheme);
}

function handleThemeChange(event) {
  applyTheme(event.target.value);
}

function applyTheme(themeName) {
  const theme = AVAILABLE_THEMES.has(themeName) ? themeName : "sunrise";
  document.body.dataset.theme = theme;
  themeSelect.value = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function handleSoundPackUpload(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("audio/")) {
      continue;
    }

    const sound = {
      id: `custom-${nextUploadedSoundId}`,
      name: file.name,
      url: URL.createObjectURL(file),
    };

    uploadedSounds.push(sound);
    nextUploadedSoundId += 1;
  }

  soundPackInput.value = "";
  updateSoundPackStatus();
  renderSoundMappings();
}

function clearUploadedSounds() {
  for (const sound of uploadedSounds) {
    URL.revokeObjectURL(sound.url);
  }

  uploadedSounds = [];
  for (const movement of MOVEMENT_TYPES) {
    movementSoundMap[movement] = SYNTH_FALLBACK_ID;
  }

  updateSoundPackStatus();
  renderSoundMappings();
}

function updateSoundPackStatus() {
  soundPackStatus.textContent = `${uploadedSounds.length} custom sounds loaded.`;
}

function renderSoundMappings() {
  const optionsMarkup = [
    `<option value="${SYNTH_FALLBACK_ID}">Synth fallback</option>`,
    ...uploadedSounds.map(
      (sound) => `<option value="${sound.id}">${escapeHtml(sound.name)}</option>`
    ),
  ].join("");

  const rowsMarkup = MOVEMENT_TYPES
    .map((movement) => {
      const mappedSoundId = movementSoundMap[movement];
      const hasMappedSound =
        mappedSoundId === SYNTH_FALLBACK_ID || uploadedSounds.some((sound) => sound.id === mappedSoundId);
      const selectedValue = hasMappedSound ? mappedSoundId : SYNTH_FALLBACK_ID;

      movementSoundMap[movement] = selectedValue;

      return `<div class="sound-map-row">
  <label>${escapeHtml(movement)}</label>
  <select data-movement="${movement}">${optionsMarkup}</select>
</div>`;
    })
    .join("");

  soundMappingList.innerHTML = rowsMarkup;

  for (const select of soundMappingList.querySelectorAll("select[data-movement]")) {
    const movement = select.dataset.movement;
    select.value = movementSoundMap[movement] || SYNTH_FALLBACK_ID;
    select.addEventListener("change", handleSoundMappingChange);
  }
}

function handleSoundMappingChange(event) {
  const movement = event.target.dataset.movement;
  if (!movement || !MOVEMENT_TYPES.includes(movement)) {
    return;
  }

  movementSoundMap[movement] = event.target.value;
}

function renderCooldownRules() {
  const rowsMarkup = MOVEMENT_TYPES.map((movement) => {
    const value = movementCooldownMap[movement] || 700;

    return `<div class="cooldown-row">
  <label for="cooldown-${movement}">${escapeHtml(movement)}</label>
  <input id="cooldown-${movement}" type="number" min="100" max="10000" step="100" value="${value}" data-cooldown-movement="${movement}" />
</div>`;
  }).join("");

  cooldownRuleList.innerHTML = rowsMarkup;
}

function handleCooldownRuleChange(event) {
  const input = event.target.closest("input[data-cooldown-movement]");
  if (!input) {
    return;
  }

  const movement = input.dataset.cooldownMovement;
  if (!MOVEMENT_TYPES.includes(movement)) {
    return;
  }

  const numeric = Number(input.value);
  const normalized = clamp(Number.isFinite(numeric) ? numeric : 700, 100, 10000);
  movementCooldownMap[movement] = normalized;
  input.value = String(normalized);
}

async function startCamera() {
  if (video.srcObject) {
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

    video.srcObject = stream;
    await video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    startBtn.disabled = true;
    stopBtn.disabled = false;
    startBtn.textContent = "Camera Active";

    if (personModeInput.checked) {
      ensurePersonModel();
    }

    runDetectionLoop();
  } catch (error) {
    movementLabel.textContent = "camera access denied";
    console.error("Could not start camera", error);
  }
}

async function startCalibration() {
  if (calibration.active) {
    return;
  }

  if (!video.srcObject) {
    await startCamera();
    if (!video.srcObject) {
      updateCalibrationStatus("Camera is required for calibration.");
      return;
    }
  }

  calibration.active = true;
  calibration.startTime = performance.now();
  calibration.avgDeltaSamples = [];
  calibration.noisePixelSamples = [];
  calibrateBtn.disabled = true;
  updateCalibrationStatus("Calibrating... 20s left");
}

function updateCalibrationStatus(text) {
  calibrationStatus.textContent = text;
}

async function handlePersonModeChange() {
  if (personModeInput.checked) {
    updatePersonStatus("Loading model...");
    await ensurePersonModel();
  } else {
    updatePersonStatus("Model idle");
  }
}

async function ensurePersonModel() {
  if (personModel) {
    updatePersonStatus("Model ready");
    return;
  }

  try {
    updatePersonStatus("Loading model...");
    personModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    updatePersonStatus("Model ready");
  } catch (error) {
    updatePersonStatus("Model failed to load");
    console.error("Could not load person model", error);
  }
}

function updatePersonStatus(text) {
  personModelStatus.textContent = text;
}

function stopCamera() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  previousFrame = null;
  previousMotion = null;
  pendingMovement = null;
  pendingMovementFrames = 0;
  stableMovement = "waiting...";
  lastStableMovementAt = 0;
  lastMotionSeenAt = 0;
  drawingZone = false;
  draftZone = null;
  detectedPeople = [];
  detectionFrameCounter = 0;
  lastPersonSeenAt = 0;
  lastSoundTimes.clear();
  calibration.active = false;
  calibration.avgDeltaSamples = [];
  calibration.noisePixelSamples = [];
  calibrateBtn.disabled = false;
  updateCalibrationStatus("Calibration idle");

  setMovementLabel("waiting...");
  activeZoneLabel.textContent = "none";
  motionCountLabel.textContent = "0";
  motionAreaLabel.textContent = "0";

  startBtn.disabled = false;
  stopBtn.disabled = true;
  startBtn.textContent = "Start Camera";
}

function runDetectionLoop() {
  const threshold = Number(sensitivityInput.value);
  const minMotionPixels = Number(minPixelsInput.value);

  processingCtx.drawImage(video, 0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const imageData = processingCtx.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const currentFrame = grayscale(imageData.data);
  maybeRunPersonDetection();

  if (previousFrame) {
    const motion = detectMotion(previousFrame, currentFrame, threshold);
    updateCalibrationSample(motion);
    classifyAndAct(motion, minMotionPixels);
    drawOverlay(motion);
  } else {
    drawOverlay({ count: 0 });
  }

  previousFrame = currentFrame;
  rafId = requestAnimationFrame(runDetectionLoop);
}

function updateCalibrationSample(motion) {
  if (!calibration.active) {
    return;
  }

  const now = performance.now();
  const elapsed = now - calibration.startTime;
  const remainingSeconds = Math.max(0, Math.ceil((CALIBRATION_DURATION_MS - elapsed) / 1000));
  updateCalibrationStatus(`Calibrating... ${remainingSeconds}s left`);

  calibration.avgDeltaSamples.push(motion.avgDelta);
  calibration.noisePixelSamples.push(motion.noisePixels);

  if (elapsed < CALIBRATION_DURATION_MS) {
    return;
  }

  finalizeCalibration();
}

function finalizeCalibration() {
  calibration.active = false;
  calibrateBtn.disabled = false;

  const avgDeltas = calibration.avgDeltaSamples;
  const noisePixels = calibration.noisePixelSamples;

  if (avgDeltas.length < 20 || noisePixels.length < 20) {
    updateCalibrationStatus("Calibration failed. Try again with steady lighting.");
    return;
  }

  const avgDeltaMean = avgDeltas.reduce((sum, value) => sum + value, 0) / avgDeltas.length;
  const noiseP95 = percentile(noisePixels, 0.95);

  const tunedSensitivity = clamp(Math.round(avgDeltaMean * 2.4 + 10), 12, 60);
  const tunedMinPixels = clamp(Math.round(noiseP95 * 1.7 + 80), 80, 1200);

  sensitivityInput.value = String(tunedSensitivity);
  minPixelsInput.value = String(tunedMinPixels);
  updateCalibrationStatus(`Done. Sensitivity ${tunedSensitivity}, min pixels ${tunedMinPixels}.`);

  calibration.avgDeltaSamples = [];
  calibration.noisePixelSamples = [];
}

function maybeRunPersonDetection() {
  if (!personModeInput.checked || !personModel || personDetectionInFlight || !video.srcObject) {
    return;
  }

  detectionFrameCounter += 1;
  if (detectionFrameCounter % PERSON_DETECTION_EVERY_N_FRAMES !== 0) {
    return;
  }

  personDetectionInFlight = true;
  personModel
    .detect(video, 8, PERSON_MIN_SCORE)
    .then((predictions) => {
      detectedPeople = predictions
        .filter((prediction) => prediction.class === "person")
        .map((prediction) => {
          const [x, y, w, h] = prediction.bbox;
          return {
            x,
            y,
            w,
            h,
            score: prediction.score,
          };
        });

      if (detectedPeople.length > 0) {
        lastPersonSeenAt = performance.now();
      }
    })
    .catch((error) => {
      console.error("Person detection failed", error);
    })
    .finally(() => {
      personDetectionInFlight = false;
    });
}

function grayscale(rgbaData) {
  const gray = new Uint8Array(PROCESSING_WIDTH * PROCESSING_HEIGHT);

  for (let i = 0, p = 0; i < rgbaData.length; i += 4, p += 1) {
    const r = rgbaData[i];
    const g = rgbaData[i + 1];
    const b = rgbaData[i + 2];
    gray[p] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }

  return gray;
}

function detectMotion(prev, curr, threshold) {
  let count = 0;
  let noisePixels = 0;
  let deltaSum = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = PROCESSING_WIDTH;
  let maxX = 0;
  let minY = PROCESSING_HEIGHT;
  let maxY = 0;

  for (let y = 0; y < PROCESSING_HEIGHT; y += 1) {
    for (let x = 0; x < PROCESSING_WIDTH; x += 1) {
      const idx = y * PROCESSING_WIDTH + x;
      const delta = Math.abs(curr[idx] - prev[idx]);
      deltaSum += delta;

      if (delta > CALIBRATION_NOISE_DELTA) {
        noisePixels += 1;
      }

      if (delta > threshold) {
        count += 1;
        sumX += x;
        sumY += y;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count === 0) {
    return {
      count: 0,
      avgDelta: deltaSum / (PROCESSING_WIDTH * PROCESSING_HEIGHT),
      noisePixels,
      centroidX: 0,
      centroidY: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      area: 0,
    };
  }

  return {
    count,
    avgDelta: deltaSum / (PROCESSING_WIDTH * PROCESSING_HEIGHT),
    noisePixels,
    centroidX: sumX / count,
    centroidY: sumY / count,
    minX,
    maxX,
    minY,
    maxY,
    area: (maxX - minX + 1) * (maxY - minY + 1),
  };
}

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * quantile);
  return sorted[index];
}

function drawOverlay(motion) {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  drawZones();
  drawPeople();
  drawDraftZone();

  if (motion.count < 1) {
    return;
  }

  const scaleX = overlay.width / PROCESSING_WIDTH;
  const scaleY = overlay.height / PROCESSING_HEIGHT;

  const x = motion.minX * scaleX;
  const y = motion.minY * scaleY;
  const w = (motion.maxX - motion.minX + 1) * scaleX;
  const h = (motion.maxY - motion.minY + 1) * scaleY;

  overlayCtx.strokeStyle = "rgba(255, 90, 54, 0.95)";
  overlayCtx.lineWidth = 3;
  overlayCtx.strokeRect(x, y, w, h);

  overlayCtx.fillStyle = "rgba(47, 106, 255, 0.95)";
  overlayCtx.beginPath();
  overlayCtx.arc(motion.centroidX * scaleX, motion.centroidY * scaleY, 5, 0, Math.PI * 2);
  overlayCtx.fill();
}

function drawPeople() {
  if (!personModeInput.checked || detectedPeople.length === 0) {
    return;
  }

  for (const person of detectedPeople) {
    overlayCtx.strokeStyle = "rgba(16, 185, 129, 0.95)";
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(person.x, person.y, person.w, person.h);
    overlayCtx.fillStyle = "rgba(16, 185, 129, 0.95)";
    overlayCtx.font = "12px Space Grotesk";
    overlayCtx.fillText(`person ${Math.round(person.score * 100)}%`, person.x + 6, person.y + 14);
  }
}

function classifyAndAct(motion, minMotionPixels) {
  const now = performance.now();

  motionCountLabel.textContent = String(motion.count);
  motionAreaLabel.textContent = String(motion.area);

  if (motion.count < minMotionPixels) {
    if (now - lastMotionSeenAt > NO_MOTION_GRACE_MS) {
      const smoothedNoMotion = smoothMovement("no significant movement", now);
      setMovementLabel(smoothedNoMotion.movement);

      if (smoothedNoMotion.changed) {
        previousMotion = null;
      }
    }

    activeZoneLabel.textContent = "none";
    return;
  }

  if (personModeInput.checked) {
    const personMatch = isPersonRelatedMotion(motion, now);

    if (!personMatch.allowed) {
      setMovementLabel("person not detected");
      activeZoneLabel.textContent = "none";
      previousMotion = null;
      return;
    }
  }

  lastMotionSeenAt = now;

  let movement = "detected";
  let dx = 0;
  let dy = 0;
  let areaRatio = 1;
  const activeZone = findActiveZone(motion);
  activeZoneLabel.textContent = activeZone ? activeZone.name : "none";

  if (previousMotion) {
    dx = motion.centroidX - previousMotion.centroidX;
    dy = motion.centroidY - previousMotion.centroidY;
    areaRatio = previousMotion.area > 0 ? motion.area / previousMotion.area : 1;

    if (areaRatio < 0.78) {
      movement = "backward";
    } else if (areaRatio > 1.24) {
      movement = "forward";
    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 2.2) {
      movement = dx > 0 ? "right" : "left";
    } else if (Math.abs(dy) > 2.2) {
      movement = dy > 0 ? "down" : "up";
    }
  }

  const smoothed = smoothMovement(movement, now);
  setMovementLabel(smoothed.movement);

  if (smoothed.changed && smoothed.movement !== "no significant movement") {
    if (!canTriggerMovementAlert(smoothed.movement, now)) {
      previousMotion = {
        centroidX: motion.centroidX,
        centroidY: motion.centroidY,
        area: motion.area,
      };
      return;
    }

    const confidence = calculateConfidence({
      motion,
      minMotionPixels,
      movement: smoothed.movement,
      dx,
      dy,
      areaRatio,
    });

    playMovementSound(smoothed.movement);

    if (activeZone) {
      playZoneAlert(activeZone, smoothed.movement);
    }

    addTimelineEvent({
      movement: smoothed.movement,
      confidence,
      zone: activeZone ? activeZone.name : "none",
    });
  }

  previousMotion = {
    centroidX: motion.centroidX,
    centroidY: motion.centroidY,
    area: motion.area,
  };
}

function isPersonRelatedMotion(motion, now) {
  if (!personModel) {
    setMovementLabel("loading person model");
    return { allowed: false };
  }

  const scaleX = overlay.width / PROCESSING_WIDTH;
  const scaleY = overlay.height / PROCESSING_HEIGHT;
  const motionRect = {
    x: motion.minX * scaleX,
    y: motion.minY * scaleY,
    w: (motion.maxX - motion.minX + 1) * scaleX,
    h: (motion.maxY - motion.minY + 1) * scaleY,
  };

  for (const person of detectedPeople) {
    const overlap = rectsOverlap(motionRect, person);
    if (overlap) {
      lastPersonSeenAt = now;
      return { allowed: true };
    }
  }

  if (now - lastPersonSeenAt < PERSON_SEEN_GRACE_MS) {
    return { allowed: true };
  }

  return { allowed: false };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function calculateConfidence({ motion, minMotionPixels, movement, dx, dy, areaRatio }) {
  const pixelStrength = clamp((motion.count - minMotionPixels) / (minMotionPixels * 1.8), 0, 1);
  const directionStrength = clamp(Math.max(Math.abs(dx), Math.abs(dy)) / 10, 0, 1);
  const depthStrength = clamp(Math.abs(1 - areaRatio) * 1.6, 0, 1);

  let movementStrength = directionStrength;
  if (movement === "forward" || movement === "backward") {
    movementStrength = Math.max(directionStrength * 0.45, depthStrength);
  }

  const score = 0.45 * pixelStrength + 0.55 * movementStrength;
  return clamp(score, 0, 1);
}

function addTimelineEvent({ movement, confidence, zone }) {
  timelineEvents.unshift({
    time: formatEventTime(new Date()),
    movement,
    confidence,
    zone,
  });

  if (timelineEvents.length > MAX_TIMELINE_EVENTS) {
    timelineEvents = timelineEvents.slice(0, MAX_TIMELINE_EVENTS);
  }

  renderTimeline();
}

function renderTimeline() {
  if (timelineEvents.length === 0) {
    timelineList.innerHTML = "<div class=\"timeline-empty\">No events yet.</div>";
    return;
  }

  timelineList.innerHTML = timelineEvents
    .map(
      (event) => `<div class="timeline-row">
  <span>${event.time}</span>
  <span>${escapeHtml(event.movement)}</span>
  <span>${Math.round(event.confidence * 100)}%</span>
  <span>${escapeHtml(event.zone)}</span>
</div>`
    )
    .join("");
}

function clearTimeline() {
  timelineEvents = [];
  renderTimeline();
}

function formatEventTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setMovementLabel(text) {
  if (movementLabel.textContent !== text) {
    movementLabel.textContent = text;
  }
}

function smoothMovement(nextMovement, now) {
  if (nextMovement === stableMovement) {
    pendingMovement = null;
    pendingMovementFrames = 0;

    return {
      movement: stableMovement,
      changed: false,
    };
  }

  if (pendingMovement !== nextMovement) {
    pendingMovement = nextMovement;
    pendingMovementFrames = 1;

    return {
      movement: stableMovement,
      changed: false,
    };
  }

  pendingMovementFrames += 1;

  if (pendingMovementFrames < MOVEMENT_CONFIRM_FRAMES) {
    return {
      movement: stableMovement,
      changed: false,
    };
  }

  if (now - lastStableMovementAt < MOVEMENT_HOLD_MS) {
    return {
      movement: stableMovement,
      changed: false,
    };
  }

  stableMovement = nextMovement;
  lastStableMovementAt = now;
  pendingMovement = null;
  pendingMovementFrames = 0;

  return {
    movement: stableMovement,
    changed: true,
  };
}

function beginZoneDraw(event) {
  if (!video.srcObject || overlay.width === 0 || overlay.height === 0) {
    return;
  }

  const point = getOverlayPoint(event);
  drawingZone = true;
  draftZone = {
    x1: point.x,
    y1: point.y,
    x2: point.x,
    y2: point.y,
  };
}

function updateZoneDraw(event) {
  if (!drawingZone || !draftZone) {
    return;
  }

  const point = getOverlayPoint(event);
  draftZone.x2 = point.x;
  draftZone.y2 = point.y;
}

function finishZoneDraw(event) {
  if (!drawingZone || !draftZone) {
    return;
  }

  const point = getOverlayPoint(event);
  draftZone.x2 = point.x;
  draftZone.y2 = point.y;
  drawingZone = false;
}

function addDraftZone() {
  if (!draftZone || !video.srcObject) {
    return;
  }

  const rect = normalizeRect(draftZone);
  if (rect.w < 18 || rect.h < 18) {
    return;
  }

  const zone = {
    id: nextZoneId,
    name: zoneNameInput.value.trim() || `Zone ${nextZoneId}`,
    alertType: zoneAlertSelect.value,
    color: ZONE_COLORS[(nextZoneId - 1) % ZONE_COLORS.length],
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
  };

  zones.push(zone);
  nextZoneId += 1;
  zoneNameInput.value = "";
  draftZone = null;
  renderZonesList();
}

function clearZones() {
  zones = [];
  draftZone = null;
  lastZoneAlertTimes.clear();
  activeZoneLabel.textContent = "none";
  renderZonesList();
}

function removeZoneFromList(event) {
  const removeButton = event.target.closest("button[data-zone-id]");
  if (!removeButton) {
    return;
  }

  const zoneId = Number(removeButton.dataset.zoneId);
  zones = zones.filter((zone) => zone.id !== zoneId);
  lastZoneAlertTimes.delete(zoneId);
  renderZonesList();
}

function renderZonesList() {
  if (zones.length === 0) {
    zonesList.textContent = "No zones yet.";
    return;
  }

  const html = zones
    .map(
      (zone) => `<div class="zone-item">
  <span class="zone-dot" style="background:${zone.color}"></span>
  <span>${escapeHtml(zone.name)} (${zone.alertType})</span>
  <button class="zone-remove" type="button" data-zone-id="${zone.id}">Remove</button>
</div>`
    )
    .join("");

  zonesList.innerHTML = html;
}

function drawZones() {
  for (const zone of zones) {
    overlayCtx.strokeStyle = zone.color;
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    overlayCtx.fillStyle = zone.color;
    overlayCtx.font = "12px Space Grotesk";
    overlayCtx.fillText(zone.name, zone.x + 6, zone.y + 14);
  }
}

function drawDraftZone() {
  if (!draftZone) {
    return;
  }

  const rect = normalizeRect(draftZone);
  overlayCtx.setLineDash([6, 4]);
  overlayCtx.strokeStyle = "rgba(15, 118, 110, 0.9)";
  overlayCtx.lineWidth = 2;
  overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  overlayCtx.setLineDash([]);
}

function findActiveZone(motion) {
  const scaleX = overlay.width / PROCESSING_WIDTH;
  const scaleY = overlay.height / PROCESSING_HEIGHT;
  const x = motion.centroidX * scaleX;
  const y = motion.centroidY * scaleY;

  for (const zone of zones) {
    const inside = x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
    if (inside) {
      return zone;
    }
  }

  return null;
}

function playMovementSound(movement) {
  if (muted) {
    return;
  }

  if (playCustomMappedSound(movement)) {
    return;
  }

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  switch (movement) {
    case "forward":
      chirp(430, 700, 0.16, "triangle");
      break;
    case "backward":
      siren(920, 640, 0.55);
      break;
    case "left":
      chirp(280, 240, 0.18, "square");
      break;
    case "right":
      chirp(520, 570, 0.18, "square");
      break;
    case "up":
      chirp(750, 930, 0.14, "sine");
      break;
    case "down":
      chirp(220, 170, 0.2, "sawtooth");
      break;
    default:
      chirp(350, 350, 0.08, "sine");
      break;
  }
}

function canTriggerMovementAlert(movement, now) {
  const cooldownMs = movementCooldownMap[movement] || SOUND_COOLDOWN_MS;
  const lastPlayedAt = lastSoundTimes.get(movement) || 0;

  if (now - lastPlayedAt < cooldownMs) {
    return false;
  }

  lastSoundTimes.set(movement, now);
  return true;
}

function playCustomMappedSound(movement) {
  const mappedSoundId = movementSoundMap[movement] || SYNTH_FALLBACK_ID;
  if (mappedSoundId === SYNTH_FALLBACK_ID) {
    return false;
  }

  const sound = uploadedSounds.find((item) => item.id === mappedSoundId);
  if (!sound) {
    movementSoundMap[movement] = SYNTH_FALLBACK_ID;
    return false;
  }

  const audio = new Audio(sound.url);
  audio.volume = 0.95;
  audio.play().catch((error) => {
    console.error("Could not play custom sound", error);
  });

  return true;
}

function playZoneAlert(zone, movement) {
  if (muted) {
    return;
  }

  const now = performance.now();
  const lastPlayedAt = lastZoneAlertTimes.get(zone.id) || 0;

  if (now - lastPlayedAt < ZONE_ALERT_COOLDOWN_MS) {
    return;
  }

  lastZoneAlertTimes.set(zone.id, now);

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  switch (zone.alertType) {
    case "alarm":
      siren(980, 620, 0.6);
      break;
    case "chime":
      chirp(680, 920, 0.2, "triangle");
      setTimeout(() => chirp(760, 980, 0.16, "triangle"), 130);
      break;
    case "pulse":
      chirp(300, 260, 0.24, movement === "backward" ? "sawtooth" : "square");
      break;
    case "bell":
      chirp(810, 570, 0.26, "sine");
      break;
    default:
      break;
  }
}

function chirp(fromFreq, toFreq, durationSec, type) {
  const startTime = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), startTime + durationSec);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationSec);
}

function siren(highFreq, lowFreq, durationSec) {
  const steps = 4;
  const stepDuration = durationSec / steps;
  let start = audioCtx.currentTime;

  for (let i = 0; i < steps; i += 1) {
    const from = i % 2 === 0 ? highFreq : lowFreq;
    const to = i % 2 === 0 ? lowFreq : highFreq;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.linearRampToValueAtTime(to, start + stepDuration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + stepDuration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(start);
    osc.stop(start + stepDuration);

    start += stepDuration;
  }
}

function getOverlayPoint(event) {
  const rect = overlay.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * overlay.width;
  const y = ((event.clientY - rect.top) / rect.height) * overlay.height;

  return {
    x: clamp(x, 0, overlay.width),
    y: clamp(y, 0, overlay.height),
  };
}

function normalizeRect(rect) {
  const x = Math.min(rect.x1, rect.x2);
  const y = Math.min(rect.y1, rect.y2);
  const w = Math.abs(rect.x2 - rect.x1);
  const h = Math.abs(rect.y2 - rect.y1);

  return { x, y, w, h };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.addEventListener("beforeunload", () => {
  for (const sound of uploadedSounds) {
    URL.revokeObjectURL(sound.url);
  }

  stopCamera();
});
