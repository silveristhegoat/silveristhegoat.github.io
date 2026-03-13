const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const difficultySelect = document.getElementById("difficultySelect");
const shapeSelect = document.getElementById("shapeSelect");
const musicInput = document.getElementById("musicInput");
const uploadMusicBtn = document.getElementById("uploadMusicBtn");
const musicLoopToggle = document.getElementById("musicLoopToggle");
const musicToggleBtn = document.getElementById("musicToggleBtn");
const cutBtn = document.getElementById("cutBtn");
const viewBtn = document.getElementById("viewBtn");
const checkBtn = document.getElementById("checkBtn");
const statusText = document.getElementById("statusText");
const assemblyStage = document.getElementById("assemblyStage");
const assemblyGrid = document.getElementById("assemblyGrid");
const storageArea = document.getElementById("storageArea");
const uploadDropZone = document.getElementById("uploadDropZone");
const ghostImage = document.getElementById("ghostImage");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const pieceCount = document.getElementById("pieceCount");
const timerValue = document.getElementById("timerValue");
const leaderboardList = document.getElementById("leaderboardList");
const successScreen = document.getElementById("successScreen");
const successCloseBtn = document.getElementById("successCloseBtn");
const successText = document.getElementById("successText");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const fireworksCtx = fireworksCanvas.getContext("2d");

const TILE_SIZE = 100;
const LEADERBOARD_STORAGE_KEY = "pixelPuzzleRecords";
let sourceImage = null;
let hintVisible = false;
let audioContext = null;
let hasCelebrated = false;

let fireworkParticles = [];
let fireworkAnimationId = null;
let fireworkStopTimeoutId = null;
let fireworkBurstTimeoutIds = [];

let musicPlaying = false;
let musicAudio = null;
let musicObjectUrl = null;

let puzzleInProgress = false;
let puzzleStartTime = null;
let timerIntervalId = null;

function getGridSize() {
  return Number(difficultySelect.value);
}

function getShapeMode() {
  return shapeSelect.value;
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function updateUploadDropZoneState() {
  uploadDropZone.classList.toggle("upload-ready", !sourceImage);
}

function formatElapsed(ms) {
  const minutes = Math.floor(ms / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const millis = Math.floor(ms % 1000)
    .toString()
    .padStart(3, "0");
  return `${minutes}:${seconds}.${millis}`;
}

function updateTimerDisplay() {
  if (!puzzleInProgress || puzzleStartTime === null) {
    timerValue.textContent = "00:00.000";
    return;
  }

  timerValue.textContent = formatElapsed(Date.now() - puzzleStartTime);
}

function resetTimer() {
  puzzleInProgress = false;
  puzzleStartTime = null;

  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  timerValue.textContent = "00:00.000";
}

function startTimerIfNeeded() {
  if (puzzleInProgress) {
    return;
  }

  puzzleInProgress = true;
  puzzleStartTime = Date.now();
  updateTimerDisplay();
  timerIntervalId = window.setInterval(updateTimerDisplay, 33);
}

function stopTimer() {
  if (!puzzleInProgress || puzzleStartTime === null) {
    return null;
  }

  const elapsed = Date.now() - puzzleStartTime;
  puzzleInProgress = false;

  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  timerValue.textContent = formatElapsed(elapsed);
  return elapsed;
}

function renderLeaderboard(records) {
  leaderboardList.innerHTML = "";

  if (!records || records.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No records yet.";
    leaderboardList.appendChild(empty);
    return;
  }

  records.slice(0, 10).forEach((record) => {
    const item = document.createElement("li");
    item.textContent = `${formatElapsed(record.elapsedMs)} | ${record.difficulty}x${record.difficulty} | ${record.shape}`;
    leaderboardList.appendChild(item);
  });
}

async function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(records) ? records : [];
    normalized.sort((a, b) => a.elapsedMs - b.elapsedMs);
    renderLeaderboard(normalized);
  } catch (error) {
    renderLeaderboard([]);
  }
}

async function saveRecord(elapsedMs) {
  const record = {
    elapsedMs,
    difficulty: getGridSize(),
    shape: getShapeMode(),
    recordedAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(records) ? records : [];
    normalized.push(record);
    normalized.sort((a, b) => a.elapsedMs - b.elapsedMs);
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalized));
    renderLeaderboard(normalized);
  } catch (error) {
    setStatus("Solved, but record could not be saved in this browser.", true);
  }
}

