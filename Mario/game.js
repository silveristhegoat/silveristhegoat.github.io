const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  coins: document.getElementById("coins"),
  lives: document.getElementById("lives"),
  time: document.getElementById("time"),
  combo: document.getElementById("combo"),
  status: document.getElementById("statusText"),
  statsText: document.getElementById("statsText"),
  overlay: document.getElementById("overlay"),
  modeHint: document.getElementById("modeHint"),
  achievementSummary: document.getElementById("achievementSummary"),
  achievementsList: document.getElementById("achievementsList"),
  leaderboardSummary: document.getElementById("leaderboardSummary"),
  leaderboardList: document.getElementById("leaderboardList"),
  classicModeButton: document.getElementById("classicModeButton"),
  infiniteModeButton: document.getElementById("infiniteModeButton"),
  ghostToggleButton: document.getElementById("ghostToggleButton"),
  startButton: document.getElementById("startButton"),
  restartButton: document.getElementById("restartButton")
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 48;
const GRAVITY = 2200;
const MOVE_SPEED = 340;
const JUMP_SPEED = 1030;
const MAX_FALL_SPEED = 1200;
const LEVEL_TIME = 400;
const COIN_POP_DURATION = 0.55;
const COMBO_TIMEOUT = 8;
const DASH_SPEED = 700;
const DASH_DISTANCE = 700;
const DASH_DURATION = DASH_DISTANCE / DASH_SPEED;
const DASH_COOLDOWN = 2.5;
const YOSHI_WIDTH = TILE * 0.88;
const YOSHI_HEIGHT = TILE * 1.0;
const YOSHI_SHELL_WIDTH = TILE * 0.9;
const YOSHI_SHELL_HEIGHT = TILE * 0.58;
const ACHIEVEMENT_STORAGE_KEY = "classic-plumber-run-achievements";
const HIGH_SCORES_STORAGE_KEY = "classic-plumber-run-high-scores";
const GHOST_REPLAY_STORAGE_KEY = "classic-plumber-run-ghost-replays";
const SKIN_STORAGE_KEY = "classic-plumber-run-skins";
const SELECTED_SKIN_STORAGE_KEY = "classic-plumber-run-selected-skin";
const HIGH_SCORE_LIMIT = 5;
const GHOST_SAMPLE_INTERVAL = 0.05;
const MUSHROOM_BLOCK_CHANCE = 0.1;

const ACHIEVEMENTS = [
  {
    id: "zero_score_classic",
    title: "Blank Slate",
    description: "Reach the classic flag before earning any points.",
    statusText: "Complete the classic run with 0 score."
  },
  {
    id: "no_coin_classic",
    title: "Coinless",
    description: "Finish classic mode without collecting a coin.",
    statusText: "Complete the classic run with 0 coins."
  },
  {
    id: "combo_triple",
    title: "Chain Reaction",
    description: "Reach combo x3 in a single run.",
    statusText: "Hit a x3 combo."
  },
  {
    id: "question_hunter",
    title: "Block Inspector",
    description: "Hit 5 question blocks in one run.",
    statusText: "Hit 5 question blocks in one run."
  },
  {
    id: "infinite_5000",
    title: "Long Haul",
    description: "Score 5000 points in Infinite mode.",
    statusText: "Reach 5000 score in Infinite mode."
  }
];

const SKINS = [
  {
    id: "classic",
    title: "Classic",
    unlockText: "Default",
    filter: "none",
    fallback: { cap: "#d94b33", skin: "#f3cc9f", overalls: "#2f5dbe", boots: "#653621", eyes: "#1f140d" }
  },
  {
    id: "fire",
    title: "Fire",
    unlockText: "Unlock: Reach 3000 points in any recorded run",
    filter: "hue-rotate(-30deg) saturate(1.25) brightness(1.08)",
    fallback: { cap: "#ffffff", skin: "#f4d0b0", overalls: "#e0422f", boots: "#8f3521", eyes: "#1f140d" }
  },
  {
    id: "forest",
    title: "Forest",
    unlockText: "Unlock: Earn the Block Inspector achievement",
    filter: "hue-rotate(85deg) saturate(1.05) brightness(0.95)",
    fallback: { cap: "#2f7f3f", skin: "#efc39f", overalls: "#5b3dbf", boots: "#4f2f1e", eyes: "#1f140d" }
  },
  {
    id: "midnight",
    title: "Midnight",
    unlockText: "Unlock: Earn the Long Haul achievement",
    filter: "hue-rotate(210deg) saturate(1.35) brightness(0.82)",
    fallback: { cap: "#1f2b66", skin: "#cfb091", overalls: "#1f6c9d", boots: "#35261a", eyes: "#101010" }
  }
];

const keys = new Set();
const screenShake = { intensity: 0, duration: 0, elapsed: 0 };
// 0 = sunrise/day, 0.5 = sunset/dusk, cycles 0→1 over DAY_CYCLE_DURATION seconds
const DAY_CYCLE_DURATION = 120;
let dayNightTime = 0;
const unlockedAchievements = loadAchievements();
const highScores = loadHighScores();
const ghostReplays = loadGhostReplays();
const unlockedSkins = loadSkins();
let game = null;
let lastFrame = 0;
let selectedMode = "classic";
let selectedSkinId = loadSelectedSkin();
let ghostReplayEnabled = true;

const marioSprite = new Image();
marioSprite.src = "mario.svg";

const marioJumpSprite = new Image();
marioJumpSprite.src = "mariojump.svg";

const goombaSprite = new Image();
goombaSprite.src = "goomba.svg";

const goombaStompedSprite = new Image();
goombaStompedSprite.src = "goombastomped.svg";

const yoshiSprite = new Image();
yoshiSprite.src = "yoshi.svg";

const yoshiShellSprite = new Image();
yoshiShellSprite.src = "yoshishell.svg";

const mushroomSprite = new Image();
mushroomSprite.src = "mushroom.svg";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatCounter(value, size) {
  return String(Math.max(0, Math.floor(value))).padStart(size, "0");
}

function setYoshiShellState(enemy, shellActive) {
  if (!enemy || enemy.type !== "yoshi" || enemy.shellActive === shellActive) {
    return;
  }

  const bottom = enemy.y + enemy.height;
  const center = enemy.x + enemy.width / 2;
  enemy.shellActive = shellActive;
  enemy.width = shellActive ? YOSHI_SHELL_WIDTH : YOSHI_WIDTH;
  enemy.height = shellActive ? YOSHI_SHELL_HEIGHT : YOSHI_HEIGHT;
  enemy.x = center - enemy.width / 2;
  enemy.y = bottom - enemy.height;
}

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAchievements() {
  try {
    localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(unlockedAchievements));
  } catch {
    // Ignore storage failures so gameplay still works.
  }
}

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHighScores() {
  try {
    localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(highScores));
  } catch {
    // Ignore storage failures so gameplay still works.
  }
}

function loadGhostReplays() {
  try {
    const raw = localStorage.getItem(GHOST_REPLAY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      classic: parsed?.classic ?? null,
      infinite: null
    };
  } catch {
    return { classic: null, infinite: null };
  }
}

function saveGhostReplays() {
  try {
    localStorage.setItem(GHOST_REPLAY_STORAGE_KEY, JSON.stringify(ghostReplays));
  } catch {
    // Ignore storage failures so gameplay still works.
  }
}

function trimReplayFramesForMode(mode, frames) {
  if (!Array.isArray(frames) || frames.length < 2) {
    return [];
  }

  const valid = frames.filter((frame) => Number.isFinite(frame.t));
  if (valid.length < 2) {
    return [];
  }

  if (mode !== "classic") {
    return [];
  }

  const base = valid[0].t;
  return valid.map((frame) => ({ ...frame, t: frame.t - base }));
}

function saveRunGhostReplay(mode) {
  if (mode !== "classic") {
    return;
  }

  const frames = trimReplayFramesForMode(mode, game.runReplayFrames);
  if (frames.length < 2) {
    return;
  }

  const duration = frames[frames.length - 1].t;
  ghostReplays[mode] = {
    mode,
    duration,
    frames
  };
  saveGhostReplays();
}

function sampleGhostFrame(replay, playbackTime) {
  const frames = replay?.frames;
  if (!frames || frames.length === 0) {
    return null;
  }
  if (playbackTime <= frames[0].t) {
    return frames[0];
  }

  const last = frames[frames.length - 1];
  if (playbackTime >= last.t) {
    return last;
  }

  for (let i = 1; i < frames.length; i += 1) {
    const prev = frames[i - 1];
    const next = frames[i];
    if (playbackTime > next.t) {
      continue;
    }

    const span = Math.max(0.0001, next.t - prev.t);
    const alpha = (playbackTime - prev.t) / span;
    return {
      x: prev.x + (next.x - prev.x) * alpha,
      y: prev.y + (next.y - prev.y) * alpha,
      direction: alpha < 0.5 ? prev.direction : next.direction,
      onGround: alpha < 0.5 ? prev.onGround : next.onGround,
      vy: prev.vy + (next.vy - prev.vy) * alpha,
      width: prev.width,
      height: prev.height
    };
  }

  return last;
}

function recordGhostFrame(dt) {
  if (!game || game.state !== "playing") {
    return;
  }

  if (game.mode !== "classic") {
    return;
  }

  game.ghostSampleAccumulator += dt;
  if (game.ghostSampleAccumulator < GHOST_SAMPLE_INTERVAL) {
    return;
  }
  game.ghostSampleAccumulator = 0;

  const player = game.player;
  game.runReplayFrames.push({
    t: game.stats.runSeconds,
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
    direction: player.direction,
    onGround: player.onGround,
    vy: player.vy
  });
}

