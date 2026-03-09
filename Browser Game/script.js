// ===== CONSTANTS =====
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_COLOR = '#00ff00';
const PLAYER_SVG_PATH = 'Group 1.svg';
const ENEMY_SVG_PATH = 'enemy.svg';
const CANNON_SVG_PATH = 'cannon.svg';
const PLAYER_SPEED = 300; // pixels per second
const ENEMY_RADIUS = 12;
const ENEMY_COLOR = '#ff0000';
const CANNON_RADIUS = 16;
const CANNON_COLOR = '#ff8c00';
const CANNON_SPRITE_ROTATION_OFFSET = Math.PI / 2; // cannon.svg barrel points up by default
const CANNON_SVG_VIEWBOX_WIDTH = 325;
const CANNON_SVG_VIEWBOX_HEIGHT = 462;
const CANNON_SVG_BODY_CENTER_X = 162.5;
const CANNON_SVG_BODY_CENTER_Y = 299.5;
const CANNON_SHOOT_INTERVAL = 3; // seconds
const PROJECTILE_RADIUS = 7;
const PROJECTILE_COLOR = '#ffa500';
const PROJECTILE_SPEED = 270; // pixels per second (medium-fast speed)
const SCORE_PER_SECOND = 10;
const MAX_ENEMY_SPEED = 400; // pixels per second
const MIN_SPAWN_INTERVAL = 0.5; // seconds
const SCREEN_SHAKE_DURATION = 0.2; // seconds
const SCREEN_SHAKE_AMPLITUDE = 15; // pixels
const PARTICLE_COUNT = 30;
const PARTICLE_LIFETIME = 0.6; // seconds

const GAME_STATE = {
    MENU: 'menu',
    PLAY: 'play'
};

const DIFFICULTIES = {
    easy: {
        name: 'Easy',
        enemySpeed: 100,
        spawnInterval: 4,
        difficultyScaleRate: 0.2,
        scoreMultiplier: 1.0,
        enemiesPerSpawn: 1,
        cannonWaveInterval: 0,
        maxCannons: 0
    },
    medium: {
        name: 'Medium',
        enemySpeed: 112,
        spawnInterval: 4,
        difficultyScaleRate: 0,
        scoreMultiplier: 1.5,
        enemiesPerSpawn: 2,
        cannonWaveInterval: 4,
        maxCannons: 10
    },
    hard: {
        name: 'Hard',
        enemySpeed: 124,
        spawnInterval: 4,
        difficultyScaleRate: 0,
        scoreMultiplier: 2.0,
        enemiesPerSpawn: 3,
        cannonWaveInterval: 2,
        maxCannons: 15
    }
};

// ===== STATE =====
const state = {
    gameState: GAME_STATE.MENU,
    selectedDifficulty: null,
    // Difficulty settings (set when game starts)
    enemySpeed: 150,
    spawnInterval: 3,
    difficultyScaleRate: 0.5,
    scoreMultiplier: 1,
    enemiesPerSpawn: 1,
    cannonWaveInterval: 0,
    maxCannons: 0,
    // Game state
    player: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: 0,
        vy: 0
    },
    enemies: [],
    projectiles: [],
    spawnTimer: 0,
    waveCount: 0,
    gameOver: false,
    timeSurvived: 0,
    score: 0,
    highScore: 0,
    // Visual effects
    particles: [],
    screenShakeTimer: 0,
    screenShakeX: 0,
    screenShakeY: 0
};

// ===== KEYBOARD TRACKING =====
const keysPressed = {};

// ===== LOCAL STORAGE =====
const HIGH_SCORE_KEY = 'canvas_apocalypse_highscore';

/**
 * Load high score from localStorage
 */
function loadHighScore() {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    state.highScore = saved ? parseInt(saved, 10) : 0;
}

/**
 * Save high score to localStorage
 */
function saveHighScore() {
    localStorage.setItem(HIGH_SCORE_KEY, Math.floor(state.highScore));
}

/**
 * Update high score if current score is better
 */