function clearFireworkTimers() {
  fireworkBurstTimeoutIds.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  fireworkBurstTimeoutIds = [];

  if (fireworkStopTimeoutId) {
    window.clearTimeout(fireworkStopTimeoutId);
    fireworkStopTimeoutId = null;
  }
}

function stopFireworks() {
  clearFireworkTimers();
  fireworkParticles = [];

  if (fireworkAnimationId) {
    window.cancelAnimationFrame(fireworkAnimationId);
    fireworkAnimationId = null;
  }

  fireworksCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  fireworksCanvas.classList.remove("active");
}

function resetCelebrationState() {
  hasCelebrated = false;
  stopFireworks();
}

function updatePieceCount() {
  const count = storageArea.querySelectorAll(".piece").length;
  pieceCount.textContent = `${count} piece${count === 1 ? "" : "s"}`;
}

function showSuccessScreen() {
  successScreen.classList.add("visible");
  successScreen.setAttribute("aria-hidden", "false");
}

function hideSuccessScreen() {
  successScreen.classList.remove("visible");
  successScreen.setAttribute("aria-hidden", "true");
}

function updateHintVisibility() {
  assemblyStage.classList.toggle("hint-visible", hintVisible);
  viewBtn.textContent = hintVisible ? "Hide view" : "View";
}

function getSlotByIndex(index) {
  return assemblyGrid.querySelector(`.slot[data-slot-index="${index}"]`);
}

function getSlotDistance(fromIndex, toIndex, gridSize) {
  const fromRow = Math.floor(fromIndex / gridSize);
  const fromCol = fromIndex % gridSize;
  const toRow = Math.floor(toIndex / gridSize);
  const toCol = toIndex % gridSize;
  return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);
}

function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildRandomPolygonPath(seed) {
  const random = createSeededRandom(seed);
  const vertexCount = 5 + Math.floor(random() * 4);
  const step = (Math.PI * 2) / vertexCount;
  const points = [];

  for (let i = 0; i < vertexCount; i += 1) {
    const angleJitter = (random() - 0.5) * step * 0.55;
    const angle = i * step + angleJitter;
    const radius = 32 + random() * 16;
    const x = Math.min(96, Math.max(4, 50 + Math.cos(angle) * radius));
    const y = Math.min(96, Math.max(4, 50 + Math.sin(angle) * radius));
    points.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }

  return `polygon(${points.join(", ")})`;
}

function getPieceClipPath(index) {
  if (getShapeMode() === "square") {
    return "none";
  }

  if (getShapeMode() === "triangle") {
    const trianglePaths = [
      "polygon(50% 2%, 98% 98%, 2% 98%)",
      "polygon(2% 2%, 98% 2%, 50% 98%)",
      "polygon(2% 50%, 98% 2%, 98% 98%)",
      "polygon(2% 2%, 98% 50%, 2% 98%)"
    ];
    return trianglePaths[index % trianglePaths.length];
  }

  return buildRandomPolygonPath(index * 9973 + getGridSize() * 131);
}

function playSnapSound() {
  const context = getAudioContext();
  const startAt = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(720, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(510, startAt + 0.08);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.12);
}

function stopBackgroundMusic() {
  if (!musicAudio) {
    musicPlaying = false;
    return;
  }

  musicAudio.pause();
  musicAudio.currentTime = 0;
  musicPlaying = false;
  updateMusicButtonText();
}

function initializeMusicAudio() {
  if (musicAudio) {
    return;
  }

  musicAudio = new Audio();
  musicAudio.preload = "auto";
  musicAudio.volume = 0.6;
  musicAudio.loop = musicLoopToggle.checked;

  musicAudio.addEventListener("play", () => {
    musicPlaying = true;
    updateMusicButtonText();
  });

  musicAudio.addEventListener("pause", () => {
    musicPlaying = false;
    updateMusicButtonText();
  });

  musicAudio.addEventListener("ended", () => {
    musicPlaying = false;
    updateMusicButtonText();
  });
}

function updateMusicButtonText() {
  musicToggleBtn.textContent = musicPlaying ? "Stop music" : "Play music";
}

function startBackgroundMusic() {
  if (!musicAudio || !musicAudio.src) {
    setStatus("Upload a music file first.", true);
    return;
  }

  musicAudio.loop = musicLoopToggle.checked;
  musicAudio.play().catch(() => {
    setStatus("Unable to play this audio file.", true);
  });
}

