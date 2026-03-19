const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const DETECTION_INTERVAL_MS = 450;

const videoElement = document.querySelector('#camera');
const emotionElement = document.querySelector('#emotion');
const confidenceElement = document.querySelector('#confidence');
const hintElement = document.querySelector('#hint');
const startButton = document.querySelector('#startButton');
const screenshotButton = document.querySelector('#screenshotButton');
const multiFaceToggleElement = document.querySelector('#multiFaceToggle');
const facesListElement = document.querySelector('#facesList');
const emojiOverlayElement = document.querySelector('#emojiOverlay');
const animalBackgroundElement = document.querySelector('#animalBackground');
const summaryTotalElement = document.querySelector('#summaryTotal');
const summaryJoyElement = document.querySelector('#summaryJoy');
const summarySadnessElement = document.querySelector('#summarySadness');
const summaryNeutralElement = document.querySelector('#summaryNeutral');
const summaryAngerElement = document.querySelector('#summaryAnger');

const EMOJI_BY_EMOTION = {
  joy: new URL('./assets/emojis/joy.svg', import.meta.url).href,
  sadness: new URL('./assets/emojis/sadness.svg', import.meta.url).href,
  neutral: new URL('./assets/emojis/neutral.svg', import.meta.url).href,
  anger: new URL('./assets/emojis/anger.svg', import.meta.url).href,
};

const ANIMAL_BY_EMOTION = {
  joy: new URL('../happymonkey.svg', import.meta.url).href,
  sadness: new URL('../sadpenguin.svg', import.meta.url).href,
  neutral: new URL('../neutralcat.svg', import.meta.url).href,
  anger: new URL('../angrytiger.svg', import.meta.url).href,
};

let detectionTimer = null;
let modelsLoaded = false;
let cameraEnabled = false;
let faceApiLib = null;
let emotionSummary = {
  total: 0,
  joy: 0,
  sadness: 0,
  neutral: 0,
  anger: 0,
};

function resetEmotionSummary() {
  emotionSummary = {
    total: 0,
    joy: 0,
    sadness: 0,
    neutral: 0,
    anger: 0,
  };
  renderEmotionSummary();
}

function renderEmotionSummary() {
  const total = emotionSummary.total;
  const asPercent = (value) => {
    if (!total) {
      return 0;
    }
    return Math.round((value / total) * 100);
  };

  summaryTotalElement.textContent = String(total);
  summaryJoyElement.textContent = String(asPercent(emotionSummary.joy));
  summarySadnessElement.textContent = String(asPercent(emotionSummary.sadness));
  summaryNeutralElement.textContent = String(asPercent(emotionSummary.neutral));
  summaryAngerElement.textContent = String(asPercent(emotionSummary.anger));
}

function updateEmotionSummary(emotionKey) {
  if (!(emotionKey in emotionSummary)) {
    return;
  }

  emotionSummary.total += 1;
  emotionSummary[emotionKey] += 1;
  renderEmotionSummary();
}

async function getFaceApi() {
  if (faceApiLib) {
    return faceApiLib;
  }

  try {
    faceApiLib = await import('@vladmandic/face-api');
    return faceApiLib;
  } catch {
    faceApiLib = await import('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/+esm');
    return faceApiLib;
  }
}

function getDominantEmotion(expressions) {
  const scores = {
    joy: expressions.happy ?? 0,
    sadness: expressions.sad ?? 0,
    neutral: expressions.neutral ?? 0,
    anger: expressions.angry ?? 0,
  };

  const [name, value] = Object.entries(scores).reduce((best, current) => {
    return current[1] > best[1] ? current : best;
  });

  return { name, value };
}

function toDisplayEmotion(emotionKey) {
  const labels = {
    joy: 'Joy',
    sadness: 'Sadness',
    neutral: 'Neutral',
    anger: 'Anger',
  };

  return labels[emotionKey] ?? 'Neutral';
}

function applyTheme(emotionKey) {
  document.body.classList.remove(
    'emotion-joy',
    'emotion-sadness',
    'emotion-neutral',
    'emotion-anger'
  );
  document.body.classList.add(`emotion-${emotionKey}`);
}