function updateHighScore() {
    if (Math.floor(state.score) > state.highScore) {
        state.highScore = Math.floor(state.score);
        saveHighScore();
    }
}

// ===== SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerSprite = new Image();
const enemySprite = new Image();
const cannonSprite = new Image();
let isPlayerSpriteLoaded = false;
let isEnemySpriteLoaded = false;
let isCannonSpriteLoaded = false;

function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Keep player valid after resize; center while on menu.
    if (state.gameState === GAME_STATE.MENU) {
        state.player.x = CANVAS_WIDTH / 2;
        state.player.y = CANVAS_HEIGHT / 2;
    } else {
        const halfSize = PLAYER_SIZE / 2;
        state.player.x = Math.max(halfSize, Math.min(CANVAS_WIDTH - halfSize, state.player.x));
        state.player.y = Math.max(halfSize, Math.min(CANVAS_HEIGHT - halfSize, state.player.y));
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

playerSprite.addEventListener('load', () => {
    isPlayerSpriteLoaded = true;
});

enemySprite.addEventListener('load', () => {
    isEnemySpriteLoaded = true;
});

cannonSprite.addEventListener('load', () => {
    isCannonSpriteLoaded = true;
});

playerSprite.src = PLAYER_SVG_PATH;
enemySprite.src = ENEMY_SVG_PATH;
cannonSprite.src = CANNON_SVG_PATH;

// ===== EVENT LISTENERS =====
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = true;

    // Handle menu selection (1, 2, 3)
    if (state.gameState === GAME_STATE.MENU) {
        if (key === '1') {
            startGame('easy');
        } else if (key === '2') {
            startGame('medium');
        } else if (key === '3') {
            startGame('hard');
        }
    }

    // Handle restart on 'R' key
    if (key === 'r' && state.gameOver) {
        restartGame();
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// ===== FUNCTIONS =====

/**
 * Check collision between player (approximated as circle) and an enemy (circle)
 * Player radius = PLAYER_SIZE / 2
 * Enemy radius = ENEMY_RADIUS
 */
function checkCollision(enemy) {
    const playerRadius = PLAYER_SIZE / 2;
    const enemyRadius = enemy.type === 'cannon' ? CANNON_RADIUS : ENEMY_RADIUS;
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < playerRadius + enemyRadius;
}

/**
 * Check collision between player and projectile (circle-circle).
 * @param {object} projectile Projectile object
 * @returns {boolean} True if colliding
 */
function checkProjectileCollision(projectile) {
    const playerRadius = PLAYER_SIZE / 2;
    const dx = state.player.x - projectile.x;
    const dy = state.player.y - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < playerRadius + PROJECTILE_RADIUS;
}

/**
 * Create an enemy object at a random canvas edge
 * @returns {object} Enemy object with x, y properties
 */
function createEnemy(type = 'chaser') {
    const enemy = {};
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: bottom, 2: left, 3: right

    switch (edge) {
        case 0: // top
            enemy.x = Math.random() * CANVAS_WIDTH;
            enemy.y = 0;
            break;
        case 1: // bottom
            enemy.x = Math.random() * CANVAS_WIDTH;
            enemy.y = CANVAS_HEIGHT;
            break;
        case 2: // left
            enemy.x = 0;
            enemy.y = Math.random() * CANVAS_HEIGHT;
            break;
        case 3: // right
            enemy.x = CANVAS_WIDTH;
            enemy.y = Math.random() * CANVAS_HEIGHT;
            break;
    }

    enemy.type = type;
    if (type === 'cannon') {
        enemy.shootTimer = 0;
        enemy.facingAngle = 0;
    }

    return enemy;
}

/**
 * Spawn one enemy and append it to the enemies array.
 */
function spawnEnemy(count = 1, type = 'chaser') {
    for (let i = 0; i < count; i++) {
        const enemy = createEnemy(type);
        if (enemy && Number.isFinite(enemy.x) && Number.isFinite(enemy.y)) {
            state.enemies.push(enemy);
        }
    }
}

/**
 * Spawn enemies for a new wave and optionally add a cannon by difficulty rule.
 */
function spawnWave() {
    state.waveCount += 1;
    spawnEnemy(state.enemiesPerSpawn, 'chaser');

    const activeCannonCount = state.enemies.filter((enemy) => enemy.type === 'cannon').length;
    if (state.cannonWaveInterval > 0 && state.waveCount % state.cannonWaveInterval === 0 &&
        activeCannonCount < state.maxCannons) {
        spawnEnemy(1, 'cannon');
    }
}

/**
 * Create and spawn one projectile shot from a cannon toward the current player position.
 * @param {object} cannon Cannon enemy object
 */
function shootProjectile(cannon) {
    const dx = state.player.x - cannon.x;
    const dy = state.player.y - cannon.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= 0) return;

    const projectile = {
        x: cannon.x,
        y: cannon.y,
        vx: (dx / distance) * PROJECTILE_SPEED,
        vy: (dy / distance) * PROJECTILE_SPEED
    };
    state.projectiles.push(projectile);
}

/**
 * Compute cannon facing angle toward the player.
 * @param {object} cannon Cannon enemy object
 * @returns {number} Angle in radians
 */
function getCannonFacingAngle(cannon) {
    const dx = state.player.x - cannon.x;
    const dy = state.player.y - cannon.y;
    return Math.atan2(dy, dx) + CANNON_SPRITE_ROTATION_OFFSET;
}

/**
 * Spawn particles at collision point
 * @param {number} x - X coordinate of collision
 * @param {number} y - Y coordinate of collision
 */
function spawnExplosion(x, y) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = 100 + Math.random() * 200;
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime: PARTICLE_LIFETIME,
            maxLifetime: PARTICLE_LIFETIME
        };
        state.particles.push(particle);
    }
}