function loadMusicFromFile(file) {
  if (!file || !file.type.startsWith("audio/")) {
    setStatus("Please choose a valid audio file.", true);
    return;
  }

  initializeMusicAudio();
  stopBackgroundMusic();

  if (musicObjectUrl) {
    URL.revokeObjectURL(musicObjectUrl);
    musicObjectUrl = null;
  }

  musicObjectUrl = URL.createObjectURL(file);
  musicAudio.src = musicObjectUrl;
  musicAudio.loop = musicLoopToggle.checked;
  musicToggleBtn.disabled = false;
  setStatus(`Music loaded: ${file.name}`);
}

function resizeFireworksCanvas() {
  const dpr = window.devicePixelRatio || 1;
  fireworksCanvas.width = Math.floor(window.innerWidth * dpr);
  fireworksCanvas.height = Math.floor(window.innerHeight * dpr);
  fireworksCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnFireworkBurst(originX, originY) {
  const colors = ["#ffd166", "#ff7b7b", "#75f1ff", "#8cff8c", "#ffd6ff"];
  const particleCount = 44;

  for (let i = 0; i < particleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.6 + Math.random() * 4.3;
    fireworkParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9 + Math.random() * 0.4,
      size: 1.4 + Math.random() * 2.4,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function animateFireworks() {
  fireworksCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  fireworkParticles = fireworkParticles.filter((particle) => particle.life > 0);

  fireworkParticles.forEach((particle) => {
    particle.vy += 0.03;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.015;
    particle.size *= 0.992;

    fireworksCtx.globalAlpha = Math.max(0, particle.life);
    fireworksCtx.fillStyle = particle.color;
    fireworksCtx.beginPath();
    fireworksCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    fireworksCtx.fill();
  });

  fireworksCtx.globalAlpha = 1;

  if (fireworkParticles.length > 0 || fireworkBurstTimeoutIds.length > 0) {
    fireworkAnimationId = window.requestAnimationFrame(animateFireworks);
    return;
  }

  fireworkAnimationId = null;
  fireworksCanvas.classList.remove("active");
}

function launchWinFireworks() {
  stopFireworks();
  resizeFireworksCanvas();
  fireworksCanvas.classList.add("active");

  for (let i = 0; i < 8; i += 1) {
    const delay = i * 180;
    const timeoutId = window.setTimeout(() => {
      fireworkBurstTimeoutIds = fireworkBurstTimeoutIds.filter((id) => id !== timeoutId);
      const x = 80 + Math.random() * Math.max(200, window.innerWidth - 160);
      const y = 80 + Math.random() * Math.max(180, window.innerHeight * 0.45);
      spawnFireworkBurst(x, y);

      if (!fireworkAnimationId) {
        fireworkAnimationId = window.requestAnimationFrame(animateFireworks);
    }
    }, delay);

    fireworkBurstTimeoutIds.push(timeoutId);
  }

  fireworkStopTimeoutId = window.setTimeout(() => {
    fireworkStopTimeoutId = null;
    if (!fireworkAnimationId && fireworkParticles.length === 0) {
      fireworksCanvas.classList.remove("active");
    }
  }, 3200);
}

function placePieceWithMagnet(piece, droppedSlot) {
  const gridSize = getGridSize();
  const droppedIndex = Number(droppedSlot.dataset.slotIndex);
  const correctIndex = Number(piece.dataset.correctIndex);
  const correctSlot = getSlotByIndex(correctIndex);
  const magnetDistance = gridSize >= 10 ? 2 : 1;

  if (correctSlot && !correctSlot.firstElementChild) {
    const distance = getSlotDistance(droppedIndex, correctIndex, gridSize);
    if (distance <= magnetDistance) {
      correctSlot.appendChild(piece);
      playSnapSound();
      return;
    }
  }

  droppedSlot.appendChild(piece);
}

function isPuzzleSolved() {
  const gridSize = getGridSize();
  const slots = Array.from(assemblyGrid.querySelectorAll(".slot"));

  if (slots.length !== gridSize * gridSize) {
    return false;
  }

  return slots.every((slot) => {
    const piece = slot.querySelector(".piece");
    if (!piece) {
      return false;
    }

    return Number(piece.dataset.correctIndex) === Number(slot.dataset.slotIndex);
  });
}

function evaluatePuzzleState() {
  if (isPuzzleSolved()) {
    const totalPieces = getGridSize() * getGridSize();
    const elapsedMs = stopTimer();
    successText.textContent = `You assembled all ${totalPieces} pieces in the correct order.`;

    if (elapsedMs !== null) {
      setStatus(`Perfect! You solved the puzzle in ${formatElapsed(elapsedMs)}.`);
      saveRecord(elapsedMs);
    } else {
      setStatus("Perfect! You solved the puzzle.");
    }

    if (!hasCelebrated) {
      hasCelebrated = true;
      launchWinFireworks();
    }

    showSuccessScreen();
    return;
  }

  hasCelebrated = false;
  hideSuccessScreen();
}

function clearCheckHighlights() {
  assemblyGrid.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.remove("correct", "incorrect");
  });
}

function checkPlacedPieces() {
  const gridSize = getGridSize();
  const slots = Array.from(assemblyGrid.querySelectorAll(".slot"));
  let correctCount = 0;
  let incorrectCount = 0;

  slots.forEach((slot) => {
    slot.classList.remove("correct", "incorrect");
    const piece = slot.querySelector(".piece");

    if (!piece) {
      return;
    }

    const isCorrect = Number(piece.dataset.correctIndex) === Number(slot.dataset.slotIndex);
    if (isCorrect) {
      correctCount += 1;
      slot.classList.add("correct");
      return;
    }

    incorrectCount += 1;
    slot.classList.add("incorrect");
  });

  const placedCount = correctCount + incorrectCount;
  setStatus(
    `Check result: ${correctCount} correct, ${incorrectCount} incorrect, ${gridSize * gridSize - placedCount} empty.`
  );
}

function buildAssemblyGrid() {
  const gridSize = getGridSize();
  assemblyGrid.innerHTML = "";
  assemblyGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  assemblyGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

  for (let i = 0; i < gridSize * gridSize; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.slotIndex = i;

    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("over");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("over");
      const pieceId = event.dataTransfer.getData("text/plain");
      const piece = document.getElementById(pieceId);

      if (!piece || slot.children.length > 0) {
        return;
      }

      placePieceWithMagnet(piece, slot);
      clearCheckHighlights();
      updatePieceCount();
      evaluatePuzzleState();
    });

    assemblyGrid.appendChild(slot);
  }
}

