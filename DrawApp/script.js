const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const toolPicker = document.getElementById("toolPicker");
const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const sizeValue = document.getElementById("sizeValue");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const clearGalleryBtn = document.getElementById("clearGalleryBtn");
const toolStatus = document.getElementById("toolStatus");
const galleryEmpty = document.getElementById("galleryEmpty");
const galleryList = document.getElementById("galleryList");

let drawing = false;
let tool = toolPicker.value;
let color = colorPicker.value;
let size = Number(sizePicker.value);
let startPoint = null;
let lastPoint = null;
let baseSnapshot = null;

const history = [];
let historyIndex = -1;
const maxHistory = 50;
const maxGalleryItems = 24;
const galleryStorageKey = "drawApp.gallery";
let galleryItems = [];

const toolNames = {
  brush: "Brush",
  eraser: "Eraser",
  fill: "Fill",
  line: "Line",
  rectangle: "Rectangle",
  circle: "Circle"
};

function updateToolStatus() {
  toolStatus.textContent = `Mode: ${toolNames[tool] || "Brush"}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function persistGallery() {
  localStorage.setItem(galleryStorageKey, JSON.stringify(galleryItems));
}

function updateGalleryEmptyState() {
  galleryEmpty.hidden = galleryItems.length > 0;
}

function renderGallery() {
  galleryList.innerHTML = "";

  galleryItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    const image = document.createElement("img");
    image.className = "gallery-thumb";
    image.src = item.dataUrl;
    image.alt = `Saved drawing ${item.id}`;

    const meta = document.createElement("div");
    meta.className = "gallery-meta";

    const date = document.createElement("p");
    date.className = "gallery-date";
    date.textContent = formatDate(item.createdAt);

    const actions = document.createElement("div");
    actions.className = "gallery-actions";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "secondary";
    loadButton.textContent = "Load";
    loadButton.addEventListener("click", () => {
      loadGalleryItem(item.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removeGalleryItem(item.id);
    });

    actions.append(loadButton, deleteButton);
    meta.append(date, actions);
    card.append(image, meta);
    galleryList.append(card);
  });

  updateGalleryEmptyState();
}

function readGalleryFromStorage() {
  try {
    const raw = localStorage.getItem(galleryStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    galleryItems = parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.dataUrl === "string")
      .slice(0, maxGalleryItems);
  } catch {
    galleryItems = [];
  }
}

function saveCurrentToGallery() {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const newItem = {
    id,
    createdAt: Date.now(),
    dataUrl: canvas.toDataURL("image/png")
  };

  galleryItems.unshift(newItem);
  galleryItems = galleryItems.slice(0, maxGalleryItems);
  persistGallery();
  renderGallery();
}

function drawImageToCanvas(dataUrl) {
  const image = new Image();
  image.onload = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, rect.width, rect.height);
    saveHistorySnapshot();
  };
  image.src = dataUrl;
}

function loadGalleryItem(id) {
  const item = galleryItems.find((entry) => entry.id === id);
  if (!item) return;
  drawImageToCanvas(item.dataUrl);
}

function removeGalleryItem(id) {
  galleryItems = galleryItems.filter((item) => item.id !== id);
  persistGallery();
  renderGallery();
}

function clearEntireGallery() {
  if (galleryItems.length === 0) return;
  const confirmed = window.confirm("Delete all saved drawings from the gallery?");
  if (!confirmed) return;

  galleryItems = [];
  persistGallery();
  renderGallery();
}

function updateHistoryButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
}

function saveHistorySnapshot() {
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }

  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (history.length > maxHistory) {
    history.shift();
  }
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function resetHistoryToCurrent() {
  history.length = 0;
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  historyIndex = 0;
  updateHistoryButtons();
}

function restoreHistory(newIndex) {
  if (newIndex < 0 || newIndex >= history.length) return;
  historyIndex = newIndex;
  ctx.putImageData(history[historyIndex], 0, 0);
  updateHistoryButtons();
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const hasCanvasContent = canvas.width > 0 && canvas.height > 0;
  let snapshot = null;

  // Keep current drawing when resizing for responsiveness.
  if (hasCanvasContent) {
    snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);
  }

  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (snapshot) {
    ctx.drawImage(snapshot, 0, 0, rect.width, rect.height);
  }

  // Resizing changes pixel dimensions, so reset undo history to a fresh baseline.
  resetHistoryToCurrent();
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function floodFillAt(point) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const startX = Math.floor(point.x * scaleX);
  const startY = Math.floor(point.y * scaleY);

  if (startX < 0 || startY < 0 || startX >= canvas.width || startY >= canvas.height) {
    return false;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const startIndex = (startY * width + startX) * 4;

  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  const fillColor = hexToRgb(color);
  const fillR = fillColor.r;
  const fillG = fillColor.g;
  const fillB = fillColor.b;
  const fillA = 255;

  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
    return false;
  }

  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) {
      continue;
    }

    const index = (y * width + x) * 4;
    const matchesTarget =
      data[index] === targetR &&
      data[index + 1] === targetG &&
      data[index + 2] === targetB &&
      data[index + 3] === targetA;

    if (!matchesTarget) {
      continue;
    }

    data[index] = fillR;
    data[index + 1] = fillG;
    data[index + 2] = fillB;
    data[index + 3] = fillA;

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
  return true;
}

function applyToolStyle() {
  ctx.lineWidth = size;
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }
}

function drawLine(from, to) {
  applyToolStyle();
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawShape(toolMode, from, to) {
  applyToolStyle();

  if (toolMode === "line") {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    return;
  }

  if (toolMode === "rectangle") {
    const x = Math.min(from.x, to.x);
    const y = Math.min(from.y, to.y);
    const w = Math.abs(to.x - from.x);
    const h = Math.abs(to.y - from.y);
    ctx.strokeRect(x, y, w, h);
    return;
  }

  if (toolMode === "circle") {
    const radius = Math.hypot(to.x - from.x, to.y - from.y);
    ctx.beginPath();
    ctx.arc(from.x, from.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function startDrawing(event) {
  event.preventDefault();

  if (tool === "fill") {
    const pos = getPointerPosition(event);
    const changed = floodFillAt(pos);
    if (changed) {
      saveHistorySnapshot();
    }
    return;
  }

  drawing = true;
  canvas.setPointerCapture(event.pointerId);

  const pos = getPointerPosition(event);
  startPoint = pos;
  lastPoint = pos;
  baseSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (tool === "brush" || tool === "eraser") {
    drawLine(pos, pos);
  }
}

function draw(event) {
  if (!drawing) return;
  event.preventDefault();

  const pos = getPointerPosition(event);

  if (tool === "brush" || tool === "eraser") {
    drawLine(lastPoint, pos);
    lastPoint = pos;
    return;
  }

  ctx.putImageData(baseSnapshot, 0, 0);
  drawShape(tool, startPoint, pos);
}

function stopDrawing(event) {
  if (!drawing) return;

  if (event) {
    event.preventDefault();
  }

  if (tool === "line" || tool === "rectangle" || tool === "circle") {
    const endPoint = event ? getPointerPosition(event) : lastPoint;
    ctx.putImageData(baseSnapshot, 0, 0);
    drawShape(tool, startPoint, endPoint);
  }

  drawing = false;
  startPoint = null;
  lastPoint = null;
  baseSnapshot = null;
  saveHistorySnapshot();
}

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

toolPicker.addEventListener("input", (event) => {
  tool = event.target.value;
  updateToolStatus();
});

colorPicker.addEventListener("input", (event) => {
  color = event.target.value;
});

sizePicker.addEventListener("input", (event) => {
  size = Number(event.target.value);
  sizeValue.textContent = `${size}px`;
});

undoBtn.addEventListener("click", () => {
  restoreHistory(historyIndex - 1);
});

redoBtn.addEventListener("click", () => {
  restoreHistory(historyIndex + 1);
});

clearBtn.addEventListener("click", () => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveHistorySnapshot();
});

saveBtn.addEventListener("click", () => {
  saveCurrentToGallery();
});

clearGalleryBtn.addEventListener("click", () => {
  clearEntireGallery();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const withCommand = event.ctrlKey || event.metaKey;
  if (!withCommand || event.altKey) return;

  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    restoreHistory(historyIndex - 1);
    return;
  }

  if (key === "y" || (key === "z" && event.shiftKey)) {
    event.preventDefault();
    restoreHistory(historyIndex + 1);
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
updateToolStatus();
readGalleryFromStorage();
renderGallery();