/**
 * Update all particles (remove dead ones, update positions)
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateParticles(deltaTime) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const particle = state.particles[i];
        particle.lifetime -= deltaTime;

        if (particle.lifetime <= 0) {
            state.particles.splice(i, 1);
        } else {
            // Apply gravity-like effect
            particle.vy += 150 * deltaTime; // gravity
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
        }
    }
}

/**
 * Update cannon projectiles and check player collisions.
 * @param {number} deltaTime Time elapsed since last frame in seconds
 * @returns {boolean} True if a projectile hit the player
 */
function updateProjectiles(deltaTime) {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const projectile = state.projectiles[i];
        projectile.x += projectile.vx * deltaTime;
        projectile.y += projectile.vy * deltaTime;

        if (checkProjectileCollision(projectile)) {
            spawnExplosion(state.player.x, state.player.y);
            state.screenShakeTimer = SCREEN_SHAKE_DURATION;
            return true;
        }

        if (projectile.x < -PROJECTILE_RADIUS || projectile.x > CANVAS_WIDTH + PROJECTILE_RADIUS ||
            projectile.y < -PROJECTILE_RADIUS || projectile.y > CANVAS_HEIGHT + PROJECTILE_RADIUS) {
            state.projectiles.splice(i, 1);
        }
    }

    return false;
}

/**
 * Prevent enemies from overlapping by separating intersecting circles.
 */
function resolveEnemyCollisions() {
    for (let i = 0; i < state.enemies.length; i++) {
        const a = state.enemies[i];
        const radiusA = a.type === 'cannon' ? CANNON_RADIUS : ENEMY_RADIUS;

        for (let j = i + 1; j < state.enemies.length; j++) {
            const b = state.enemies[j];
            const radiusB = b.type === 'cannon' ? CANNON_RADIUS : ENEMY_RADIUS;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = radiusA + radiusB;
            const distSq = dx * dx + dy * dy;

            if (distSq === 0) {
                // Nudge perfectly overlapping enemies apart.
                const angle = Math.random() * Math.PI * 2;
                const push = minDist * 0.5;
                const nx = Math.cos(angle);
                const ny = Math.sin(angle);

                if (a.type === 'cannon' && b.type === 'cannon') {
                    // Cannons are static; allow overlap resolution to happen naturally via spawn variance.
                    continue;
                }

                if (a.type === 'cannon') {
                    b.x += nx * minDist;
                    b.y += ny * minDist;
                    continue;
                }

                if (b.type === 'cannon') {
                    a.x -= nx * minDist;
                    a.y -= ny * minDist;
                    continue;
                }

                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
                continue;
            }

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                // Keep cannons fixed; only move chasers when a cannon is involved.
                if (a.type === 'cannon' && b.type === 'cannon') {
                    continue;
                }

                if (a.type === 'cannon') {
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    continue;
                }

                if (b.type === 'cannon') {
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    continue;
                }

                const push = overlap * 0.5;
                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
            }
        }
    }
}