function makePieceDraggable(piece) {
  piece.addEventListener("pointerdown", startTimerIfNeeded);
  piece.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", piece.id);
    event.dataTransfer.effectAllowed = "move";
  });
}

function makeStorageDroppable() {
  storageArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    storageArea.classList.add("over");
  });

  storageArea.addEventListener("dragleave", () => {
    storageArea.classList.remove("over");
  });

  storageArea.addEventListener("drop", (event) => {
    event.preventDefault();
    storageArea.classList.remove("over");
    const pieceId = event.dataTransfer.getData("text/plain");
    const piece = document.getElementById(pieceId);

    if (!piece) {
      return;
    }

    storageArea.appendChild(piece);
    clearCheckHighlights();
    updatePieceCount();
    evaluatePuzzleState();
  });
}

function clearBoard() {
  Array.from(document.querySelectorAll(".slot .piece")).forEach((piece) => {
    storageArea.appendChild(piece);
  });
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

function createPuzzlePieces() {
  const gridSize = getGridSize();
  const shapeMode = getShapeMode();

  if (!sourceImage) {
    setStatus("Please upload an image first.", true);
    return;
  }

  clearBoard();
  storageArea.innerHTML = "";
  hideSuccessScreen();
  clearCheckHighlights();
  resetCelebrationState();
  resetTimer();

  const srcWidth = sourceImage.naturalWidth;
  const srcHeight = sourceImage.naturalHeight;
  const cropSize = Math.min(srcWidth, srcHeight);
  const cropStartX = (srcWidth - cropSize) / 2;
  const cropStartY = (srcHeight - cropSize) / 2;
  const sourceTileSize = cropSize / gridSize;
  const pieces = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const piece = document.createElement("div");
      const index = row * gridSize + col;
      piece.id = `piece-${index}`;
      piece.className = "piece";
      piece.draggable = true;
      piece.dataset.correctIndex = String(index);

      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = TILE_SIZE;
      tileCanvas.height = TILE_SIZE;
      const ctx = tileCanvas.getContext("2d");

      if (!ctx) {
        setStatus("Unable to create puzzle pieces in this browser.", true);
        return;
      }

      ctx.drawImage(
        sourceImage,
        cropStartX + col * sourceTileSize,
        cropStartY + row * sourceTileSize,
        sourceTileSize,
        sourceTileSize,
        0,
        0,
        TILE_SIZE,
        TILE_SIZE
      );

      piece.style.backgroundImage = `url(${tileCanvas.toDataURL("image/png")})`;
      const clipPath = getPieceClipPath(index);
      piece.style.clipPath = clipPath;
      piece.style.webkitClipPath = clipPath;
      piece.style.borderRadius = getShapeMode() === "square" ? "0" : "";

      makePieceDraggable(piece);
      pieces.push(piece);
    }
  }

  shuffleArray(pieces).forEach((piece) => {
    storageArea.appendChild(piece);
  });

  updatePieceCount();
  setStatus(`Puzzle cut into ${gridSize} x ${gridSize} ${shapeMode} pieces, shuffled, and added to Storage.`);
}

function loadImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Please drop or choose an image file.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    sourceImage = new Image();
    sourceImage.onload = () => {
      previewImage.src = sourceImage.src;
      ghostImage.src = sourceImage.src;
      previewImage.style.display = "block";
      previewPlaceholder.style.display = "none";
      resetCelebrationState();
      resetTimer();
      hintVisible = false;
      updateHintVisibility();
      updateUploadDropZoneState();
      setStatus(`Loaded: ${file.name}`);
    };

    sourceImage.src = reader.result;
  };

  reader.readAsDataURL(file);
}

uploadBtn.addEventListener("click", () => {
  imageInput.click();
});

viewBtn.addEventListener("click", () => {
  if (!sourceImage) {
    setStatus("Please upload an image first.", true);
    return;
  }

  hintVisible = !hintVisible;
  updateHintVisibility();
});

successCloseBtn.addEventListener("click", hideSuccessScreen);

difficultySelect.addEventListener("change", () => {
  clearBoard();
  storageArea.innerHTML = "";
  clearCheckHighlights();
  hideSuccessScreen();
  resetCelebrationState();
  resetTimer();
  hintVisible = false;
  updateHintVisibility();
  buildAssemblyGrid();
  updatePieceCount();
  setStatus(`Difficulty set to ${getGridSize()} x ${getGridSize()}. Click Cut into puzzles.`);
});

shapeSelect.addEventListener("change", () => {
  clearBoard();
  storageArea.innerHTML = "";
  clearCheckHighlights();
  hideSuccessScreen();
  resetCelebrationState();
  resetTimer();
  hintVisible = false;
  updateHintVisibility();
  updatePieceCount();
  setStatus(`Shape mode set to ${getShapeMode()}. Click Cut into puzzles.`);
});

uploadMusicBtn.addEventListener("click", () => {
  musicInput.click();
});

musicInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  loadMusicFromFile(file);
});

musicLoopToggle.addEventListener("change", () => {
  if (!musicAudio) {
    return;
  }

  musicAudio.loop = musicLoopToggle.checked;
});

musicToggleBtn.addEventListener("click", () => {
  if (!musicAudio || !musicAudio.src) {
    setStatus("Upload a music file first.", true);
    return;
  }

  if (musicPlaying) {
    musicAudio.pause();
    setStatus("Background music paused.");
    return;
  }

  startBackgroundMusic();
  setStatus("Background music playing.");
});

imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  loadImageFromFile(file);
});

uploadDropZone.addEventListener("click", () => {
  if (!sourceImage) {
    imageInput.click();
  }
});

uploadDropZone.addEventListener("dragover", (event) => {
  if (sourceImage) {
    return;
  }

  event.preventDefault();
  uploadDropZone.classList.add("drag-over");
});

uploadDropZone.addEventListener("dragleave", () => {
  uploadDropZone.classList.remove("drag-over");
});

uploadDropZone.addEventListener("drop", (event) => {
  if (sourceImage) {
    return;
  }

  event.preventDefault();
  uploadDropZone.classList.remove("drag-over");
  const file = event.dataTransfer.files?.[0];
  loadImageFromFile(file);
});

cutBtn.addEventListener("click", createPuzzlePieces);
checkBtn.addEventListener("click", checkPlacedPieces);

buildAssemblyGrid();
makeStorageDroppable();
updatePieceCount();
hideSuccessScreen();
updateHintVisibility();
resizeFireworksCanvas();
window.addEventListener("resize", resizeFireworksCanvas);
updateMusicButtonText();
loadLeaderboard();
updateUploadDropZoneState();