function startGhostPlaybackForCurrentGame() {
  if (!ghostReplayEnabled || game.mode !== "classic") {
    game.ghostPlayback = null;
    return;
  }

  const replay = ghostReplays[game.mode];
  if (!replay?.frames?.length) {
    game.ghostPlayback = null;
    return;
  }

  game.ghostPlayback = {
    replay,
    time: 0,
    active: true
  };
}

function refreshGhostToggleButton() {
  if (!ui.ghostToggleButton) {
    return;
  }
  ui.ghostToggleButton.textContent = `Ghost: ${ghostReplayEnabled ? "On" : "Off"}`;
}

function setGhostReplayEnabled(enabled, announce = false) {
  ghostReplayEnabled = enabled;
  if (!ghostReplayEnabled && game?.ghostPlayback) {
    game.ghostPlayback.active = false;
  }
  refreshGhostToggleButton();
  if (announce) {
    ui.status.textContent = ghostReplayEnabled ? "Ghost replay enabled." : "Ghost replay stopped.";
  }
}

function loadSkins() {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const safe = parsed && typeof parsed === "object" ? parsed : {};
    safe.classic = true;
    return safe;
  } catch {
    return { classic: true };
  }
}

function saveSkins() {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(unlockedSkins));
  } catch {
    // Ignore storage failures so gameplay still works.
  }
}

function loadSelectedSkin() {
  try {
    return localStorage.getItem(SELECTED_SKIN_STORAGE_KEY) || "classic";
  } catch {
    return "classic";
  }
}

function saveSelectedSkin() {
  try {
    localStorage.setItem(SELECTED_SKIN_STORAGE_KEY, selectedSkinId);
  } catch {
    // Ignore storage failures so gameplay still works.
  }
}

function hasHighScoreAtLeast(points) {
  return highScores.some((entry) => Number.isFinite(entry.score) && entry.score >= points);
}

function isSkinUnlockMet(skinId) {
  switch (skinId) {
    case "classic":
      return true;
    case "fire":
      return hasHighScoreAtLeast(3000);
    case "forest":
      return !!unlockedAchievements.question_hunter;
    case "midnight":
      return !!unlockedAchievements.infinite_5000;
    default:
      return false;
  }
}

function getSkinById(skinId) {
  return SKINS.find((skin) => skin.id === skinId) || SKINS[0];
}

function getActiveSkin() {
  if (!unlockedSkins[selectedSkinId]) {
    selectedSkinId = "classic";
  }
  return getSkinById(selectedSkinId);
}

function syncSkinUnlocks(announce = false) {
  const newlyUnlocked = [];
  for (const skin of SKINS) {
    if (unlockedSkins[skin.id]) {
      continue;
    }
    if (!isSkinUnlockMet(skin.id)) {
      continue;
    }
    unlockedSkins[skin.id] = true;
    newlyUnlocked.push(skin.title);
  }

  if (!unlockedSkins.classic) {
    unlockedSkins.classic = true;
  }

  if (!unlockedSkins[selectedSkinId]) {
    selectedSkinId = "classic";
    saveSelectedSkin();
  }

  if (newlyUnlocked.length > 0) {
    saveSkins();
    if (announce) {
      ui.status.textContent = `New skin unlocked: ${newlyUnlocked.join(", ")}`;
    }
  }
}

function formatModeLabel(mode) {
  return mode === "infinite" ? "Infinite" : "Classic";
}

function renderHighScores() {
  ui.leaderboardSummary.textContent = `Top ${HIGH_SCORE_LIMIT} runs`;
  ui.leaderboardList.replaceChildren();

  if (highScores.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No runs recorded yet.";
    ui.leaderboardList.append(empty);
    return;
  }

  for (const entry of highScores) {
    const item = document.createElement("li");
    const score = document.createElement("strong");
    score.className = "leaderboard-score";
    score.textContent = `${formatCounter(entry.score, 6)} pts`;

    const meta = document.createElement("span");
    meta.className = "leaderboard-meta";
    meta.textContent = `${formatModeLabel(entry.mode)} • ${entry.outcome}`;

    item.append(score, meta);
    ui.leaderboardList.append(item);
  }
}

function recordHighScore(score, mode, outcome) {
  if (!Number.isFinite(score) || score < 0) {
    return;
  }

  highScores.push({ score: Math.floor(score), mode, outcome, recordedAt: Date.now() });
  highScores.sort((left, right) => right.score - left.score || right.recordedAt - left.recordedAt);
  highScores.splice(HIGH_SCORE_LIMIT);
  saveHighScores();
  renderHighScores();
  syncSkinUnlocks(true);
}