/**
 * Update screen shake effect
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateScreenShake(deltaTime) {
    if (state.screenShakeTimer > 0) {
        state.screenShakeTimer -= deltaTime;
        const intensity = (state.screenShakeTimer / SCREEN_SHAKE_DURATION);
        state.screenShakeX = (Math.random() - 0.5) * SCREEN_SHAKE_AMPLITUDE * intensity;
        state.screenShakeY = (Math.random() - 0.5) * SCREEN_SHAKE_AMPLITUDE * intensity;
    } else {
        state.screenShakeX = 0;
        state.screenShakeY = 0;
    }
}

/**
 * Update game state based on deltaTime
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function update(deltaTime) {
    // Update screen shake
    updateScreenShake(deltaTime);

    // Skip updates if on menu
    if (state.gameState === GAME_STATE.MENU) return;
    if (state.gameOver) return;

    // Update particles
    updateParticles(deltaTime);

    // Update projectiles and stop on projectile hit
    if (updateProjectiles(deltaTime)) {
        state.gameOver = true;
        updateHighScore();
        return;
    }

    // Increment survival timer and score
    state.timeSurvived += deltaTime;
    state.score += deltaTime * SCORE_PER_SECOND * state.scoreMultiplier;

    // Calculate current difficulty (scales with time survived)
    const difficultyMultiplier = 1 + (state.difficultyScaleRate * state.timeSurvived);
    const currentEnemySpeed = Math.min(state.enemySpeed * difficultyMultiplier, MAX_ENEMY_SPEED);
    const currentSpawnInterval = Math.max(state.spawnInterval / difficultyMultiplier, MIN_SPAWN_INTERVAL);

    // Update spawn timer and spawn enemies
    state.spawnTimer += deltaTime;
    if (state.spawnTimer >= currentSpawnInterval) {
        spawnWave();
        state.spawnTimer = 0;
    }

    const { player } = state;

    // Reset player velocity
    player.vx = 0;
    player.vy = 0;

    // Calculate player velocity based on keysPressed
    if (keysPressed['w'] || keysPressed['arrowup']) {
        player.vy -= PLAYER_SPEED;
    }
    if (keysPressed['s'] || keysPressed['arrowdown']) {
        player.vy += PLAYER_SPEED;
    }
    if (keysPressed['a'] || keysPressed['arrowleft']) {
        player.vx -= PLAYER_SPEED;
    }
    if (keysPressed['d'] || keysPressed['arrowright']) {
        player.vx += PLAYER_SPEED;
    }

    // Apply player velocity to position (frame-independent)
    player.x += player.vx * deltaTime;
    player.y += player.vy * deltaTime;

    // Prevent player from leaving canvas bounds
    const halfSize = PLAYER_SIZE / 2;
    player.x = Math.max(halfSize, Math.min(CANVAS_WIDTH - halfSize, player.x));
    player.y = Math.max(halfSize, Math.min(CANVAS_HEIGHT - halfSize, player.y));

    // Update all enemies with current difficulty-adjusted speed
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        if (enemy.type === 'cannon') {
            enemy.shootTimer += deltaTime;
            enemy.facingAngle = getCannonFacingAngle(enemy);

            if (enemy.shootTimer >= CANNON_SHOOT_INTERVAL) {
                shootProjectile(enemy);
                enemy.shootTimer = 0;
            }
        } else {
            // Move chaser enemy toward player using vector normalization
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Normalize direction vector
                const ndx = dx / distance;
                const ndy = dy / distance;

                // Apply velocity toward player with difficulty scaling
                enemy.x += ndx * currentEnemySpeed * deltaTime;
                enemy.y += ndy * currentEnemySpeed * deltaTime;
            }
        }

        // Check collision with this enemy
        if (checkCollision(enemy)) {
            // Trigger screen shake and explosion
            state.screenShakeTimer = SCREEN_SHAKE_DURATION;
            spawnExplosion(player.x, player.y);
            state.gameOver = true;
            updateHighScore();
            return;
        }

        // Remove enemies that are completely off-screen to prevent memory buildup
        if (enemy.type === 'chaser') {
            if (enemy.x < -ENEMY_RADIUS || enemy.x > CANVAS_WIDTH + ENEMY_RADIUS ||
                enemy.y < -ENEMY_RADIUS || enemy.y > CANVAS_HEIGHT + ENEMY_RADIUS) {
                state.enemies.splice(i, 1);
            }
        }
    }

    // Keep enemies from intersecting each other.
    resolveEnemyCollisions();
}

/**
 * Draw animated background (drifting dots grid)
 */