function showAnimalForEmotion(emotionKey) {
  const animalAsset = ANIMAL_BY_EMOTION[emotionKey] ?? ANIMAL_BY_EMOTION.neutral;
  animalBackgroundElement.style.setProperty('--animal-image', `url("${animalAsset}")`);
}

function clearAnimalBackground() {
  animalBackgroundElement.style.setProperty('--animal-image', 'none');
}

function clearFacesList() {
  facesListElement.innerHTML = '';
}

function clearEmojiOverlay() {
  emojiOverlayElement.innerHTML = '';
}

function renderEmojiOverlay(faceItems) {
  clearEmojiOverlay();

  if (!faceItems.length || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return;
  }

  const scaleX = videoElement.clientWidth / videoElement.videoWidth;
  const scaleY = videoElement.clientHeight / videoElement.videoHeight;

  faceItems.forEach((item) => {
    const x = item.box.x * scaleX;
    const y = item.box.y * scaleY;
    const marker = document.createElement('img');
    marker.className = 'emoji-marker';
    marker.src = EMOJI_BY_EMOTION[item.emotion] ?? EMOJI_BY_EMOTION.neutral;
    marker.alt = `${toDisplayEmotion(item.emotion)} emoji`;
    marker.style.left = `${Math.max(0, x)}px`;
    marker.style.top = `${Math.max(0, y - 40)}px`;
    emojiOverlayElement.appendChild(marker);
  });
}

function renderFacesList(faceSummaries) {
  if (!faceSummaries.length) {
    clearFacesList();
    return;
  }

  const items = faceSummaries
    .map((face, index) => {
      const confidencePercent = Math.round(face.value * 100);
      return `<li>Face ${index + 1}: ${toDisplayEmotion(face.name)} (${confidencePercent}%)</li>`;
    })
    .join('');

  facesListElement.innerHTML = items;
}

function getAggregateEmotion(detections) {
  const totals = {
    joy: 0,
    sadness: 0,
    neutral: 0,
    anger: 0,
  };

  detections.forEach((detection) => {
    totals.joy += detection.expressions.happy ?? 0;
    totals.sadness += detection.expressions.sad ?? 0;
    totals.neutral += detection.expressions.neutral ?? 0;
    totals.anger += detection.expressions.angry ?? 0;
  });

  const [name, value] = Object.entries(totals).reduce((best, current) => {
    return current[1] > best[1] ? current : best;
  });

  const averagedValue = detections.length ? value / detections.length : 0;
  return { name, value: averagedValue };
}

async function loadModels() {
  if (modelsLoaded) {
    return;
  }

  const faceapi = await getFaceApi();
  hintElement.textContent = 'Loading emotion models...';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

async function startCamera() {
  if (!window.isSecureContext) {
    throw new Error('Camera requires a secure context. Run this app on localhost or HTTPS.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 960 },
      height: { ideal: 540 },
    },
    audio: false,
  });

  videoElement.srcObject = stream;

  await new Promise((resolve) => {
    videoElement.onloadedmetadata = resolve;
  });

  await videoElement.play();
}