function renderAchievements() {
  if (!ui.achievementSummary || !ui.achievementsList) {
    return;
  }

  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlockedAchievements[achievement.id]).length;
  ui.achievementSummary.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} unlocked`;
  ui.achievementsList.replaceChildren();

  for (const achievement of ACHIEVEMENTS) {
    const item = document.createElement("li");
    if (unlockedAchievements[achievement.id]) {
      item.classList.add("unlocked");
    }

    const title = document.createElement("strong");
    title.className = "achievement-title";
    title.textContent = achievement.title;

    const copy = document.createElement("span");
    copy.className = "achievement-copy";
    copy.textContent = achievement.description;

    const state = document.createElement("span");
    state.className = "achievement-state";
    state.textContent = unlockedAchievements[achievement.id] ? "Unlocked" : "Locked";

    item.append(title, copy, state);
    ui.achievementsList.append(item);
  }
}

function unlockAchievement(id) {
  if (unlockedAchievements[id]) {
    return;
  }

  const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
  if (!achievement) {
    return;
  }

  unlockedAchievements[id] = true;
  saveAchievements();
  renderAchievements();
  syncSkinUnlocks(true);
  ui.status.textContent = `Achievement unlocked: ${achievement.title}`;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function makeSolid(x, y, width, height, type = "ground") {
  return { x, y, width, height, type };
}

function buildLevel(mode = "classic") {
  const isInfinite = mode === "infinite";
  const worldWidth = isInfinite ? TILE * 2000 : TILE * 120;
  const groundY = HEIGHT - TILE * 1.5;

  const level = {
    width: worldWidth,
    height: HEIGHT,
    groundY,
    solids: [],
    coins: [],
    mushrooms: [],
    coinPops: [],
    enemies: [],
    decoClouds: [],
    movingPlatforms: [],
    flag: isInfinite ? null : { x: TILE * 112, y: groundY - TILE * 9, width: 26, height: TILE * 9 },
    finishTrigger: null,
    castle: isInfinite ? null : { x: TILE * 115.25, y: groundY - TILE * 2.5, width: TILE * 2.5, height: TILE * 2.5 }
  };

  if (!isInfinite && level.flag) {
    level.finishTrigger = {
      x: level.flag.x - 20,
      y: -HEIGHT,
      width: 64,
      height: level.groundY + HEIGHT
    };
  }

  function addBricks(blocks, offsetX = 0) {
    for (const [tileX, tileY] of blocks) {
      level.solids.push(makeSolid((tileX + offsetX) * TILE, groundY - tileY * TILE, TILE, TILE, "brick"));
    }
  }

  function addQuestionBlocks(blocks, offsetX = 0) {
    for (const [tileX, tileY] of blocks) {
      level.solids.push({
        ...makeSolid((tileX + offsetX) * TILE, groundY - tileY * TILE, TILE, TILE, "question"),
        used: false,
        bump: 0
      });
    }
  }

  function addGroundSegments(segments, offsetX = 0) {
    for (const [start, length] of segments) {
      level.solids.push(
        makeSolid((start + offsetX) * TILE, groundY, length * TILE, HEIGHT - groundY, "ground")
      );
    }
  }

  function addStaircase(startX, steps, mirrored = false, offsetX = 0) {
    for (let index = 0; index < steps; index += 1) {
      const columnX = startX + offsetX + index;
      const columnHeight = mirrored ? steps - index : index + 1;
      for (let stepHeight = 0; stepHeight < columnHeight; stepHeight += 1) {
        level.solids.push(
          makeSolid(
            columnX * TILE,
            groundY - (stepHeight + 1) * TILE,
            TILE,
            TILE,
            "stair"
          )
        );
      }
    }
  }

  function addMovingPlatform(x, y, widthTiles, speed, rangeMin, rangeMax, axis = "h") {
    const plat = {
      x, y,
      width: widthTiles * TILE,
      height: Math.round(TILE * 0.42),
      type: "platform",
      speed,
      dir: 1,
      axis,
      rangeMin,
      rangeMax
    };
    level.movingPlatforms.push(plat);
    level.solids.push(plat);
  }

  let enemySpawns = [];

  function getSpawnCandidate(tileX, type = "goomba") {
    if (type === "yoshi") {
      return {
        type: "yoshi",
        shellActive: false,
        x: tileX * TILE,
        y: groundY - TILE * 1.0,
        width: YOSHI_WIDTH,
        height: YOSHI_HEIGHT,
        vx: 110 + Math.random() * 50,
        vy: 0,
        alive: true,
        dir: Math.random() > 0.5 ? 1 : -1,
        stompedTimer: 0
      };
    }
    return {
      type: "goomba",
      x: tileX * TILE,
      y: groundY - TILE * 0.8,
      width: TILE * 0.78,
      height: TILE * 0.8,
      vx: 80 + Math.random() * 45,
      vy: 0,
      alive: true,
      dir: Math.random() > 0.5 ? 1 : -1,
      stompedTimer: 0
    };
  }

  function isSafeEnemySpawn(enemy) {
    for (const solid of level.solids) {
      if (!rectsOverlap(enemy, solid)) {
        continue;
      }

      if (solid.type === "ground" && enemy.y + enemy.height <= solid.y + 1) {
        continue;
      }

      return false;
    }

    const supportProbe = {
      x: enemy.x + enemy.width * 0.2,
      y: enemy.y + enemy.height + 2,
      width: enemy.width * 0.6,
      height: 2
    };
    return level.solids.some((solid) => rectsOverlap(supportProbe, solid));
  }

  if (!isInfinite) {
    const groundSegments = [
      [0, 14],
      [16, 8],
      [26, 24],
      [52, 25],
      [79, 20],
      [99, 15],
      [115, 5]
    ];

    addGroundSegments(groundSegments);

    addBricks([
      [8, 5], [10, 5],
      [18, 5], [21, 5],
      [44, 5], [47, 5],
      [58, 5], [60, 5],
      [73, 5], [76, 5]
    ]);

    addQuestionBlocks([
      [9, 5],
      [19, 5], [20, 5],
      [45, 5], [46, 5],
      [59, 5],
      [74, 5], [75, 5],
      [105, 5]
    ]);

    const stairSets = [
      { startX: 37, steps: 4, mirrored: false },
      { startX: 66, steps: 5, mirrored: false },
      { startX: 86, steps: 4, mirrored: false },
      { startX: 92, steps: 4, mirrored: true },
      { startX: 101, steps: 6, mirrored: false }
    ];

    for (const stair of stairSets) {
      addStaircase(stair.startX, stair.steps, stair.mirrored);
    }

    addMovingPlatform(TILE * 14, groundY - TILE * 3, 2, 70, TILE * 12, TILE * 18);
    addMovingPlatform(TILE * 24, groundY - TILE * 3, 2, 70, TILE * 22, TILE * 28);
    addMovingPlatform(TILE * 77, groundY - TILE * 3, 2, 65, TILE * 75, TILE * 82);

    enemySpawns = [
      {tileX:7,type:"goomba"}, {tileX:18,type:"goomba"},
      {tileX:30,type:"yoshi"}, {tileX:42,type:"goomba"},
      {tileX:54,type:"goomba"}, {tileX:61,type:"yoshi"},
      {tileX:70,type:"goomba"}, {tileX:83,type:"goomba"},
      {tileX:96,type:"yoshi"}, {tileX:108,type:"goomba"}
    ];
  } else {
    const totalTiles = Math.floor(worldWidth / TILE);
    addGroundSegments([[0, 6]]);

    const templates = [
      {
        length: 22,
        ground: [[0, 10], [12, 10]],
        bricks: [[4, 5], [6, 5], [9, 5], [11, 5]],
        questions: [[5, 5], [10, 5]],
        stairs: [
          { startX: 14, steps: 4, mirrored: false },
          { startX: 18, steps: 4, mirrored: true }
        ],
        enemies: [{tileX:6,type:"goomba"},{tileX:17,type:"goomba"}]
      },
      {
        length: 22,
        ground: [[0, 3], [5, 17]],
        bricks: [[3, 5], [5, 5], [7, 5], [9, 5]],
        questions: [[4, 5], [8, 5]],
        stairs: [{ startX: 13, steps: 5, mirrored: false }],
        platforms: [{ tileX: 1, tileY: 3, widthTiles: 2, speed: 70, rangeMin: 0, rangeMax: 3 }],
        enemies: [{tileX:5,type:"yoshi"},{tileX:13,type:"goomba"}]
      },
      {
        length: 24,
        ground: [[0, 8], [10, 14]],
        bricks: [[4, 5], [6, 5], [9, 5], [11, 5]],
        questions: [[5, 5], [10, 5]],
        stairs: [
          { startX: 15, steps: 4, mirrored: false },
          { startX: 20, steps: 4, mirrored: true }
        ],
        enemies: [{tileX:10,type:"goomba"},{tileX:22,type:"goomba"}]
      },
      {
        length: 20,
        ground: [[0, 4], [6, 14]],
        bricks: [[4, 5], [6, 5], [8, 5], [10, 5]],
        questions: [[5, 5], [9, 5]],
        stairs: [{ startX: 13, steps: 6, mirrored: false }],
        platforms: [{ tileX: 2, tileY: 3, widthTiles: 2, speed: 80, rangeMin: 1, rangeMax: 4 }],
        enemies: [{tileX:4,type:"goomba"},{tileX:16,type:"yoshi"}]
      },
      {
        length: 26,
        ground: [[0, 9], [11, 15]],
        bricks: [[3, 5], [5, 5], [7, 5], [19, 5], [21, 5], [23, 5]],
        questions: [[4, 5], [6, 5], [20, 5], [22, 5]],
        stairs: [
          { startX: 12, steps: 5, mirrored: false },
          { startX: 17, steps: 5, mirrored: true }
        ],
        enemies: [{tileX:8,type:"goomba"},{tileX:15,type:"yoshi"},{tileX:24,type:"goomba"}]
      }
    ];

    const shuffle = (array) => {
      const clone = [...array];
      for (let index = clone.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
      }
      return clone;
    };

    let cursor = 6;
    let bag = shuffle(templates);
    while (cursor < totalTiles - 28) {
      if (bag.length === 0) {
        bag = shuffle(templates);
      }

      const template = bag.pop();
      addGroundSegments(template.ground, cursor);
      addBricks(template.bricks, cursor);
      addQuestionBlocks(template.questions, cursor);
      for (const stair of template.stairs) {
        addStaircase(stair.startX, stair.steps, stair.mirrored, cursor);
      }
      for (const plat of template.platforms ?? []) {
        addMovingPlatform(
          (plat.tileX + cursor) * TILE,
          groundY - plat.tileY * TILE,
          plat.widthTiles,
          plat.speed,
          (plat.rangeMin + cursor) * TILE,
          (plat.rangeMax + cursor) * TILE
        );
      }
      for (const spawnEntry of template.enemies) {
        const etx = typeof spawnEntry === "number" ? spawnEntry : spawnEntry.tileX;
        const etype = typeof spawnEntry === "object" ? spawnEntry.type : "goomba";
        enemySpawns.push({ tileX: cursor + etx, type: etype });
      }

      cursor += template.length;
    }
  }

  for (const spawn of enemySpawns) {
    const spawnTileX = typeof spawn === "number" ? spawn : spawn.tileX;
    const spawnType = typeof spawn === "object" ? spawn.type : "goomba";
    let spawnEnemy = null;
    const offsets = [0, -1, 1, -2, 2];

    for (const offset of offsets) {
      const candidate = getSpawnCandidate(spawnTileX + offset, spawnType);
      if (isSafeEnemySpawn(candidate)) {
        spawnEnemy = candidate;
        break;
      }
    }

    if (spawnEnemy) {
      level.enemies.push(spawnEnemy);
    }
  }

  const cloudCount = isInfinite ? 70 : 14;
  for (let index = 0; index < cloudCount; index += 1) {
    level.decoClouds.push({
      x: index * TILE * 8 + 70 + Math.random() * 80,
      y: 30 + Math.random() * 120,
      size: 0.8 + Math.random() * 0.8
    });
  }

  if (!isInfinite) {
    const questionBlocks = level.solids.filter((solid) => solid.type === "question");
    if (questionBlocks.length > 0) {
      const guaranteedIndex = Math.floor(Math.random() * questionBlocks.length);
      questionBlocks[guaranteedIndex].guaranteedMushroom = true;
    }
  }

  return level;
}

function createGame(mode = "classic") {
  const isInfinite = mode === "infinite";
  return {
    mode,
    state: "ready",
    cameraX: 0,
    score: 0,
    coins: 0,
    lives: isInfinite ? 1 : 3,
    comboCount: 0,
    comboTimeLeft: 0,
    timeLeft: isInfinite ? Number.POSITIVE_INFINITY : LEVEL_TIME,
    level: buildLevel(mode),
    stats: {
      questionBlocksHit: 0,
      stompCount: 0,
      maxCombo: 0,
      dashesUsed: 0,
      runSeconds: 0
    },
    runReplayFrames: [],
    ghostSampleAccumulator: 0,
    ghostPlayback: null,
    player: {
      x: TILE * 2,
      y: HEIGHT - TILE * 4,
      width: TILE * 0.72,
      height: TILE * 1.08,
      vx: 0,
      vy: 0,
      onGround: false,
      jumpBuffer: 0,
      coyote: 0,
      direction: 1,
      invulnerable: 0,
      safetyMushroom: false,
      safetyFlash: 0,
      dashReady: true,
      dashActive: false,
      dashTimer: 0,
      dashDirection: 1,
      dashCooldown: 0
    }
  };
}

function resetWorld(keepScore = false, mode = game?.mode ?? selectedMode) {
  const prevScore = game?.score ?? 0;
  const prevCoins = game?.coins ?? 0;
  const prevLives = game?.lives ?? (mode === "infinite" ? 1 : 3);
  game = createGame(mode);

  if (keepScore) {
    game.score = prevScore;
    game.coins = prevCoins;
    game.lives = prevLives;
  }

  updateHud();
}

function setMode(mode) {
  selectedMode = mode;
  ui.classicModeButton.classList.toggle("active", mode === "classic");
  ui.infiniteModeButton.classList.toggle("active", mode === "infinite");
  ui.modeHint.textContent = mode === "infinite"
    ? "Infinite mode: 1 life, no timer, run ends on death."
    : "Classic mode: 3 lives and level timer.";
}

function showIntroOverlay(statusText = "Press Start Run") {
  game.state = "ready";
  ui.status.textContent = statusText;
  setMode(game.mode);
  syncSkinUnlocks(false);
  showOverlay("Level 1-1", {
    title: game.mode === "infinite" ? "Survive as long as possible" : "Reach the flag",
    body: game.mode === "infinite"
      ? "You only have one life in Infinite mode. Survive, stack combos, and keep scoring."
      : "Collect coins, stomp the patrols, and cross the course before the timer runs out."
  }, "Start Run");
}

function startGame() {
  if (!game) {
    resetWorld();
  }

  if (game.state === "won") {
    resetWorld();
  }

  game.state = "playing";
  if (game.runReplayFrames.length === 0) {
    game.runReplayFrames.push({
      t: 0,
      x: game.player.x,
      y: game.player.y,
      width: game.player.width,
      height: game.player.height,
      direction: game.player.direction,
      onGround: game.player.onGround,
      vy: game.player.vy
    });
  }
  startGhostPlaybackForCurrentGame();
  ui.overlay.classList.add("hidden");
  ui.status.textContent = "Run to the flag.";
}

function showOverlay(title, description, buttonLabel, statsSummary = "") {
  const heading = ui.overlay.querySelector("h2");
  const paragraph = ui.overlay.querySelector("p:nth-of-type(2)");
  ui.overlay.querySelector(".overlay-kicker").textContent = title;
  heading.textContent = description.title;
  paragraph.textContent = description.body;
  if (ui.statsText) {
    if (statsSummary) {
      ui.statsText.textContent = statsSummary;
      ui.statsText.classList.remove("hidden");
    } else {
      ui.statsText.textContent = "";
      ui.statsText.classList.add("hidden");
    }
  }
  ui.startButton.textContent = buttonLabel;
  ui.overlay.classList.remove("hidden");
}

function buildRunStatsSummary(snapshot) {
  const seconds = Math.floor(snapshot.stats.runSeconds);
  return [
    `Run Stats`,
    `Score: ${formatCounter(snapshot.score, 6)}   Coins: ${formatCounter(snapshot.coins, 2)}`,
    `Stomps: ${snapshot.stats.stompCount}   Blocks Hit: ${snapshot.stats.questionBlocksHit}`,
    `Dashes: ${snapshot.stats.dashesUsed}   Max Combo: x${snapshot.stats.maxCombo}`,
    `Time Survived: ${seconds}s`
  ].join("\n");
}

function updateHud() {
  ui.score.textContent = formatCounter(game.score, 6);
  ui.coins.textContent = formatCounter(game.coins, 2);
  ui.lives.textContent = formatCounter(game.lives, 2);
  ui.time.textContent = Number.isFinite(game.timeLeft) ? formatCounter(game.timeLeft, 3) : "INF";
  if (game.comboCount > 0 && game.comboTimeLeft > 0) {
    ui.combo.textContent = `x${game.comboCount} ${game.comboTimeLeft.toFixed(1)}s`;
  } else {
    ui.combo.textContent = "x0";
  }
}

function addScore(points) {
  game.score += points;
  if (game.mode === "infinite" && game.score >= 5000) {
    unlockAchievement("infinite_5000");
  }
  updateHud();
}

function awardCoin(points = 100, useComboMultiplier = false) {
  const multiplier = useComboMultiplier ? Math.max(1, game.comboCount) : 1;
  game.coins += 1;
  addScore(points * multiplier);
  if (game.coins % 25 === 0) {
    game.lives += 1;
  }
  updateHud();
}

function registerCombo(actionLabel) {
  if (game.comboTimeLeft > 0) {
    game.comboCount += 1;
  } else {
    game.comboCount = 1;
  }

  game.comboTimeLeft = COMBO_TIMEOUT;
  game.stats.maxCombo = Math.max(game.stats.maxCombo, game.comboCount);
  if (game.comboCount >= 3) {
    unlockAchievement("combo_triple");
  }
  ui.status.textContent = `${actionLabel} Combo x${game.comboCount}`;
  updateHud();
}

function checkClassicFinishAchievements() {
  if (game.mode !== "classic") {
    return;
  }

  if (game.score === 0) {
    unlockAchievement("zero_score_classic");
  }

  if (game.coins === 0) {
    unlockAchievement("no_coin_classic");
  }
}

function triggerShake(intensity = 6, duration = 0.25) {
  screenShake.intensity = Math.max(screenShake.intensity, intensity);
  screenShake.duration = duration;
  screenShake.elapsed = 0;
}

function spawnCoinPop(solid) {
  game.level.coinPops.push({
    x: solid.x + solid.width / 2,
    baseY: solid.y + 6,
    width: TILE * 0.45,
    height: TILE * 0.45,
    elapsed: 0,
    duration: COIN_POP_DURATION
  });
}

function loseLife(reason) {
  const isFalling = reason.includes("fell");
  if (game.player.safetyMushroom && !isFalling) {
    game.player.safetyMushroom = false;
    game.player.safetyFlash = 1.2;
    game.player.invulnerable = Math.max(game.player.invulnerable, 1.3);
    triggerShake(5, 0.25);
    ui.status.textContent = "Safety mushroom saved you!";
    return;
  }

  if (game.mode === "classic") {
    saveRunGhostReplay("classic");
  }

  game.lives -= 1;
  if (game.lives <= 0) {
    const runSnapshot = {
      mode: game.mode,
      score: game.score,
      coins: game.coins,
      stats: { ...game.stats }
    };
    const finalScore = game.score;
    const wasInfinite = game.mode === "infinite";
    recordHighScore(finalScore, game.mode, wasInfinite ? "Run Over" : "Game Over");
    resetWorld(false, game.mode);
    game.state = "ready";
    ui.status.textContent = wasInfinite ? `Run ended. Final score: ${finalScore}` : reason;
    showOverlay("Game Over", {
      title: wasInfinite ? "Infinite Run Over" : "Out of lives",
      body: wasInfinite
        ? `You lost your only life. Final score: ${formatCounter(finalScore, 6)}.`
        : "Reset the course and try a cleaner run."
    }, "Play Again", buildRunStatsSummary(runSnapshot));
    return;
  }

  resetWorld(true);
  game.state = "ready";
  ui.status.textContent = reason;
  showOverlay("Try Again", {
    title: "You dropped the run",
    body: "Start again from the checkpoint at the beginning of the stage."
  }, "Resume");
}

function resolvePlayerVsSolids(player, dt) {
  player.x += player.vx * dt;
  for (const solid of game.level.solids) {
    if (!rectsOverlap(player, solid)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = solid.x - player.width;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.width;
    }
    player.vx = 0;
  }

  player.onGround = false;
  player.y += player.vy * dt;
  for (const solid of game.level.solids) {
    if (!rectsOverlap(player, solid)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = solid.y - player.height;
      player.vy = 0;
      player.onGround = true;
      player.coyote = 0.12;
    } else if (player.vy < 0) {
      player.y = solid.y + solid.height;
      player.vy = 120;
      if (solid.type === "question" && !solid.used) {
        solid.used = true;
        solid.bump = 0.18;
        const shouldSpawnMushroom = game.mode === "classic"
          ? !!solid.guaranteedMushroom
          : Math.random() < MUSHROOM_BLOCK_CHANCE;
        if (shouldSpawnMushroom) {
          game.level.mushrooms.push({
            x: solid.x + solid.width * 0.5 - TILE * 0.24,
            y: solid.y - TILE * 0.62,
            width: TILE * 0.48,
            height: TILE * 0.48,
            vx: (Math.random() > 0.5 ? 1 : -1) * 105,
            vy: -120,
            collected: false
          });
          solid.guaranteedMushroom = false;
          ui.status.textContent = "A mystery mushroom appeared!";
        } else {
          spawnCoinPop(solid);
          registerCombo("Coin block hit.");
          awardCoin(100, true);
        }
        triggerShake(3, 0.12);
        game.stats.questionBlocksHit += 1;
        if (game.stats.questionBlocksHit >= 5) {
          unlockAchievement("question_hunter");
        }
      }
    }
  }
}

function updateMushrooms(dt) {
  for (const mushroom of game.level.mushrooms) {
    if (mushroom.collected) {
      continue;
    }

    mushroom.vy = Math.min(MAX_FALL_SPEED, mushroom.vy + GRAVITY * dt);

    mushroom.x += mushroom.vx * dt;
    for (const solid of game.level.solids) {
      if (!rectsOverlap(mushroom, solid)) {
        continue;
      }
      if (mushroom.vx > 0) {
        mushroom.x = solid.x - mushroom.width;
      } else {
        mushroom.x = solid.x + solid.width;
      }
      mushroom.vx *= -1;
    }

    mushroom.y += mushroom.vy * dt;
    for (const solid of game.level.solids) {
      if (!rectsOverlap(mushroom, solid)) {
        continue;
      }
      if (mushroom.vy > 0) {
        mushroom.y = solid.y - mushroom.height;
      } else if (mushroom.vy < 0) {
        mushroom.y = solid.y + solid.height;
      }
      mushroom.vy = 0;
    }

    if (rectsOverlap(game.player, mushroom)) {
      mushroom.collected = true;
      game.player.safetyMushroom = true;
      game.player.safetyFlash = 1.4;
      addScore(350);
      registerCombo("Safety mushroom!");
      triggerShake(4, 0.2);
      ui.status.textContent = "Safety mushroom ready: one free save.";
    }
  }

  game.level.mushrooms = game.level.mushrooms.filter((mushroom) => !mushroom.collected);
}

function resolveEnemy(enemy, dt) {
  enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY * dt);
  const previousX = enemy.x;
  enemy.x += enemy.vx * enemy.dir * dt;

  // Shells slide without turning at edges
  if (enemy.type === "yoshi" && enemy.shellActive) {
    // Just keep sliding, bounce off walls
    for (const solid of game.level.solids) {
      if (!rectsOverlap(enemy, solid)) {
        continue;
      }
      if (enemy.dir > 0) {
        enemy.x = solid.x - enemy.width;
      } else {
        enemy.x = solid.x + solid.width;
      }
      enemy.dir *= -1;
    }
  } else if (enemy.vy <= 40) {
    const edgeProbe = {
      x: enemy.x + enemy.width / 2 + enemy.dir * (enemy.width * 0.55),
      y: enemy.y + enemy.height + 4,
      width: 2,
      height: 2
    };
    const hasGroundAhead = game.level.solids.some((solid) => rectsOverlap(edgeProbe, solid));
    if (!hasGroundAhead) {
      enemy.x = previousX;
      enemy.dir *= -1;
    }
  }

  if (!(enemy.type === "yoshi" && enemy.shellActive)) {
    for (const solid of game.level.solids) {
      if (!rectsOverlap(enemy, solid)) {
        continue;
      }

      if (enemy.dir > 0) {
        enemy.x = solid.x - enemy.width;
      } else {
        enemy.x = solid.x + solid.width;
      }
      enemy.dir *= -1;
    }
  }

  enemy.y += enemy.vy * dt;
  let grounded = false;

  for (const solid of game.level.solids) {
    if (!rectsOverlap(enemy, solid)) {
      continue;
    }

    if (enemy.vy > 0) {
      enemy.y = solid.y - enemy.height;
      enemy.vy = 0;
      grounded = true;
    } else if (enemy.vy < 0) {
      enemy.y = solid.y + solid.height;
      enemy.vy = 0;
    }
  }

  if (enemy.x <= 0) {
    enemy.x = 0;
    enemy.dir = 1;
  }

  if (enemy.x + enemy.width >= game.level.width) {
    enemy.x = game.level.width - enemy.width;
    enemy.dir = -1;
  }

  if (!grounded) {
    const footProbe = {
      x: enemy.x + enemy.width / 2 + enemy.dir * enemy.width * 0.45,
      y: enemy.y + enemy.height + 2,
      width: 2,
      height: 2
    };
    const supported = game.level.solids.some((solid) => rectsOverlap(footProbe, solid));
    if (!supported) {
      enemy.dir *= -1;
    }
  }

  // Stairs are built from many tiles; if an enemy clips into one, push it back out.
  for (const solid of game.level.solids) {
    if (solid.type !== "stair" || !rectsOverlap(enemy, solid)) {
      continue;
    }

    const enemyCenter = enemy.x + enemy.width / 2;
    const stairCenter = solid.x + solid.width / 2;
    if (enemyCenter < stairCenter) {
      enemy.x = solid.x - enemy.width - 0.5;
      enemy.dir = -1;
    } else {
      enemy.x = solid.x + solid.width + 0.5;
      enemy.dir = 1;
    }
  }
}

function resolveGoombaCollisions() {
  const enemies = game.level.enemies;
  for (let i = 0; i < enemies.length; i += 1) {
    const first = enemies[i];
    if (!first.alive || first.stompedTimer > 0) {
      continue;
    }

    for (let j = i + 1; j < enemies.length; j += 1) {
      const second = enemies[j];
      if (!second.alive || second.stompedTimer > 0 || !rectsOverlap(first, second)) {
        continue;
      }

      // If first is a Yoshi shell, it kills the second
      if (first.type === "yoshi" && first.shellActive) {
        second.alive = false;
        second.stompedTimer = 0.35;
        addScore(100);
        registerCombo("Shell hit!");
        triggerShake(3, 0.12);
        continue;
      }

      // If second is a Yoshi shell, it kills the first
      if (second.type === "yoshi" && second.shellActive) {
        first.alive = false;
        first.stompedTimer = 0.35;
        addScore(100);
        registerCombo("Shell hit!");
        triggerShake(3, 0.12);
        continue;
      }

      // Normal enemy collision — push apart
      const centerA = first.x + first.width / 2;
      const centerB = second.x + second.width / 2;
      const overlap = first.width / 2 + second.width / 2 - Math.abs(centerA - centerB);
      if (overlap <= 0) {
        continue;
      }

      const push = overlap / 2 + 0.5;
      if (centerA < centerB) {
        first.x -= push;
        second.x += push;
      } else {
        first.x += push;
        second.x -= push;
      }

      first.dir = centerA < centerB ? -1 : 1;
      second.dir = centerA < centerB ? 1 : -1;
    }
  }
}

function collectCoins(time) {
  for (const coin of game.level.coins) {
    if (coin.collected) {
      continue;
    }

    coin.renderY = coin.y + Math.sin(time * 4 + coin.bobOffset) * 6;
    const coinHitbox = {
      x: coin.x,
      y: coin.renderY,
      width: coin.width,
      height: coin.height
    };

    if (!rectsOverlap(game.player, coinHitbox)) {
      continue;
    }

    coin.collected = true;
    awardCoin();
  }
}

function updateMovingPlatforms(dt) {
  const player = game.player;
  for (const plat of game.level.movingPlatforms) {
    const prevPos = plat.axis === "h" ? plat.x : plat.y;
    const delta = plat.speed * plat.dir * dt;
    if (plat.axis === "h") {
      plat.x += delta;
      if (plat.x <= plat.rangeMin) { plat.x = plat.rangeMin; plat.dir = 1; }
      if (plat.x + plat.width >= plat.rangeMax) { plat.x = plat.rangeMax - plat.width; plat.dir = -1; }
    } else {
      plat.y += delta;
      if (plat.y <= plat.rangeMin) { plat.y = plat.rangeMin; plat.dir = 1; }
      if (plat.y + plat.height >= plat.rangeMax) { plat.y = plat.rangeMax - plat.height; plat.dir = -1; }
    }
    const actualDelta = (plat.axis === "h" ? plat.x : plat.y) - prevPos;
    if (actualDelta === 0) { continue; }
    const playerFeet = player.y + player.height;
    const onTop = Math.abs(playerFeet - plat.y) < 6
      && player.x + player.width > plat.x + 2
      && player.x < plat.x + plat.width - 2;
    if (onTop && player.onGround) {
      if (plat.axis === "h") {
        player.x += actualDelta;
      } else {
        player.y = plat.y - player.height;
      }
    }
  }
}

function updateAnimatedBlocks(dt) {
  for (const solid of game.level.solids) {
    if (solid.type !== "question" || !solid.bump) {
      continue;
    }

    solid.bump = Math.max(0, solid.bump - dt);
  }

  for (let index = game.level.coinPops.length - 1; index >= 0; index -= 1) {
    const coin = game.level.coinPops[index];
    coin.elapsed += dt;
    if (coin.elapsed >= coin.duration) {
      game.level.coinPops.splice(index, 1);
    }
  }
}

function drawCoinPop(coin, cameraX) {
  const t = clamp(coin.elapsed / coin.duration, 0, 1);
  const arc = Math.sin(t * Math.PI);
  const y = coin.baseY - arc * TILE * 1.35;
  const alpha = 1 - t;
  const radiusX = (coin.width / 2) * (0.92 + 0.2 * arc);
  const radiusY = coin.height / 2;
  const x = coin.x - cameraX;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f6ca4a";
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9c6b0d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(x - 3, y - radiusY * 0.8, 6, radiusY * 1.6);

  ctx.fillStyle = "#fff7de";
  ctx.font = '12px "Press Start 2P"';
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("+100", x, y - 20);
  ctx.restore();
}

function handleEnemies(dt, previousPlayerBottom, previousPlayerVy) {
  for (const enemy of game.level.enemies) {
    if (enemy.stompedTimer > 0) {
      enemy.stompedTimer = Math.max(0, enemy.stompedTimer - dt);
      continue;
    }

    if (!enemy.alive) {
      continue;
    }

    resolveEnemy(enemy, dt);
  }

  resolveGoombaCollisions();

  for (const enemy of game.level.enemies) {
    if (!enemy.alive || enemy.stompedTimer > 0) {
      continue;
    }

    if (!rectsOverlap(game.player, enemy)) {
      continue;
    }

    const playerBottom = game.player.y + game.player.height;
    const landedFromAbove = previousPlayerBottom <= enemy.y + 8 && previousPlayerVy >= 0;
    const stompedByVelocity = game.player.vy > 150 && playerBottom - enemy.y < 22;
    const stomped = stompedByVelocity || landedFromAbove;

    if (stomped) {
      if (enemy.type === "yoshi" && !enemy.shellActive) {
        // Activate shell instead of killing
        setYoshiShellState(enemy, true);
        enemy.vx = 320;  // Kick hard
        game.player.vy = -JUMP_SPEED * 0.48;
        triggerShake(4, 0.18);
        registerCombo("Yoshi shell!");
        addScore(30);
      } else {
        // Kill other enemies or already-active shells
        enemy.alive = false;
        enemy.stompedTimer = 0.35;
        game.player.vy = -JUMP_SPEED * 0.48;
        triggerShake(4, 0.18);
        game.stats.stompCount += 1;
        registerCombo("Clean stomp.");
        addScore((enemy.type === "yoshi" ? 400 : 250) * Math.max(1, game.comboCount));
      }
      continue;
    }

    if (game.player.invulnerable <= 0) {
      game.player.invulnerable = 1.1;
      triggerShake(8, 0.45);
      loseLife("An enemy caught you.");
      return;
    }
  }
}

function update(dt, elapsed) {
  if (game.state !== "playing") {
    return;
  }

  if (Number.isFinite(game.timeLeft)) {
    game.timeLeft = Math.max(0, game.timeLeft - dt);
  }
  game.stats.runSeconds += dt;
  dayNightTime = (dayNightTime + dt / DAY_CYCLE_DURATION) % 1;
  if (game.comboTimeLeft > 0) {
    game.comboTimeLeft = Math.max(0, game.comboTimeLeft - dt);
    if (game.comboTimeLeft === 0) {
      game.comboCount = 0;
      ui.status.textContent = "Combo expired.";
    }
  }

  if (game.ghostPlayback?.active) {
    game.ghostPlayback.time += dt;
    if (game.ghostPlayback.time >= game.ghostPlayback.replay.duration) {
      game.ghostPlayback.active = false;
    }
  }

  if (Number.isFinite(game.timeLeft) && game.timeLeft === 0) {
    triggerShake(7, 0.35);
    loseLife("Time ran out.");
    return;
  }

  const player = game.player;
  const previousPlayerBottom = player.y + player.height;
  const previousPlayerVy = player.vy;
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA");
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD");
  const wantsJump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW");
  const wantsDash = keys.has("ShiftLeft") || keys.has("ShiftRight");

  if (wantsJump) {
    player.jumpBuffer = 0.12;
  } else {
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  }

  if (!player.onGround) {
    player.coyote = Math.max(0, player.coyote - dt);
  }

  if (player.dashActive) {
    player.dashTimer -= dt;
    if (player.dashTimer <= 0) {
      player.dashActive = false;
      player.vx = 0;
      player.dashCooldown = DASH_COOLDOWN;
    }
  }

  if (player.dashCooldown > 0) {
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  }
  player.dashReady = !player.dashActive && player.dashCooldown === 0;

  if (wantsDash && player.dashReady && !player.dashActive) {
    player.dashActive = true;
    player.dashReady = false;
    player.dashTimer = DASH_DURATION;
    player.dashDirection = player.direction;
    player.dashCooldown = 0;
    game.stats.dashesUsed += 1;
  }

  let moveIntent = 0;
  if (movingLeft) {
    moveIntent -= 1;
  }
  if (movingRight) {
    moveIntent += 1;
  }

  if (player.dashActive) {
    player.vx = player.dashDirection * DASH_SPEED;
  } else if (moveIntent !== 0) {
    player.direction = moveIntent;
    player.vx += moveIntent * 1900 * dt;
  } else {
    player.vx *= player.onGround ? 0.82 : 0.94;
  }

  const maxHorizontalSpeed = player.dashActive ? DASH_SPEED : MOVE_SPEED;
  player.vx = clamp(player.vx, -maxHorizontalSpeed, maxHorizontalSpeed);

  if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0) && !player.dashActive) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    player.jumpBuffer = 0;
    player.coyote = 0;
  }

  if (!wantsJump && player.vy < -250) {
    player.vy += 1800 * dt;
  }

  player.vy = Math.min(MAX_FALL_SPEED, player.vy + GRAVITY * dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.safetyFlash = Math.max(0, player.safetyFlash - dt);

  updateMovingPlatforms(dt);
  updateAnimatedBlocks(dt);
  resolvePlayerVsSolids(player, dt);
  collectCoins(elapsed);
  updateMushrooms(dt);
  handleEnemies(dt, previousPlayerBottom, previousPlayerVy);
  recordGhostFrame(dt);

  if (player.y > HEIGHT + TILE * 3) {
    triggerShake(8, 0.45);
    loseLife("You fell into a gap.");
    return;
  }

  const finishTrigger = game.level.finishTrigger ?? game.level.flag;
  if (finishTrigger && rectsOverlap(player, finishTrigger)) {
    if (game.mode === "infinite") {
      addScore(1500);
      const carryScore = game.score;
      const carryCoins = game.coins;
      const carryLives = game.lives;
      resetWorld(false, "infinite");
      game.score = carryScore;
      game.coins = carryCoins;
      game.lives = carryLives;
      game.state = "playing";
      ui.status.textContent = "Lap clear. Keep going.";
      updateHud();
    } else {
      const runSnapshot = {
        mode: game.mode,
        score: game.score,
        coins: game.coins,
        stats: { ...game.stats }
      };
      saveRunGhostReplay("classic");
      game.state = "won";
      checkClassicFinishAchievements();
      addScore(1500 + Math.floor(game.timeLeft) * 5);
      runSnapshot.score = game.score;
      recordHighScore(game.score, game.mode, "Course Clear");
      ui.status.textContent = "Course clear.";
      showOverlay("Course Clear", {
        title: "Flag reached",
        body: "You finished the level. Hit Start Run to replay the stage."
      }, "Replay Level", buildRunStatsSummary(runSnapshot));
    }
    return;
  }

  game.cameraX = clamp(player.x - WIDTH * 0.35, 0, game.level.width - WIDTH);
  updateHud();
}

// --- Day/Night helpers ---
function lerpColor(c0, c1, t) {
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Key sky phases: 0=dawn, 0.15=day, 0.45=sunset, 0.55=night, 0.85=pre-dawn
const SKY_PHASES = [
  { t: 0.00, top: "#1a0a3c", mid: "#3a1a5c", bot: "#c46a1a" }, // midnight-dawn
  { t: 0.10, top: "#f4874b", mid: "#fabc6e", bot: "#fde8a0" }, // sunrise
  { t: 0.20, top: "#8fe1ff", mid: "#c9f2ff", bot: "#fce7a0" }, // full day
  { t: 0.75, top: "#8fe1ff", mid: "#c9f2ff", bot: "#fce7a0" }, // still day
  { t: 0.85, top: "#e8773a", mid: "#f0a050", bot: "#f7c87a" }, // sunset
  { t: 0.92, top: "#1a2a6c", mid: "#263470", bot: "#0a0a1e" }, // dusk
  { t: 1.00, top: "#1a0a3c", mid: "#3a1a5c", bot: "#c46a1a" }, // back to dawn
];

function getSkyColors() {
  let prev = SKY_PHASES[SKY_PHASES.length - 2];
  let next = SKY_PHASES[0];
  for (let i = 1; i < SKY_PHASES.length; i += 1) {
    if (dayNightTime <= SKY_PHASES[i].t) {
      prev = SKY_PHASES[i - 1];
      next = SKY_PHASES[i];
      break;
    }
  }
  const span = next.t - prev.t || 1;
  const t = (dayNightTime - prev.t) / span;
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return {
    top: lerpColor(hexToRgb(prev.top), hexToRgb(next.top), ease),
    mid: lerpColor(hexToRgb(prev.mid), hexToRgb(next.mid), ease),
    bot: lerpColor(hexToRgb(prev.bot), hexToRgb(next.bot), ease),
  };
}

function getNightOverlayAlpha() {
  // 0 = full day, 1 = full night
  const t = dayNightTime;
  if (t >= 0.20 && t <= 0.75) return 0;           // full day
  if (t > 0.92 || t < 0.10)  return 0.72;         // full night
  if (t >= 0.85 && t <= 0.92) {
    return 0.72 * ((t - 0.85) / 0.07);             // dusk fade-in
  }
  if (t > 0.75 && t < 0.85) return 0;             // sunset — no overlay yet
  if (t >= 0.10 && t <= 0.20) {
    return 0.72 * (1 - (t - 0.10) / 0.10);        // sunrise fade-out
  }
  return 0;
}

function isNightPhase() {
  return dayNightTime > 0.88 || dayNightTime < 0.12;
}

function drawBackground(cameraX) {
  const colors = getSkyColors();
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  skyGrad.addColorStop(0, colors.top);
  skyGrad.addColorStop(0.6, colors.mid);
  skyGrad.addColorStop(1, colors.bot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Sun / Moon
  const nightPhase = isNightPhase();
  // Celestial body arcs from just below left horizon to just below right horizon
  // t=0.10: sunrise (left), t=0.45: noon (top), t=0.85: sunset (right) for sun
  // moon is offset by 0.5
  const drawCelestial = (phase, isNight) => {
    // phase 0→1 maps to a half-circle arc L→R
    const angle = phase * Math.PI; // 0→PI
    const cx = WIDTH * phase;
    const bodyY = game.level.groundY * 0.42 - Math.sin(angle) * game.level.groundY * 0.55;
    const radius = isNight ? 22 : 30;
    if (isNight) {
      // Moon glow
      const glow = ctx.createRadialGradient(cx, bodyY, 0, cx, bodyY, radius * 2.5);
      glow.addColorStop(0, "rgba(220,230,255,0.25)");
      glow.addColorStop(1, "rgba(220,230,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, bodyY, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Moon disc
      ctx.fillStyle = "#e8eeff";
      ctx.beginPath();
      ctx.arc(cx, bodyY, radius, 0, Math.PI * 2);
      ctx.fill();
      // Moon crescent shadow
      ctx.fillStyle = "rgba(80,80,160,0.55)";
      ctx.beginPath();
      ctx.arc(cx + radius * 0.4, bodyY, radius * 0.82, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sun glow
      const glow = ctx.createRadialGradient(cx, bodyY, 0, cx, bodyY, radius * 3);
      glow.addColorStop(0, "rgba(255,255,180,0.55)");
      glow.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, bodyY, radius * 3, 0, Math.PI * 2);
      ctx.fill();
      // Sun disc
      ctx.fillStyle = "#fff7a0";
      ctx.beginPath();
      ctx.arc(cx, bodyY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe060";
      ctx.beginPath();
      ctx.arc(cx, bodyY, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Sun: 0.10→0.85, phase within that window
  if (dayNightTime >= 0.08 && dayNightTime <= 0.87) {
    const sunPhase = (dayNightTime - 0.08) / (0.87 - 0.08);
    drawCelestial(sunPhase, false);
  }
  // Moon: 0.88→1 and 0→0.11
  const moonT = dayNightTime >= 0.88 ? dayNightTime : dayNightTime + 1;
  if (moonT >= 0.88 && moonT <= 1.11) {
    const moonPhase = (moonT - 0.88) / (1.11 - 0.88);
    drawCelestial(moonPhase, true);
  }

  // Stars (only at night)
  const nightAlpha = getNightOverlayAlpha();
  if (nightAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = nightAlpha * 0.85;
    // Use level seed-like positions via camera offset — parallax
    for (let i = 0; i < 60; i += 1) {
      const sx = ((i * 137.508 + i * i * 3.7) % WIDTH);
      const sy = ((i * 73.1 + i * 17.3) % (game.level.groundY * 0.7));
      const twinkle = 0.5 + 0.5 * Math.sin(performance.now() / 800 + i * 2.4);
      ctx.globalAlpha = nightAlpha * twinkle * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Clouds — tinted
  const cloudAlpha = nightAlpha > 0 ? 0.45 : 0.9;
  for (const cloud of game.level.decoClouds) {
    const x = cloud.x - cameraX * 0.35;
    const y = cloud.y;
    const width = 74 * cloud.size;
    const height = 28 * cloud.size;
    ctx.fillStyle = nightAlpha > 0.4
      ? `rgba(100,110,160,${cloudAlpha})`
      : `rgba(255,255,255,${cloudAlpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.38, height * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.22, y - 8, width * 0.28, height * 0.68, 0, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.46, y, width * 0.34, height * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Night overlay on world (dims ground and blocks)
  if (nightAlpha > 0) {
    ctx.fillStyle = `rgba(10,10,50,${nightAlpha * 0.45})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.fillStyle = nightAlpha > 0.4 ? "#3a5c28" : "#91d05f";
  ctx.fillRect(0, game.level.groundY + 28, WIDTH, HEIGHT - game.level.groundY - 28);
}

function drawClassicBrickBlock(x, y, size, palette) {
  const unit = size / 8;
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = palette.shadow;
  ctx.fillRect(x, y + unit * 6.75, size, unit * 1.25);

  ctx.fillStyle = palette.mortar;
  ctx.fillRect(x, y + unit * 2.75, size, unit * 0.55);
  ctx.fillRect(x, y + unit * 5.45, size, unit * 0.55);
  ctx.fillRect(x + unit * 3.75, y, unit * 0.55, unit * 3.3);
  ctx.fillRect(x + unit * 1.2, y + unit * 3.3, unit * 0.55, unit * 2.7);
  ctx.fillRect(x + unit * 5.9, y + unit * 3.3, unit * 0.55, unit * 2.7);

  ctx.fillStyle = palette.highlight;
  ctx.fillRect(x + unit * 0.6, y + unit * 0.6, unit * 2.5, unit * 0.45);
  ctx.fillRect(x + unit * 4.7, y + unit * 0.6, unit * 2.6, unit * 0.45);
  ctx.fillRect(x + unit * 4.5, y + unit * 3.6, unit * 1.8, unit * 0.45);
  ctx.fillRect(x + unit * 0.8, y + unit * 3.6, unit * 1.2, unit * 0.45);
}

function drawClassicQuestionBlock(x, y, size, used) {
  const unit = size / 8;
  const palette = used
    ? { base: "#c28c59", shadow: "#8f633d", accent: "#dfbb92", face: "#7c5736" }
    : { base: "#e39a2d", shadow: "#b56b16", accent: "#ffd35d", face: "#fff5c8" };
  const glyphUnit = size / 12;
  const drawPixels = (cells, offsetX, offsetY, color, pixelSize = unit) => {
    ctx.fillStyle = color;
    for (const [col, row] of cells) {
      ctx.fillRect(
        x + offsetX + col * pixelSize,
        y + offsetY + row * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  };

  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = palette.accent;
  ctx.fillRect(x + unit * 0.55, y + unit * 0.55, size - unit * 1.1, unit * 0.7);
  ctx.fillRect(x + unit * 0.55, y + unit * 0.55, unit * 0.7, size - unit * 1.1);

  ctx.fillStyle = palette.shadow;
  ctx.fillRect(x + unit * 0.55, y + size - unit * 1.25, size - unit * 1.1, unit * 0.7);
  ctx.fillRect(x + size - unit * 1.25, y + unit * 0.55, unit * 0.7, size - unit * 1.1);

  if (used) {
    ctx.fillStyle = palette.face;
    ctx.fillRect(x + unit * 2.45, y + unit * 2.45, unit * 3.1, unit * 3.1);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(x + unit * 2.95, y + unit * 2.95, unit * 2.1, unit * 2.1);
    return;
  }

  drawPixels([
    [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1],             [4, 1],
                    [3, 3],
                [2, 4],
                [2, 5],
                [2, 7],
                [2, 8]
  ], glyphUnit * 3, glyphUnit * 1.5, palette.face, glyphUnit);
}

function drawSolid(solid, cameraX) {
  const x = solid.x - cameraX;
  const bumpOffset = solid.type === "question" && solid.bump > 0
    ? Math.sin((solid.bump / 0.18) * Math.PI) * 10
    : 0;
  const y = solid.y - bumpOffset;
  if (x + solid.width < 0 || x > WIDTH) {
    return;
  }

  if (solid.type === "ground") {
    ctx.fillStyle = "#b5662a";
    ctx.fillRect(x, y, solid.width, solid.height);
    ctx.fillStyle = "#d78c3e";
    ctx.fillRect(x, y, solid.width, 16);
    for (let offset = 10; offset < solid.width; offset += 18) {
      ctx.fillStyle = offset % 36 === 10 ? "#7f431b" : "#8d4d20";
      ctx.fillRect(x + offset, y + 18, 10, Math.max(14, solid.height - 24));
    }
    return;
  }

  if (solid.type === "platform") {
    ctx.fillStyle = "#4ca969";
    ctx.fillRect(x, y, solid.width, solid.height);
    ctx.fillStyle = "#78d68e";
    ctx.fillRect(x, y, solid.width, 10);
    return;
  }

  if (solid.type === "question") {
    drawClassicQuestionBlock(x, y, solid.width, solid.used);
    return;
  }

  const colors = solid.type === "stair"
    ? { base: "#b6642e", mortar: "#7c3e16", highlight: "#df8b48", shadow: "#91491f" }
    : { base: "#bf6a31", mortar: "#7a3b16", highlight: "#e08c4c", shadow: "#975127" };

  drawClassicBrickBlock(x, y, solid.width, colors);
}

function drawCoin(coin, cameraX) {
  if (coin.collected) {
    return;
  }

  const x = coin.x - cameraX + coin.width / 2;
  const y = (coin.renderY ?? coin.y) + coin.height / 2;
  ctx.fillStyle = "#f6ca4a";
  ctx.beginPath();
  ctx.ellipse(x, y, coin.width / 2, coin.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9c6b0d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(x - 3, y - coin.height * 0.28, 6, coin.height * 0.56);
}

function drawMushroom(mushroom, cameraX) {
  const x = mushroom.x - cameraX;
  const y = mushroom.y;
  if (x + mushroom.width < 0 || x > WIDTH) {
    return;
  }

  if (mushroomSprite.complete && mushroomSprite.naturalWidth) {
    ctx.drawImage(mushroomSprite, x, y, mushroom.width, mushroom.height);
    return;
  }

  ctx.fillStyle = "#e04638";
  ctx.beginPath();
  ctx.arc(x + mushroom.width / 2, y + mushroom.height * 0.32, mushroom.width * 0.42, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#f6e5d5";
  ctx.fillRect(x + mushroom.width * 0.22, y + mushroom.height * 0.42, mushroom.width * 0.56, mushroom.height * 0.45);
}

function drawYoshi(ex, ey, w, h, dir, isStomped, shellActive) {
  const showShell = shellActive || isStomped;
  const sprite = showShell ? yoshiShellSprite : yoshiSprite;
  if (sprite.complete && sprite.naturalWidth) {
    const drawWidth = showShell ? w * 1.08 : w * 1.32;
    const drawHeight = showShell ? h * 1.05 : h * 1.22;
    const drawX = ex - (drawWidth - w) / 2;
    const drawY = showShell ? ey + h - drawHeight : ey + h - drawHeight;

    ctx.save();
    if (!showShell && dir < 0) {
      ctx.translate(drawX + drawWidth / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(drawX + drawWidth / 2), 0);
    }
    ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return;
  }

  // Canvas fallback
  if (showShell) {
    // Shell shape
    ctx.fillStyle = "#2a5c3a";
    ctx.beginPath();
    ctx.ellipse(ex + w * 0.5, ey + h * 0.4, w * 0.48, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a3c2a";
    ctx.beginPath();
    ctx.ellipse(ex + w * 0.5, ey + h * 0.42, w * 0.35, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Living Yoshi
  const fr = dir >= 0;
  ctx.fillStyle = "#3dbf47";
  ctx.beginPath();
  ctx.ellipse(ex + w * 0.5, ey + h * 0.62, w * 0.40, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0f0e0";
  ctx.beginPath();
  ctx.ellipse(ex + w * 0.5, ey + h * 0.67, w * 0.22, h * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(enemy, cameraX) {
  const isStomped = !enemy.alive && enemy.stompedTimer > 0;
  if (!enemy.alive && !isStomped) {
    return;
  }

  const x = enemy.x - cameraX;
  const y = enemy.y;

  if (enemy.type === "yoshi") {
    drawYoshi(x, y, enemy.width, enemy.height, enemy.dir, isStomped, enemy.shellActive);
    return;
  }

  const sprite = isStomped ? goombaStompedSprite : goombaSprite;
  if (sprite.complete && sprite.naturalWidth) {
    const drawWidth = enemy.width * 1.3;
    const drawHeight = isStomped ? enemy.height * 0.95 : enemy.height * 1.2;
    const drawX = x - (drawWidth - enemy.width) / 2;
    const drawY = isStomped
      ? y + enemy.height - drawHeight + 2
      : y - (drawHeight - enemy.height);

    ctx.save();
    if (!isStomped && enemy.dir < 0) {
      ctx.translate(drawX + drawWidth / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(drawX + drawWidth / 2), 0);
    }
    ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return;
  }

  if (isStomped) {
    ctx.fillStyle = "#7b4a22";
    ctx.beginPath();
    ctx.ellipse(x + enemy.width / 2, y + enemy.height * 0.8, enemy.width * 0.48, enemy.height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#7b4a22";
  ctx.beginPath();
  ctx.ellipse(x + enemy.width / 2, y + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8bb8d";
  ctx.beginPath();
  ctx.ellipse(x + enemy.width / 2, y + enemy.height * 0.66, enemy.width * 0.3, enemy.height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1f140d";
  ctx.fillRect(x + enemy.width * 0.22, y + enemy.height * 0.32, 5, 7);
  ctx.fillRect(x + enemy.width * 0.62, y + enemy.height * 0.32, 5, 7);
  ctx.fillRect(x + enemy.width * 0.18, y + enemy.height - 8, 10, 6);
  ctx.fillRect(x + enemy.width * 0.62, y + enemy.height - 8, 10, 6);
}

function drawPlayerFallback(x, y, player, skin) {
  const palette = skin?.fallback ?? SKINS[0].fallback;
  ctx.fillStyle = palette.cap;
  ctx.fillRect(x + 6, y, player.width - 12, 14);
  ctx.fillRect(x + 3, y + 8, player.width - 6, 10);

  ctx.fillStyle = palette.skin;
  ctx.fillRect(x + 9, y + 14, player.width - 18, 18);

  ctx.fillStyle = palette.overalls;
  ctx.fillRect(x + 8, y + 32, player.width - 16, 20);
  ctx.fillRect(x + 11, y + 52, 10, player.height - 52);
  ctx.fillRect(x + player.width - 21, y + 52, 10, player.height - 52);

  ctx.fillStyle = palette.boots;
  ctx.fillRect(x + 5, y + player.height - 8, 14, 8);
  ctx.fillRect(x + player.width - 19, y + player.height - 8, 14, 8);

  ctx.fillStyle = palette.eyes;
  const eyeX = player.direction > 0 ? x + player.width - 18 : x + 12;
  ctx.fillRect(eyeX, y + 20, 4, 6);
}

function drawPlayer(cameraX) {
  const player = game.player;
  const skin = getActiveSkin();
  const x = player.x - cameraX;
  const y = player.y;
  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0;
  if (blink) {
    return;
  }

  const airborne = !player.onGround || Math.abs(player.vy) > 120;
  const sprite = airborne ? marioJumpSprite : marioSprite;
  if (!sprite.complete || !sprite.naturalWidth) {
    drawPlayerFallback(x, y, player, skin);
    return;
  }

  const stepBob = player.onGround && Math.abs(player.vx) > 30 ? Math.sin(performance.now() / 90) * 2.5 : 0;
  const drawWidth = player.width * 1.65;
  const drawHeight = player.height * 1.28;
  const drawX = x - (drawWidth - player.width) / 2;
  const drawY = y - (drawHeight - player.height) + stepBob;

  ctx.save();
  if (player.safetyMushroom) {
    const pulse = 0.55 + Math.sin(performance.now() / 150) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + player.width / 2, y + player.height / 2, Math.max(player.width, player.height) * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (player.direction < 0) {
    ctx.translate(drawX + drawWidth / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(drawX + drawWidth / 2), 0);
  }
  if (skin.filter && skin.filter !== "none") {
    ctx.filter = skin.filter;
  }
  if (player.safetyFlash > 0) {
    const glow = 1 + Math.sin(performance.now() / 90) * 0.35;
    ctx.filter = `${ctx.filter === "none" ? "" : `${ctx.filter} `}brightness(${glow.toFixed(2)})`;
  }
  ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawGhostPlayer(cameraX) {
  const ghost = game.ghostPlayback;
  if (!ghost || !ghost.active) {
    return;
  }

  const frame = sampleGhostFrame(ghost.replay, ghost.time);
  if (!frame) {
    return;
  }

  const x = frame.x - cameraX;
  const y = frame.y;
  const airborne = !frame.onGround || Math.abs(frame.vy) > 120;
  const sprite = airborne ? marioJumpSprite : marioSprite;

  if (!sprite.complete || !sprite.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    const ghostSkin = {
      fallback: {
        cap: "#b9f5ff",
        skin: "#d8fbff",
        overalls: "#48c5ff",
        boots: "#2b6d8d",
        eyes: "#0e2230"
      }
    };
    drawPlayerFallback(x, y, frame, ghostSkin);
    ctx.restore();
    return;
  }

  const drawWidth = frame.width * 1.65;
  const drawHeight = frame.height * 1.28;
  const drawX = x - (drawWidth - frame.width) / 2;
  const drawY = y - (drawHeight - frame.height);

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.filter = "hue-rotate(170deg) saturate(1.5) brightness(1.15)";
  if (frame.direction < 0) {
    ctx.translate(drawX + drawWidth / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(drawX + drawWidth / 2), 0);
  }
  ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawFlag(cameraX) {
  const { flag, castle } = game.level;
  if (!flag || !castle) {
    return;
  }
  const poleX = flag.x - cameraX;
  ctx.fillStyle = "#efe9d4";
  ctx.fillRect(poleX, flag.y, flag.width, flag.height);
  ctx.fillStyle = "#29a14d";
  ctx.beginPath();
  ctx.moveTo(poleX + flag.width, flag.y + 12);
  ctx.lineTo(poleX + flag.width + 44, flag.y + 28);
  ctx.lineTo(poleX + flag.width, flag.y + 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f5f0df";
  ctx.beginPath();
  ctx.arc(poleX + flag.width / 2, flag.y - 6, 8, 0, Math.PI * 2);
  ctx.fill();

  const castleX = castle.x - cameraX;
  ctx.fillStyle = "#ba7c47";
  ctx.fillRect(castleX, castle.y, castle.width, castle.height);
  ctx.fillStyle = "#8b5124";
  ctx.fillRect(castleX + castle.width * 0.34, castle.y + castle.height * 0.45, castle.width * 0.32, castle.height * 0.55);
  ctx.fillStyle = "#7f431b";
  ctx.fillRect(castleX - 12, castle.y + 18, 16, 30);
  ctx.fillRect(castleX + castle.width - 4, castle.y + 18, 16, 30);
}

function render() {
  ctx.save();
  if (screenShake.elapsed < screenShake.duration) {
    const progress = 1 - screenShake.elapsed / screenShake.duration;
    ctx.translate(
      (Math.random() * 2 - 1) * screenShake.intensity * progress,
      (Math.random() * 2 - 1) * screenShake.intensity * progress
    );
  }
  drawBackground(game.cameraX);

  for (const solid of game.level.solids) {
    drawSolid(solid, game.cameraX);
  }

  for (const coin of game.level.coins) {
    drawCoin(coin, game.cameraX);
  }

  for (const mushroom of game.level.mushrooms) {
    drawMushroom(mushroom, game.cameraX);
  }

  for (const coin of game.level.coinPops) {
    drawCoinPop(coin, game.cameraX);
  }

  for (const enemy of game.level.enemies) {
    drawEnemy(enemy, game.cameraX);
  }

  drawFlag(game.cameraX);
  drawGhostPlayer(game.cameraX);
  drawPlayer(game.cameraX);
  ctx.restore();
}

function frame(timestamp) {
  if (!game) {
    resetWorld();
  }

  if (!lastFrame) {
    lastFrame = timestamp;
  }

  const dt = Math.min(0.033, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;
  if (screenShake.elapsed < screenShake.duration) {
    screenShake.elapsed = Math.min(screenShake.elapsed + dt, screenShake.duration);
  }
  update(dt, timestamp / 1000);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyR") {
    resetWorld(false, selectedMode);
    showIntroOverlay("Course reset.");
  }

  if (event.code === "KeyG") {
    setGhostReplayEnabled(!ghostReplayEnabled, true);
    if (ghostReplayEnabled && game?.state === "playing") {
      startGhostPlaybackForCurrentGame();
    }
  }

  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

ui.startButton.addEventListener("click", () => {
  if (ui.startButton.textContent !== "Resume") {
    resetWorld(false, selectedMode);
  }
  startGame();
});

ui.restartButton.addEventListener("click", () => {
  resetWorld(false, selectedMode);
  showIntroOverlay("Course reset.");
});

ui.ghostToggleButton?.addEventListener("click", () => {
  setGhostReplayEnabled(!ghostReplayEnabled, true);
  if (ghostReplayEnabled && game?.state === "playing") {
    startGhostPlaybackForCurrentGame();
  }
});

ui.classicModeButton.addEventListener("click", () => {
  setMode("classic");
  if (game?.state !== "playing") {
    resetWorld(false, "classic");
    showIntroOverlay("Classic mode selected.");
  }
});

ui.infiniteModeButton.addEventListener("click", () => {
  setMode("infinite");
  if (game?.state !== "playing") {
    resetWorld(false, "infinite");
    showIntroOverlay("Infinite mode selected.");
  }
});

setMode(selectedMode);
renderAchievements();
renderHighScores();
syncSkinUnlocks(false);
saveGhostReplays();
refreshGhostToggleButton();
resetWorld(false, selectedMode);
showIntroOverlay();
requestAnimationFrame(frame);