function drawBackground() {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
    const gridSize = 60;
    const offset = (state.timeSurvived * 10) % gridSize; // scroll effect

    for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize) {
        for (let y = -gridSize; y < CANVAS_HEIGHT + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x + offset, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Draw all particles
 */
function drawParticles() {
    for (let i = 0; i < state.particles.length; i++) {
        const particle = state.particles[i];
        const alpha = particle.lifetime / particle.maxLifetime;
        ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw all cannon projectiles.
 */
function drawProjectiles() {
    ctx.fillStyle = PROJECTILE_COLOR;
    for (let i = 0; i < state.projectiles.length; i++) {
        const projectile = state.projectiles[i];
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw menu screen
 */
function drawMenu() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SURVIVAL GAME', CANVAS_WIDTH / 2, 100);

    // High score
    ctx.fillStyle = '#ffff00';
    ctx.font = '20px Arial';
    ctx.fillText(`High Score: ${state.highScore}`, CANVAS_WIDTH / 2, 160);

    // Difficulty selection
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.fillText('Select Difficulty:', CANVAS_WIDTH / 2, 220);

    ctx.font = '24px Arial';
    ctx.fillText('Press 1 - Easy', CANVAS_WIDTH / 2, 300);
    ctx.fillText('Press 2 - Medium', CANVAS_WIDTH / 2, 360);
    ctx.fillText('Press 3 - Hard', CANVAS_WIDTH / 2, 420);

    // Instructions
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '16px Arial';
    ctx.fillText('Use WASD or Arrow keys to move', CANVAS_WIDTH / 2, 480);
    ctx.fillText('Medium/Hard add orange cannons that fire every 3s', CANVAS_WIDTH / 2, 505);
    ctx.fillText('Avoid red chasers and orange projectiles!', CANVAS_WIDTH / 2, 530);
}

/**
 * Draw everything on the canvas
 */
function draw() {
    // Apply screen shake offset
    ctx.save();
    ctx.translate(state.screenShakeX, state.screenShakeY);

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    drawBackground();

    // Draw menu if on menu screen
    if (state.gameState === GAME_STATE.MENU) {
        ctx.restore();
        drawMenu();
        return;
    }

    // Draw player sprite at the same 20x20 size as the original cube.
    if (isPlayerSpriteLoaded) {
        ctx.drawImage(
            playerSprite,
            state.player.x - PLAYER_SIZE / 2,
            state.player.y - PLAYER_SIZE / 2,
            PLAYER_SIZE,
            PLAYER_SIZE
        );
    } else {
        // Fallback while the SVG is still loading.
        ctx.fillStyle = PLAYER_COLOR;
        ctx.fillRect(
            state.player.x - PLAYER_SIZE / 2,
            state.player.y - PLAYER_SIZE / 2,
            PLAYER_SIZE,
            PLAYER_SIZE
        );
    }

    // Draw all enemies (red chasers, orange cannons)
    for (let i = 0; i < state.enemies.length; i++) {
        const enemy = state.enemies[i];
        const isCannon = enemy.type === 'cannon';

        if (!isCannon && isEnemySpriteLoaded) {
            const enemySize = ENEMY_RADIUS * 2;
            ctx.drawImage(
                enemySprite,
                enemy.x - ENEMY_RADIUS,
                enemy.y - ENEMY_RADIUS,
                enemySize,
                enemySize
            );
        } else if (isCannon && isCannonSpriteLoaded) {
            // Scale from SVG body diameter (320) to current cannon collision diameter.
            const cannonScale = (CANNON_RADIUS * 2) / 320;
            const cannonWidth = CANNON_SVG_VIEWBOX_WIDTH * cannonScale;
            const cannonHeight = CANNON_SVG_VIEWBOX_HEIGHT * cannonScale;

            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(enemy.facingAngle || 0);
            ctx.drawImage(
                cannonSprite,
                -CANNON_SVG_BODY_CENTER_X * cannonScale,
                -CANNON_SVG_BODY_CENTER_Y * cannonScale,
                cannonWidth,
                cannonHeight
            );
            ctx.restore();
        } else {
            ctx.fillStyle = isCannon ? CANNON_COLOR : ENEMY_COLOR;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, isCannon ? CANNON_RADIUS : ENEMY_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        if (isCannon && !isCannonSpriteLoaded) {
            ctx.fillStyle = '#5a2a00';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw projectiles
    drawProjectiles();

    // Draw particles
    drawParticles();

    // Draw UI - Survival Timer and Score (top-left)
    const timeSeconds = Math.floor(state.timeSurvived);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeString = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    const scoreString = `Score: ${Math.floor(state.score)}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(timeString, 10, 30);
    ctx.fillText(scoreString, 10, 55);

    // Draw game over screen if collision occurred
    if (state.gameOver) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Game over text
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        // Final score
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${Math.floor(state.score)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        // High score
        ctx.fillStyle = '#ffff00';
        ctx.font = '20px Arial';
        ctx.fillText(`High Score: ${state.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

        // Restart instruction
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
    }

    // Restore canvas transform
    ctx.restore();
}

/**
 * Start the game with selected difficulty
 * @param {string} difficultyKey - 'easy', 'medium', or 'hard'
 */
function startGame(difficultyKey) {
    const difficulty = DIFFICULTIES[difficultyKey];
    state.selectedDifficulty = difficultyKey;
    state.enemySpeed = difficulty.enemySpeed;
    state.spawnInterval = difficulty.spawnInterval;
    state.difficultyScaleRate = difficulty.difficultyScaleRate;
    state.scoreMultiplier = difficulty.scoreMultiplier;
    state.enemiesPerSpawn = difficulty.enemiesPerSpawn;
    state.cannonWaveInterval = difficulty.cannonWaveInterval;
    state.maxCannons = difficulty.maxCannons;
    state.gameState = GAME_STATE.PLAY;
    state.gameOver = false;
    state.timeSurvived = 0;
    state.score = 0;
    state.enemies = [];
    state.projectiles = [];
    state.spawnTimer = 0;
    state.waveCount = 0;
    state.particles = [];
    state.player.x = CANVAS_WIDTH / 2;
    state.player.y = CANVAS_HEIGHT / 2;
    state.player.vx = 0;
    state.player.vy = 0;
    spawnWave();
}

/**
 * Restart the game - return to menu
 */
function restartGame() {
    state.gameState = GAME_STATE.MENU;
    state.selectedDifficulty = null;
    state.gameOver = false;
    state.timeSurvived = 0;
    state.score = 0;
    state.enemies = [];
    state.projectiles = [];
    state.spawnTimer = 0;
    state.waveCount = 0;
    state.particles = [];
}

/**
 * Main game loop using requestAnimationFrame
 */
let lastTime = Date.now();

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// Load high score and start the game (on menu screen)
loadHighScore();
gameLoop();
