// --- PAUSE LOGIC ---
let paused = false;
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', togglePause);

function togglePause() {
  if (!paused) {
    paused = true;
    showPauseOverlay();
    if (window.saveProgress) window.saveProgress();
  } else {
    paused = false;
    hidePauseOverlay();
  }
}

function showPauseOverlay() {
  if (document.getElementById('pauseOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.className = 'pause-overlay';
  overlay.innerHTML = `
    <div class="pause-menu">
      <h2>Game Paused</h2>
      <div class="pause-menu-buttons">
        <button id="resumeBtn" class="action action-primary">Resume</button>
        <button id="restartBtnPause" class="action">Restart</button>
        <button id="mainMenuBtn" class="action">Main Menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('resumeBtn').onclick = togglePause;
  document.getElementById('restartBtnPause').onclick = function() {
    hidePauseOverlay();
    if (typeof resetGame === 'function') resetGame();
    if (typeof startGame === 'function') startGame();
  };
  document.getElementById('mainMenuBtn').onclick = function() {
    hidePauseOverlay();
    // Show main menu UI if you have one, or reload page as fallback
    window.location.reload();
  };
}

function hidePauseOverlay() {
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.remove();
}

// Pause with Escape key
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') togglePause();
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- SVG SPRITE LOADING ---
const carSprites = {
  player: loadSprite('../maincar.svg'),
  gray: loadSprite('../graycar.svg'),
  green: loadSprite('../greencar.svg'),
  orange: loadSprite('../orangecar.svg'),
  red: loadSprite('../redcar.svg'),
  truck: loadSprite('../truck.svg')
};

function loadSprite(filename) {
  const img = new window.Image();
  img.src = filename;
  return img;
}

function drawCarSprite(img, x, y, width, height, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) {
    ctx.scale(1, -1);
    ctx.drawImage(img, -width / 2, -height / 2, width, height * -1);
  } else {
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
  }
  ctx.restore();
}

const scoreValue = document.getElementById('scoreValue');
const levelValue = document.getElementById('levelValue');
const targetValue = document.getElementById('targetValue');
const speedValue = document.getElementById('speedValue');
const bestValue = document.getElementById('bestValue');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const postLevelActions = document.getElementById('postLevelActions');
const replayLevelBtn = document.getElementById('replayLevelBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const levelSelect = document.getElementById('levelSelect');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const boostBtn = document.getElementById('boostBtn');
const themeOptions = document.getElementById('themeOptions');

const themes = {
  neon: {
    skyTop: '#0f1f40',
    skyBottom: '#0a0f24',
    road: '#23263b',
    lane: '#00d8ff',
    player: '#00ffcb',
    obstacle: '#ff5c77',
    pickup: '#ffd166'
  },
  desert: {
    skyTop: '#8d5b2a',
    skyBottom: '#2b1c15',
    road: '#4d4038',
    lane: '#ffd6a2',
    player: '#70ffbf',
    obstacle: '#ff8a5b',
    pickup: '#ffe066'
  },
  arctic: {
    skyTop: '#385a7a',
    skyBottom: '#151f2f',
    road: '#2c3d56',
    lane: '#b7edff',
    player: '#8ff5ff',
    obstacle: '#f86ca7',
    pickup: '#fff0a8'
  }
};

const LEVELS = [
  { targetScore: 500, spawnBase: 1.05, spawnMin: 0.34, trafficSpeed: 1.05, truckChance: 0.06, speedGrowth: 5, maxSpeed: 380 },
  { targetScore: 1000, spawnBase: 0.95, spawnMin: 0.3, trafficSpeed: 1.15, truckChance: 0.08, speedGrowth: 6, maxSpeed: 400 },
  { targetScore: 1500, spawnBase: 0.85, spawnMin: 0.27, trafficSpeed: 1.25, truckChance: 0.1, speedGrowth: 7, maxSpeed: 420 },
  { targetScore: 2000, spawnBase: 0.75, spawnMin: 0.24, trafficSpeed: 1.35, truckChance: 0.12, speedGrowth: 8, maxSpeed: 440 },
  { targetScore: 2500, spawnBase: 0.67, spawnMin: 0.2, trafficSpeed: 1.5, truckChance: 0.14, speedGrowth: 9, maxSpeed: 465 }
];

const LEVEL_FINISH_BUFFER = 100;

const state = {
  running: false,
  over: false,
  betweenLevels: false,
  finishingLevel: false,
  finishStage: 'none',
  finishBoostVelocity: 0,
  levelStartScore: 0,
  completedLevel: 0,
  pendingNextLevel: 0,
  levelScore: 0,
  score: 0,
  best: Number(localStorage.getItem('roadPulseBest')) || 0,
  speed: 220,
  laneOffset: 0,
  spawnTimer: 0,
  pickupTimer: 0,
  boostTimer: 0,
  theme: 'neon',
  zoom: 0.7,
  level: 1,
  selectedStartLevel: 1,
  laneIndex: 2,
  won: false,
  keys: {
    boost: false
  },
  player: {
    x: canvas.width / 2,
    y: canvas.height - 90,
    baseY: canvas.height - 90,
    width: 48,
    height: 82
  },
  obstacles: [],

  pickups: []
};

// Load progress after player name is set
window.state = state;
window.addEventListener('DOMContentLoaded', function() {
  if (window.loadProgress) window.loadProgress();
});

// Save progress on win or level complete
const origWinGame = winGame;
winGame = function() {
  origWinGame.apply(this, arguments);
  if (window.saveProgress) window.saveProgress();
};

const origOpenLevelCompleteMenu = openLevelCompleteMenu;
openLevelCompleteMenu = function() {
  origOpenLevelCompleteMenu.apply(this, arguments);
  // Save progress after level completion
  if (window.saveProgress) window.saveProgress();
  // Set selectedStartLevel to last completed level for resume
  if (window.state && window.state.completedLevel > 0) {
    window.state.selectedStartLevel = window.state.completedLevel;
    if (window.saveProgress) window.saveProgress();
  }
};

function resetGame(startLevel = state.selectedStartLevel) {
  const normalizedStartLevel = Math.max(1, Math.min(LEVELS.length, startLevel));

  state.running = false;
  state.over = false;
  state.won = false;
  state.betweenLevels = false;
  state.finishingLevel = false;
  state.finishStage = 'none';
  state.finishBoostVelocity = 0;
  state.levelStartScore = 0;
  // Do NOT reset completedLevel here, so progress is preserved
  state.pendingNextLevel = 0;
  state.levelScore = 0;
  state.score = 0;
  state.level = normalizedStartLevel;
  state.speed = 220 + (state.level - 1) * 18;
  state.laneOffset = 0;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.boostTimer = 0;
  state.laneIndex = 2;
  state.obstacles = [];
  state.pickups = [];
  state.player.x = getLaneCenters()[state.laneIndex];
  state.player.y = state.player.baseY;
  postLevelActions.classList.add('hidden');
  startBtn.disabled = false;
  restartBtn.disabled = true;
  updateHud();
}

function startGame() {
  resetGame(state.selectedStartLevel);
  state.running = true;
  state.betweenLevels = false;
  state.levelStartScore = state.score;
  startBtn.disabled = true;
  restartBtn.disabled = false;
}

function startNextLevel() {
  const nextLevel = state.pendingNextLevel;
  if (nextLevel <= 0) {
    return;
  }

  state.level = nextLevel;
  state.levelScore = 0;
  state.levelStartScore = state.score;
  state.speed = Math.max(state.speed, 220 + (state.level - 1) * 18);
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.boostTimer = 0;
  state.laneOffset = 0;
  state.obstacles = [];
  state.pickups = [];
  state.laneIndex = 2;
  state.player.x = getLaneCenters()[state.laneIndex];
  state.player.y = state.player.baseY;
  state.running = true;
  state.betweenLevels = false;
  state.won = false;
  state.finishingLevel = false;
  state.finishStage = 'none';
  state.finishBoostVelocity = 0;
  state.completedLevel = 0; // Reset so next level always uses pendingNextLevel
  state.pendingNextLevel = 0;
  postLevelActions.classList.add('hidden');
  startBtn.disabled = true;
  restartBtn.disabled = false;
  updateHud();
}

function restartCurrentLevel() {
  if (state.completedLevel <= 0) {
    return;
  }

  state.score = state.levelStartScore;
  state.level = state.completedLevel;
  state.levelScore = 0;
  state.speed = 220 + (state.level - 1) * 18;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.boostTimer = 0;
  state.laneOffset = 0;
  state.obstacles = [];
  state.pickups = [];
  state.laneIndex = 2;
  state.player.x = getLaneCenters()[state.laneIndex];
  state.player.y = state.player.baseY;
  state.running = true;
  state.over = false;
  state.won = false;
  state.betweenLevels = false;
  state.finishingLevel = false;
  state.finishStage = 'none';
  state.finishBoostVelocity = 0;
  state.pendingNextLevel = 0;
  postLevelActions.classList.add('hidden');
  startBtn.disabled = true;
  restartBtn.disabled = false;
  updateHud();
}

function gameOver() {
  state.running = false;
  state.over = true;
  state.won = false;
  state.betweenLevels = false;
  state.finishingLevel = false;
  state.finishStage = 'none';
  triggerScreenShake(); // <-- Shake on crash
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('roadPulseBest', String(state.best));
  }
  updateHud();
  startBtn.disabled = false;
}

function winGame() {
  state.running = false;
  state.over = false;
  state.won = true;
  state.betweenLevels = false;
  state.finishingLevel = false;
  state.finishStage = 'none';
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('roadPulseBest', String(state.best));
  }
  updateHud();
  startBtn.disabled = false;
}

function openLevelCompleteMenu() {
  const isLastLevel = state.level >= LEVELS.length;

  state.running = false;
  state.over = false;
  state.won = isLastLevel;
  state.betweenLevels = true;
  state.finishingLevel = false;
  state.finishStage = 'none';
  state.finishBoostVelocity = 0;
  state.completedLevel = state.level;
  // Only set pendingNextLevel if not already set (prevents repeated increment)
  if (!state.pendingNextLevel || state.pendingNextLevel <= state.level) {
    state.pendingNextLevel = isLastLevel ? 0 : state.level + 1;
  }
  state.obstacles = [];
  state.pickups = [];
  state.laneIndex = 2;
  state.player.x = getLaneCenters()[state.laneIndex];
  state.player.y = state.player.baseY;

  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('roadPulseBest', String(state.best));
  }

  nextLevelBtn.classList.toggle('hidden', isLastLevel);
  postLevelActions.classList.remove('hidden');
  startBtn.disabled = true;
  restartBtn.disabled = true;
  updateHud();
}

function getCurrentLevelConfig() {
  return LEVELS[state.level - 1];
}

function checkLevelProgress() {
  openLevelCompleteMenu();
}

function startLevelFinishSequence() {
  if (state.finishingLevel || !state.running) {
    return;
  }

  const levelConfig = getCurrentLevelConfig();
  const remaining = Math.max(0, levelConfig.targetScore - state.levelScore);
  if (remaining > 0) {
    state.levelScore += remaining;
    state.score += remaining;
  }

  state.finishingLevel = true;
  state.finishStage = 'clearing';
  state.finishBoostVelocity = 0;
  state.keys.boost = false;
}

function updateFinishSequence(dt, levelConfig) {
  const laneCenters = getLaneCenters();
  const centerX = laneCenters[2];

  if (state.finishStage === 'clearing') {
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = state.obstacles[i];
      obstacle.y += state.speed * levelConfig.trafficSpeed * dt;
      obstacle.alpha = Math.max(0, (obstacle.alpha ?? 1) - dt * 2.2);
      if (obstacle.alpha <= 0 || obstacle.y > canvas.height + 120) {
        state.obstacles.splice(i, 1);
      }
    }

    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.y += (state.speed - 30) * dt;
      pickup.alpha = Math.max(0, (pickup.alpha ?? 1) - dt * 2.4);
      if (pickup.alpha <= 0 || pickup.y > canvas.height + 50) {
        state.pickups.splice(i, 1);
      }
    }

    if (state.obstacles.length === 0 && state.pickups.length === 0) {
      state.finishStage = 'centering';
    }
  }

  if (state.finishStage === 'centering') {
    const centerSpeed = 9;
    state.player.x += (centerX - state.player.x) * Math.min(1, centerSpeed * dt);
    state.player.y += (state.player.baseY - state.player.y) * Math.min(1, centerSpeed * dt);

    if (Math.abs(state.player.x - centerX) < 2 && Math.abs(state.player.y - state.player.baseY) < 2) {
      state.player.x = centerX;
      state.player.y = state.player.baseY;
      state.finishStage = 'boosting';
      state.finishBoostVelocity = 0;
    }
  }

  if (state.finishStage === 'boosting') {
    state.finishBoostVelocity += 1200 * dt;
    state.player.y -= state.finishBoostVelocity * dt;
    state.speed = Math.min(state.speed + 140 * dt, levelConfig.maxSpeed + 230);

    if (state.player.y < -state.player.height - 40) {
      checkLevelProgress();
    }
  }
}

function updateHud() {
  scoreValue.textContent = `${Math.floor(state.score)} (${Math.floor(state.levelScore)})`;
  levelValue.textContent = state.level;
  targetValue.textContent = getCurrentLevelConfig().targetScore;
  speedValue.textContent = Math.floor(state.speed / 10);
  bestValue.textContent = state.best;
}

function getRoadBounds() {
  const roadWidth = canvas.width * 0.46;
  const roadX = (canvas.width - roadWidth) / 2;
  return { roadX, roadWidth };
}

function getLaneCenters() {
  const { roadX, roadWidth } = getRoadBounds();
  return [
    roadX + roadWidth * 0.1,
    roadX + roadWidth * 0.3,
    roadX + roadWidth * 0.5,
    roadX + roadWidth * 0.7,
    roadX + roadWidth * 0.9
  ];
}

function moveLane(direction) {
  const laneCenters = getLaneCenters();
  state.laneIndex = Math.max(0, Math.min(laneCenters.length - 1, state.laneIndex + direction));
}

function randomLaneX() {
  const lanes = getLaneCenters();
  return lanes[Math.floor(Math.random() * lanes.length)];
}

function canSpawnInLane(laneIndex, minTopSpacing = 240) {
  return !state.obstacles.some((obstacle) => obstacle.laneIndex === laneIndex && obstacle.y < minTopSpacing);
}

function getDangerBlockedLanes(extraLaneIndex = null) {
  const lookAheadDistance = 300 + state.level * 28;
  const blockedLanes = new Set();

  for (const obstacle of state.obstacles) {
    const obstacleTop = obstacle.y - obstacle.height / 2;
    const obstacleBottom = obstacle.y + obstacle.height / 2;
    const zoneTop = state.player.y - lookAheadDistance;
    const zoneBottom = state.player.y + state.player.height * 0.55;
    const overlapsDangerZone = obstacleBottom > zoneTop && obstacleTop < zoneBottom;
    if (overlapsDangerZone) {
      blockedLanes.add(obstacle.laneIndex);
    }
  }

  if (extraLaneIndex !== null) {
    blockedLanes.add(extraLaneIndex);
  }

  return blockedLanes;
}

function keepsEscapeLane(laneIndex) {
  const laneCount = getLaneCenters().length;
  const blockedLanes = getDangerBlockedLanes(laneIndex);
  const openLaneCount = laneCount - blockedLanes.size;

  // Higher levels can run with one open lane, lower levels keep two for fairness.
  const minOpenLanes = state.level >= 4 ? 1 : 2;
  return openLaneCount >= minOpenLanes;
}

function pickSpawnLane() {
  const laneCount = getLaneCenters().length;
  const candidateLanes = [];
  const minTopSpacing = 220 + state.speed * 0.22;
  for (let i = 0; i < laneCount; i += 1) {
    if (canSpawnInLane(i, minTopSpacing)) {
      candidateLanes.push(i);
    }
  }

  const fairLanes = candidateLanes.filter((laneIndex) => keepsEscapeLane(laneIndex));
  if (fairLanes.length > 0) {
    return fairLanes[Math.floor(Math.random() * fairLanes.length)];
  }

  if (candidateLanes.length === 0) {
    return Math.floor(Math.random() * laneCount);
  }

  return candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
}

function resolveTrafficSpacing() {
  const laneCount = getLaneCenters().length;
  const laneGroups = Array.from({ length: laneCount }, () => []);

  for (const obstacle of state.obstacles) {
    laneGroups[obstacle.laneIndex].push(obstacle);
  }

  for (const laneObstacles of laneGroups) {
    laneObstacles.sort((a, b) => b.y - a.y);
    for (let i = 1; i < laneObstacles.length; i += 1) {
      const front = laneObstacles[i - 1];
      const back = laneObstacles[i];
      const minGap = front.height / 2 + back.height / 2 + 18;
      const maxBackY = front.y - minGap;
      if (back.y > maxBackY) {
        back.y = maxBackY;
      }
    }
  }
}

function spawnObstacle(truckChance, trafficSpeed) {
  const isTruck = Math.random() < truckChance;
  const laneCenters = getLaneCenters();
  const height = isTruck ? 126 : 78;
  const extraSpawnOffset = 44 + state.speed * trafficSpeed * 0.34;

  // Prevent staircase: don't spawn in a lane if an adjacent lane has an obstacle within yDist
  const yDist = 120; // Minimum vertical distance between adjacent-lane obstacles
  let candidateLanes = [];
  for (let laneIndex = 0; laneIndex < laneCenters.length; laneIndex++) {
    let adjacentBlocked = false;
    for (const obstacle of state.obstacles) {
      if (Math.abs(obstacle.laneIndex - laneIndex) === 1) {
        // Check vertical overlap
        const obsY = obstacle.y;
        if (Math.abs(obsY + obstacle.height / 2 - (-height - extraSpawnOffset - height / 2)) < yDist) {
          adjacentBlocked = true;
          break;
        }
      }
    }
    if (!adjacentBlocked) {
      candidateLanes.push(laneIndex);
    }
  }

  // Fallback: if all lanes are blocked, allow any lane
  if (candidateLanes.length === 0) {
    candidateLanes = Array.from({ length: laneCenters.length }, (_, i) => i);
  }
  // Pick a fair lane from candidates
  let fairLanes = candidateLanes.filter((laneIndex) => keepsEscapeLane(laneIndex));
  let chosenLane = null;
  if (fairLanes.length > 0) {
    chosenLane = fairLanes[Math.floor(Math.random() * fairLanes.length)];
  } else {
    chosenLane = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
  }

  // Assign sprite
  let sprite = null;
  if (isTruck) {
    sprite = carSprites.truck;
  } else {
    const keys = ['gray', 'green', 'orange', 'red'];
    sprite = carSprites[keys[Math.floor(Math.random() * keys.length)]];
  }

  state.obstacles.push({
    x: laneCenters[chosenLane],
    y: -height - extraSpawnOffset,
    width: isTruck ? 72 : 46,
    height,
    type: isTruck ? 'truck' : 'car',
    laneIndex: chosenLane,
    alpha: 1,
    sprite
  });
}

function spawnPickup() {
  const laneCenters = getLaneCenters();
  const laneIndex = Math.floor(Math.random() * laneCenters.length);
  state.pickups.push({
    x: laneCenters[laneIndex],
    y: -60,
    radius: 18,
    alpha: 1
  });
}

function intersectsRect(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function intersectsCircleRect(circle, rect) {
  const cx = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
  const cy = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

// drawCar and drawTruck replaced by drawCarSprite

function drawRoad(dt) {
  const theme = themes[state.theme];
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { roadX, roadWidth } = getRoadBounds();
  ctx.fillStyle = theme.road;
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  state.laneOffset += state.speed * dt;
  if (state.laneOffset > 80) {
    state.laneOffset = 0;
  }

  ctx.strokeStyle = theme.lane;
  ctx.lineWidth = 5;
  ctx.setLineDash([22, 20]);
  ctx.lineDashOffset = -state.laneOffset;
  for (let i = 1; i < 5; i += 1) {
    const laneX = roadX + (roadWidth / 5) * i;
    ctx.beginPath();
    ctx.moveTo(laneX, 0);
    ctx.lineTo(laneX, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function update(dt) {
  if (!state.running) {
    return;
  }

  const levelConfig = getCurrentLevelConfig();

  if (!state.finishingLevel && state.levelScore >= levelConfig.targetScore - LEVEL_FINISH_BUFFER) {
    startLevelFinishSequence();
  }

  if (state.finishingLevel) {
    updateFinishSequence(dt, levelConfig);
    state.laneOffset += state.speed * dt;
    if (state.laneOffset > 80) {
      state.laneOffset = 0;
    }
    updateHud();
    return;
  }

  const laneCenters = getLaneCenters();
  const targetX = laneCenters[state.laneIndex];
  const laneSnapSpeed = 16;
  state.player.x += (targetX - state.player.x) * Math.min(1, laneSnapSpeed * dt);

  const boostActive = state.keys.boost && state.boostTimer > 0;
  if (boostActive) {
    state.speed += 25 * dt;
    state.boostTimer -= dt;
  } else {
    state.speed += levelConfig.speedGrowth * dt;
  }

  state.speed = Math.min(levelConfig.maxSpeed, state.speed);

  state.spawnTimer += dt;
  if (state.spawnTimer > Math.max(levelConfig.spawnMin, levelConfig.spawnBase - state.speed / 520)) {
    spawnObstacle(levelConfig.truckChance, levelConfig.trafficSpeed);
    state.spawnTimer = 0;
  }

  state.pickupTimer += dt;
  if (state.pickupTimer > 3.4) {
    spawnPickup();
    state.pickupTimer = 0;
  }

  // Shrink player hitbox for fairness
  const playerRect = {
    x: state.player.x,
    y: state.player.y,
    width: state.player.width * 0.8,
    height: state.player.height * 0.8
  };

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];
    obstacle.y += state.speed * levelConfig.trafficSpeed * dt;
  }

  resolveTrafficSpacing();

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];

    if (obstacle.y > canvas.height + 120) {
      state.obstacles.splice(i, 1);
      state.score += 10;
      state.levelScore += 10;
      continue;
    }

    // Shrink obstacle hitbox: cars 60%, trucks 80%
    const isTruck = obstacle.type === 'truck';
    const hitboxScale = isTruck ? 0.8 : 0.6;
    const obstacleRect = {
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width * hitboxScale,
      height: obstacle.height * hitboxScale
    };

    if (intersectsRect(playerRect, obstacleRect)) {
      gameOver();
      return;
    }
  }

  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    pickup.y += (state.speed - 30) * dt;

    if (pickup.y > canvas.height + 40) {
      state.pickups.splice(i, 1);
      continue;
    }

    if (intersectsCircleRect(pickup, playerRect)) {
      state.pickups.splice(i, 1);
      state.score += 30;
      state.levelScore += 30;
      state.boostTimer = Math.min(4, state.boostTimer + 1.8);
    }
  }

  const passiveScore = dt * (state.speed / 8);
  state.score += passiveScore;
  state.levelScore += passiveScore;
  updateHud();
}

function draw() {
  const theme = themes[state.theme];
  const { roadX, roadWidth } = getRoadBounds();

  ctx.save();
  ctx.beginPath();
  ctx.rect(roadX, 0, roadWidth, canvas.height);
  ctx.clip();

  for (const obstacle of state.obstacles) {
    ctx.globalAlpha = obstacle.alpha ?? 1;
    if (obstacle.type === 'truck') {
      drawCarSprite(carSprites.truck, obstacle.x, obstacle.y, obstacle.width, obstacle.height, true);
    } else {
      drawCarSprite(obstacle.sprite || carSprites.gray, obstacle.x, obstacle.y, obstacle.width, obstacle.height, true);
    }
    ctx.globalAlpha = 1;
  }

  for (const pickup of state.pickups) {
    ctx.globalAlpha = pickup.alpha ?? 1;
    ctx.beginPath();
    ctx.fillStyle = theme.pickup;
    ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawCarSprite(carSprites.player, state.player.x, state.player.y, state.player.width, state.player.height);
  ctx.restore();

  if (state.finishingLevel) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px "Bebas Neue", sans-serif';
    ctx.fillText(`Level ${state.level} Complete`, canvas.width / 2, canvas.height * 0.3);
  }

  if (!state.running) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Bebas Neue", sans-serif';
    const title = state.won
      ? 'Victory!'
      : state.over
        ? 'Crash!'
        : state.betweenLevels
          ? `Level ${state.completedLevel || state.level} Complete`
          : 'Road Pulse';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '600 20px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#d6ecff';
    const hint = state.won
      ? 'Final level complete. Choose Restart Level'
      : state.betweenLevels
        ? 'Choose Restart Level or Next Level'
      : state.over
        ? 'Press Restart to jump back in'
        : 'Press Start Run and dodge traffic';
    ctx.fillText(hint, canvas.width / 2, canvas.height / 2 + 28);
  }

  if (state.boostTimer > 0 && state.running) {
    const w = 220;
    const h = 14;
    const x = canvas.width - w - 18;
    const y = 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x, y, w * (state.boostTimer / 4), h);
  }
}

let last = performance.now();
function loop(now) {
  if (paused) {
    last = now;
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(
    state.zoom,
    0,
    0,
    state.zoom,
    canvas.width * (1 - state.zoom) / 2,
    canvas.height * (1 - state.zoom) / 2
  );

  drawRoad(dt);
  update(dt);
  draw();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  requestAnimationFrame(loop);
}

function setTheme(themeKey) {
  state.theme = themeKey;
  document.querySelectorAll('.theme-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === themeKey);
  });
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (state.betweenLevels) {
    if (key === 'r') {
      restartCurrentLevel();
      return;
    }
    if (key === 'n' && state.pendingNextLevel > 0) {
      startNextLevel();
      return;
    }
  }

  if (key === 'r') {
    startGame();
    return;
  }

  if (!state.running && !state.over && !state.won && !state.betweenLevels) {
    startGame();
  }

  if (!event.repeat && (event.key === 'ArrowLeft' || key === 'a')) {
    moveLane(-1);
  }
  if (!event.repeat && (event.key === 'ArrowRight' || key === 'd')) {
    moveLane(1);
  }
  if (event.key === 'Shift') {
    state.keys.boost = true;
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    state.keys.boost = false;
  }
});

function bindHoldButton(button, onDown, onUp) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onDown();
  });
  button.addEventListener('pointerup', onUp);
  button.addEventListener('pointerleave', onUp);
  button.addEventListener('pointercancel', onUp);
}

leftBtn.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  moveLane(-1);
});

rightBtn.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  moveLane(1);
});

bindHoldButton(boostBtn, () => {
  state.keys.boost = true;
}, () => {
  state.keys.boost = false;
});

startBtn.addEventListener('click', () => {
  startGame();
});
restartBtn.addEventListener('click', startGame);
replayLevelBtn.addEventListener('click', restartCurrentLevel);
nextLevelBtn.addEventListener('click', startNextLevel);

themeOptions.addEventListener('click', (event) => {
  const button = event.target.closest('.theme-btn');
  if (!button) {
    return;
  }
  setTheme(button.dataset.theme);
});

levelSelect.addEventListener('change', () => {
  const selectedLevel = Number(levelSelect.value);
  if (!Number.isNaN(selectedLevel)) {
    state.selectedStartLevel = Math.max(1, Math.min(LEVELS.length, selectedLevel));
  }
});

bestValue.textContent = state.best;
levelSelect.value = String(state.selectedStartLevel);
setTheme(state.theme);
updateHud();
requestAnimationFrame(loop);