async function detectEmotion() {
  if (!videoElement.srcObject) {
    return;
  }

  const faceapi = await getFaceApi();
  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
  const isMultiFaceMode = multiFaceToggleElement.checked;

  if (isMultiFaceMode) {
    const results = await faceapi.detectAllFaces(videoElement, detectorOptions).withFaceExpressions();

    if (!results.length) {
      emotionElement.textContent = 'No face detected';
      confidenceElement.textContent = 'Confidence: --';
      hintElement.textContent = 'No faces detected. Move faces into the frame.';
      clearFacesList();
      clearEmojiOverlay();
      clearAnimalBackground();
      applyTheme('neutral');
      return;
    }

    const faceSummaries = results.map((result) => getDominantEmotion(result.expressions));
    const faceItems = results.map((result) => {
      const dominant = getDominantEmotion(result.expressions);
      return { box: result.detection.box, emotion: dominant.name };
    });
    const aggregate = getAggregateEmotion(results);
    const confidencePercent = `${Math.round(aggregate.value * 100)}%`;

    emotionElement.textContent = `${toDisplayEmotion(aggregate.name)} (${results.length} faces)`;
    confidenceElement.textContent = `Confidence: ${confidencePercent}`;
    hintElement.textContent = 'Multi-face mode active.';
    renderFacesList(faceSummaries);
    renderEmojiOverlay(faceItems);
    updateEmotionSummary(aggregate.name);
    showAnimalForEmotion(aggregate.name);
    applyTheme(aggregate.name);
    return;
  }

  const result = await faceapi.detectSingleFace(videoElement, detectorOptions).withFaceExpressions();

  if (!result) {
    emotionElement.textContent = 'No face detected';
    confidenceElement.textContent = 'Confidence: --';
    hintElement.textContent = 'Center your face in the camera frame.';
    clearFacesList();
    clearEmojiOverlay();
    clearAnimalBackground();
    applyTheme('neutral');
    return;
  }

  const dominant = getDominantEmotion(result.expressions);
  const confidencePercent = `${Math.round(dominant.value * 100)}%`;

  emotionElement.textContent = toDisplayEmotion(dominant.name);
  confidenceElement.textContent = `Confidence: ${confidencePercent}`;
  hintElement.textContent = 'Detection is running live.';
  clearFacesList();
  renderEmojiOverlay([{ box: result.detection.box, emotion: dominant.name }]);
  updateEmotionSummary(dominant.name);
  showAnimalForEmotion(dominant.name);
  applyTheme(dominant.name);
}

function startDetectionLoop() {
  if (detectionTimer) {
    clearInterval(detectionTimer);
  }

  detectionTimer = setInterval(() => {
    detectEmotion().catch((error) => {
      hintElement.textContent = `Detection error: ${error.message}`;
    });
  }, DETECTION_INTERVAL_MS);
}

function stopDetectionLoop() {
  if (!detectionTimer) {
    return;
  }

  clearInterval(detectionTimer);
  detectionTimer = null;
}

function stopCamera() {
  const stream = videoElement.srcObject;
  if (!stream) {
    return;
  }

  // Stop all media tracks so webcam light turns off immediately.
  stream.getTracks().forEach((track) => track.stop());
  videoElement.pause();
  videoElement.srcObject = null;
}

async function enableCamera() {
  startButton.disabled = true;
  startButton.textContent = 'Starting...';

  try {
    resetEmotionSummary();
    await startCamera();
    hintElement.textContent = 'Camera started. Loading emotion model...';

    await loadModels();
    startDetectionLoop();
    cameraEnabled = true;
    hintElement.textContent = 'Camera active. Move naturally for better emotion detection.';
    startButton.textContent = 'Disable Camera';
    startButton.disabled = false;
  } catch (error) {
    cameraEnabled = false;
    startButton.disabled = false;
    startButton.textContent = 'Enable Camera';
    hintElement.textContent = `Unable to start: ${error.message}`;
  }
}

function disableCamera() {
  stopDetectionLoop();
  stopCamera();
  cameraEnabled = false;
  emotionElement.textContent = 'Neutral';
  confidenceElement.textContent = 'Confidence: --';
  clearFacesList();
  clearEmojiOverlay();
  clearAnimalBackground();
  hintElement.textContent = 'Camera disabled. Click Enable Camera to start again.';
  applyTheme('neutral');
  startButton.textContent = 'Enable Camera';
  resetEmotionSummary();
}

function takeScreenshot() {
  if (!videoElement.srcObject || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    hintElement.textContent = 'Start the camera before taking a screenshot.';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    hintElement.textContent = 'Screenshot failed: could not create image context.';
    return;
  }

  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `emotion-screenshot-${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  hintElement.textContent = 'Screenshot saved.';
}

multiFaceToggleElement.addEventListener('change', () => {
  clearFacesList();

  if (cameraEnabled) {
    hintElement.textContent = multiFaceToggleElement.checked
      ? 'Multi-face mode enabled.'
      : 'Single-face mode enabled.';
  }
});

startButton.addEventListener('click', async () => {
  if (cameraEnabled) {
    disableCamera();
    return;
  }

  await enableCamera();
});

screenshotButton.addEventListener('click', () => {
  takeScreenshot();
});

// Initialize default theme visuals, including neutral animal background.
applyTheme('neutral');
clearAnimalBackground();
