// Canvas and Grid Setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const CELL_SIZE = 4; // Size of each particle in pixels
let GRID_WIDTH, GRID_HEIGHT;
let grid = [];
let updateOrder = [];

// Particle Types
const ParticleType = {
    EMPTY: 0,
    SAND: 1,
    WATER: 2,
    GAS: 3,
    ORGANISM: 4,
    WALL: 5
};

const ParticleColors = {
    [ParticleType.SAND]: ['#c2b280', '#d4af37', '#c9b037', '#d1b26f'],
    [ParticleType.WATER]: ['#1e90ff', '#4682b4', '#5f9ea0', '#00bfff'],
    [ParticleType.GAS]: ['#e0e0e0', '#d0d0d0', '#c8c8c8', '#f0f0f0'],
    [ParticleType.ORGANISM]: ['#00ff00', '#32cd32', '#00fa9a', '#7fff00'],
    [ParticleType.WALL]: ['#505050', '#606060', '#707070', '#555555']
};

// Particle class
class Particle {
    constructor(type, x, y, customColor = null) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.color = customColor || this.getRandomColor(type);
        this.baseColor = this.color; // Store original color
        this.velocity = { x: 0, y: 0 };
        this.updated = false;
        this.mixedGenerations = 0; // Track how many times this has been mixed
        this.targetX = null; // Target position for formation
        this.targetY = null;
        this.birthTime = Date.now(); // Track when particle was created
        this.lifespan = 10000; // 10 seconds in milliseconds
        
        // Organism-specific properties
        if (type === ParticleType.ORGANISM) {
            this.energy = 100 + Math.random() * 100;
            this.age = 0;
            this.maxAge = 500 + Math.random() * 500;
            this.reproductionCooldown = 0;
        }
    }
    
    getRandomColor(type) {
        const colors = ParticleColors[type];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    isAlive() {
        const age = Date.now() - this.birthTime;
        return age < this.lifespan;
    }
    
    getLifeRatio() {
        // Returns 1.0 when just born, 0.0 when about to die
        const age = Date.now() - this.birthTime;
        return Math.max(0, 1 - (age / this.lifespan));
    }
}

// State
let selectedType = ParticleType.SAND;
let brushSize = 5;
let forceStrength = 5;
let isDrawing = false;
let isPaused = false;
let particleCount = 0;
let lastFrameTime = Date.now();
let fps = 0;
let forceMode = null; // 'attract', 'repel', or null
let mouseGridX = 0;
let mouseGridY = 0;
let formationMode = false; // Whether particles are forming into text/logo
let windX = 0; // Horizontal wind force (-10 to 10)
let windY = 0; // Vertical wind force (-10 to 10)
let deadParticles = []; // Store info about dead particles for respawning
let heatMapEnabled = false; // Whether to show heat map overlay

// Audio setup
let audioContext = null;
let lastSoundTime = 0;
const SOUND_COOLDOWN = 10; // ms between sounds to avoid overwhelming

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Initialize
function init() {
    resizeCanvas();
    setupEventListeners();
    gameLoop();
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    GRID_WIDTH = Math.floor(canvas.width / CELL_SIZE);
    GRID_HEIGHT = Math.floor(canvas.height / CELL_SIZE);
    
    // Initialize empty grid
    grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
    updateOrder = [];
}

// Event Listeners
function setupEventListeners() {
    // Particle type buttons
    document.querySelectorAll('.particle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.particle-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.force-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            selectedType = ParticleType[type.toUpperCase()];
            forceMode = null;
        });
    });
    
    // Force mode buttons
    document.querySelectorAll('.force-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const force = btn.dataset.force;
            
            if (forceMode === force) {
                // Deactivate if clicking the same button
                btn.classList.remove('active');
                forceMode = null;
            } else {
                // Activate new force mode
                document.querySelectorAll('.particle-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.force-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                forceMode = force;
            }
        });
    });
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
        grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
        updateOrder = [];
    });
    
    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    });
    
    // Heat map button
    const heatMapBtn = document.getElementById('heatMapBtn');
    heatMapBtn.addEventListener('click', () => {
        heatMapEnabled = !heatMapEnabled;
        heatMapBtn.style.background = heatMapEnabled ? '#ff6b6b' : '#764ba2';
        heatMapBtn.style.color = 'white';
    });
    
    // Form text button
    const formTextBtn = document.getElementById('formTextBtn');
    formTextBtn.addEventListener('click', () => {
        formationMode = !formationMode;
        if (formationMode) {
            formTextBtn.textContent = 'Release ✨';
            assignParticlesToFormation();
        } else {
            formTextBtn.textContent = 'Form Logo ✨';
            releaseFormation();
        }
    });
    
    // Brush size
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushSizeValue.textContent = brushSize;
    });
    
    // Force strength
    const forceStrengthInput = document.getElementById('forceStrength');
    const forceStrengthValue = document.getElementById('forceStrengthValue');
    forceStrengthInput.addEventListener('input', (e) => {
        forceStrength = parseInt(e.target.value);
        forceStrengthValue.textContent = forceStrength;
    });
    
    // Wind X
    const windXInput = document.getElementById('windX');
    const windXValue = document.getElementById('windXValue');
    windXInput.addEventListener('input', (e) => {
        windX = parseInt(e.target.value);
        windXValue.textContent = windX;
    });
    
    // Wind Y
    const windYInput = document.getElementById('windY');
    const windYValue = document.getElementById('windYValue');
    windYInput.addEventListener('input', (e) => {
        windY = parseInt(e.target.value);
        windYValue.textContent = windY;
    });
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        updateMousePosition(e);
        if (!forceMode) addParticles(e);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        updateMousePosition(e);
        if (isDrawing && !forceMode) addParticles(e);
    });
    
    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        const touch = e.touches[0];
        updateMousePosition(touch);
        if (!forceMode) addParticles(touch);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateMousePosition(touch);
        if (isDrawing && !forceMode) {
            addParticles(touch);
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isDrawing = false;
    });
}

function updateMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    mouseGridX = Math.floor(mouseX / CELL_SIZE);
    mouseGridY = Math.floor(mouseY / CELL_SIZE);
}

function addParticles(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const gridX = Math.floor(mouseX / CELL_SIZE);
    const gridY = Math.floor(mouseY / CELL_SIZE);
    
    // Create particles that scatter and fall from above the cursor
    const particlesToSpawn = brushSize * 2; // Number of particles per frame
    
    for (let i = 0; i < particlesToSpawn; i++) {
        // Scatter particles horizontally around the cursor
        const offsetX = Math.floor((Math.random() - 0.5) * brushSize * 2);
        // Spawn particles above the cursor position
        const offsetY = -Math.floor(Math.random() * brushSize * 3);
        
        const x = gridX + offsetX;
        const y = gridY + offsetY;
        
        if (isValidPosition(x, y) && !grid[y][x]) {
            grid[y][x] = new Particle(selectedType, x, y);
            updateOrder.push({ x, y });
        }
    }
}

function isValidPosition(x, y) {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}

function checkParticleLifespans() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const particle = grid[y][x];
            if (particle && !particle.isAlive()) {
                // Store info about dead particle
                deadParticles.push({
                    type: particle.type,
                    color: particle.baseColor
                });
                // Remove particle
                grid[y][x] = null;
            }
        }
    }
}

function respawnParticles() {
    // Respawn a few dead particles per frame at mouse position
    const respawnCount = Math.min(3, deadParticles.length);
    
    for (let i = 0; i < respawnCount; i++) {
        const deadInfo = deadParticles.shift();
        
        // Try to spawn near mouse position
        for (let attempt = 0; attempt < 5; attempt++) {
            const offsetX = Math.floor((Math.random() - 0.5) * brushSize * 2);
            const offsetY = -Math.floor(Math.random() * brushSize * 2);
            
            const x = mouseGridX + offsetX;
            const y = mouseGridY + offsetY;
            
            if (isValidPosition(x, y) && !grid[y][x]) {
                grid[y][x] = new Particle(deadInfo.type, x, y, deadInfo.color);
                break;
            }
        }
    }
}

function isEmpty(x, y) {
    if (!isValidPosition(x, y)) return false;
    return grid[y][x] === null;
}

function applyForce(centerX, centerY, mode) {
    const forceRadius = brushSize * 3;
    const baseStrength = (mode === 'attract' ? 1 : -1) * (forceStrength / 5);
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const particle = grid[y][x];
            
            // Skip empty cells and walls
            if (!particle || particle.type === ParticleType.WALL) continue;
            
            const dx = centerX - x;
            const dy = centerY - y;
            const distSq = dx * dx + dy * dy;
            const radiusSq = forceRadius * forceRadius;
            
            // Only affect particles within radius
            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                
                // For attract mode, find nearest point in brush to move toward
                // For repel mode, push away from center
                let targetDx, targetDy;
                
                if (dist > 0) {
                    if (mode === 'attract') {
                        // Attract toward anywhere within the brush
                        const brushRadiusSq = brushSize * brushSize;
                        if (distSq > brushRadiusSq) {
                            // Outside brush: move toward center
                            targetDx = dx;
                            targetDy = dy;
                        } else {
                            // Inside brush: barely move or stay
                            targetDx = dx * 0.1;
                            targetDy = dy * 0.1;
                        }
                    } else {
                        // Repel away from center
                        targetDx = -dx;
                        targetDy = -dy;
                    }
                    
                    const normalizedForce = (1 - dist / forceRadius);
                    const strength = normalizedForce * baseStrength;
                    
                    // Calculate movement direction with stronger force
                    const moveX = Math.round(strength * (targetDx / dist) * 3);
                    const moveY = Math.round(strength * (targetDy / dist) * 3);
                    
                    // Ensure minimum movement of 1 if there's any force
                    const finalMoveX = moveX === 0 && Math.abs(targetDx) > 0.5 ? Math.sign(targetDx) : moveX;
                    const finalMoveY = moveY === 0 && Math.abs(targetDy) > 0.5 ? Math.sign(targetDy) : moveY;
                    
                    const newX = x + finalMoveX;
                    const newY = y + finalMoveY;
                    
                    // Try to move the particle to target position
                    if (isValidPosition(newX, newY)) {
                        if (isEmpty(newX, newY)) {
                            swap(x, y, newX, newY);
                        } else {
                            // Try to swap with non-wall particles to allow clustering
                            const targetParticle = grid[newY][newX];
                            if (targetParticle && targetParticle.type !== ParticleType.WALL && mode === 'attract') {
                                // Calculate if target particle is farther from center
                                const targetDx = centerX - newX;
                                const targetDy = centerY - newY;
                                const targetDistSq = targetDx * targetDx + targetDy * targetDy;
                                
                                // Swap if current particle is farther, allowing it to move closer
                                if (distSq > targetDistSq) {
                                    swap(x, y, newX, newY);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function canSwap(particle, x, y) {
    if (!isValidPosition(x, y)) return false;
    const target = grid[y][x];
    if (!target) return true;
    
    // Water can swap with sand and organisms
    if (particle.type === ParticleType.WATER) {
        return target.type === ParticleType.SAND || target.type === ParticleType.ORGANISM;
    }
    
    return false;
}

function swap(x1, y1, x2, y2) {
    const particle1 = grid[y1][x1];
    const particle2 = grid[y2][x2];
    
    // Mix colors if both particles exist and are different types (or same type with different colors)
    if (particle1 && particle2 && particle1.type !== ParticleType.WALL && particle2.type !== ParticleType.WALL) {
        // Play collision sound
        playCollisionSound(particle1, particle2);
        
        const mixChance = 0.3; // 30% chance to mix on collision
        if (Math.random() < mixChance && particle1.mixedGenerations < 5 && particle2.mixedGenerations < 5) {
            const mixedColor = mixColors(particle1.color, particle2.color);
            particle1.color = mixedColor;
            particle2.color = mixedColor;
            particle1.mixedGenerations++;
            particle2.mixedGenerations++;
        }
    }
    
    grid[y1][x1] = particle2;
    grid[y2][x2] = particle1;
    
    if (grid[y1][x1]) {
        grid[y1][x1].x = x1;
        grid[y1][x1].y = y1;
    }
    if (grid[y2][x2]) {
        grid[y2][x2].x = x2;
        grid[y2][x2].y = y2;
    }
}

function playCollisionSound(particle1, particle2) {
    // Throttle sound generation
    const now = Date.now();
    if (now - lastSoundTime < SOUND_COOLDOWN) return;
    
    // Only play sounds occasionally to avoid overwhelming audio
    if (Math.random() > 0.05) return; // 5% chance
    
    lastSoundTime = now;
    
    if (!audioContext) initAudio();
    
    const type1 = particle1.type;
    const type2 = particle2.type;
    
    // Determine sound characteristics based on particle types
    let frequency, duration, noiseAmount, filterFreq;
    
    if (type1 === ParticleType.SAND || type2 === ParticleType.SAND) {
        // Sandy/granular sound - crackling
        frequency = 150 + Math.random() * 100;
        duration = 0.02 + Math.random() * 0.03;
        noiseAmount = 0.8;
        filterFreq = 2000 + Math.random() * 3000;
    } else if (type1 === ParticleType.WATER || type2 === ParticleType.WATER) {
        // Water - bubbly, softer
        frequency = 200 + Math.random() * 150;
        duration = 0.015 + Math.random() * 0.02;
        noiseAmount = 0.5;
        filterFreq = 1500 + Math.random() * 2000;
    } else if (type1 === ParticleType.GAS || type2 === ParticleType.GAS) {
        // Gas - airy, high pitched
        frequency = 400 + Math.random() * 300;
        duration = 0.01 + Math.random() * 0.015;
        noiseAmount = 0.3;
        filterFreq = 4000 + Math.random() * 4000;
    } else if (type1 === ParticleType.ORGANISM || type2 === ParticleType.ORGANISM) {
        // Organism - organic, soft clicks
        frequency = 100 + Math.random() * 100;
        duration = 0.02 + Math.random() * 0.02;
        noiseAmount = 0.4;
        filterFreq = 1000 + Math.random() * 2000;
    } else {
        // Default
        frequency = 200 + Math.random() * 200;
        duration = 0.02;
        noiseAmount = 0.6;
        filterFreq = 2000;
    }
    
    try {
        // Create noise buffer for crackling effect
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * noiseAmount;
        }
        
        // Create noise source
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // Create filter to shape the noise
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 2;
        
        // Create gain for volume envelope
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        // Connect nodes
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play
        noise.start(audioContext.currentTime);
        noise.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Silently fail if audio doesn't work
    }
}

function mixColors(color1, color2) {
    // Convert hex to RGB
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    // Mix by averaging
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    // Convert back to hex
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Update Physics
function update() {
    // Apply force mode if active and mouse is down
    if (forceMode && isDrawing) {
        applyForce(mouseGridX, mouseGridY, forceMode);
    }
    
    // Check for dead particles and remove them
    checkParticleLifespans();
    
    // Respawn dead particles at mouse position if drawing
    if (isDrawing && deadParticles.length > 0 && !forceMode) {
        respawnParticles();
    }
    
    // Reset updated flags
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x]) {
                grid[y][x].updated = false;
            }
        }
    }
    
    // Update particles from bottom to top
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
        // Randomize horizontal order for more natural behavior
        const xOrder = Array.from({ length: GRID_WIDTH }, (_, i) => i);
        for (let i = xOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [xOrder[i], xOrder[j]] = [xOrder[j], xOrder[i]];
        }
        
        for (let x of xOrder) {
            const particle = grid[y][x];
            if (particle && !particle.updated) {
                particle.updated = true;
                updateParticle(particle, x, y);
            }
        }
    }
}

function updateParticle(particle, x, y) {
    // If in formation mode, move toward target
    if (formationMode && particle.targetX !== null && particle.targetY !== null) {
        moveTowardTarget(particle, x, y);
        return;
    }
    
    // Apply wind force (random chance to push particle)
    if ((windX !== 0 || windY !== 0) && particle.type !== ParticleType.WALL) {
        const windChance = Math.abs(windX + windY) / 40; // 0 to 0.5 chance
        if (Math.random() < windChance) {
            applyWind(particle, x, y);
            return; // Wind applied, skip normal physics this frame
        }
    }
    
    switch (particle.type) {
        case ParticleType.SAND:
            updateSand(particle, x, y);
            break;
        case ParticleType.WATER:
            updateWater(particle, x, y);
            break;
        case ParticleType.GAS:
            updateGas(particle, x, y);
            break;
        case ParticleType.ORGANISM:
            updateOrganism(particle, x, y);
            break;
        case ParticleType.WALL:
            // Walls don't move
            break;
    }
}

function applyWind(particle, x, y) {
    // Determine wind direction
    let moveX = 0;
    let moveY = 0;
    
    if (windX !== 0 && Math.random() < Math.abs(windX) / 10) {
        moveX = Math.sign(windX);
    }
    
    if (windY !== 0 && Math.random() < Math.abs(windY) / 10) {
        moveY = Math.sign(windY);
    }
    
    const newX = x + moveX;
    const newY = y + moveY;
    
    // Try to move in wind direction
    if (isValidPosition(newX, newY) && isEmpty(newX, newY)) {
        swap(x, y, newX, newY);
    } else if (moveX !== 0 && moveY !== 0) {
        // If diagonal fails, try horizontal or vertical
        if (isValidPosition(x + moveX, y) && isEmpty(x + moveX, y)) {
            swap(x, y, x + moveX, y);
        } else if (isValidPosition(x, y + moveY) && isEmpty(x, y + moveY)) {
            swap(x, y, x, y + moveY);
        }
    }
}

function moveTowardTarget(particle, x, y) {
    const dx = particle.targetX - x;
    const dy = particle.targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // If close enough to target, stay put
    if (dist < 2) return;
    
    // Move toward target
    let moveX = 0;
    let moveY = 0;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        moveX = Math.sign(dx);
        if (Math.abs(dy) > 0.5 && Math.random() < 0.5) {
            moveY = Math.sign(dy);
        }
    } else {
        moveY = Math.sign(dy);
        if (Math.abs(dx) > 0.5 && Math.random() < 0.5) {
            moveX = Math.sign(dx);
        }
    }
    
    const newX = x + moveX;
    const newY = y + moveY;
    
    if (isValidPosition(newX, newY) && isEmpty(newX, newY)) {
        swap(x, y, newX, newY);
    }
}

function updateSand(particle, x, y) {
    // Try to fall down
    if (isEmpty(x, y + 1)) {
        swap(x, y, x, y + 1);
    }
    // Try to fall diagonally
    else if (isEmpty(x - 1, y + 1) && isEmpty(x + 1, y + 1)) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        swap(x, y, x + dir, y + 1);
    }
    else if (isEmpty(x - 1, y + 1)) {
        swap(x, y, x - 1, y + 1);
    }
    else if (isEmpty(x + 1, y + 1)) {
        swap(x, y, x + 1, y + 1);
    }
}

function updateWater(particle, x, y) {
    // Try to fall down
    if (isEmpty(x, y + 1)) {
        swap(x, y, x, y + 1);
    }
    // Try to fall diagonally
    else if (isEmpty(x - 1, y + 1) || canSwap(particle, x - 1, y + 1) || 
             isEmpty(x + 1, y + 1) || canSwap(particle, x + 1, y + 1)) {
        const leftEmpty = isEmpty(x - 1, y + 1) || canSwap(particle, x - 1, y + 1);
        const rightEmpty = isEmpty(x + 1, y + 1) || canSwap(particle, x + 1, y + 1);
        
        if (leftEmpty && rightEmpty) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            swap(x, y, x + dir, y + 1);
        } else if (leftEmpty) {
            swap(x, y, x - 1, y + 1);
        } else if (rightEmpty) {
            swap(x, y, x + 1, y + 1);
        }
    }
    // Spread horizontally
    else {
        const spreadDistance = 2 + Math.floor(Math.random() * 3);
        const dir = Math.random() < 0.5 ? -1 : 1;
        
        for (let i = 1; i <= spreadDistance; i++) {
            const newX = x + (dir * i);
            if (isEmpty(newX, y)) {
                swap(x, y, newX, y);
                break;
            } else if (canSwap(particle, newX, y)) {
                swap(x, y, newX, y);
                break;
            } else {
                break;
            }
        }
    }
}

function updateGas(particle, x, y) {
    // Try to rise up
    if (isEmpty(x, y - 1)) {
        swap(x, y, x, y - 1);
    }
    // Try to rise diagonally
    else if (isEmpty(x - 1, y - 1) || isEmpty(x + 1, y - 1)) {
        const leftEmpty = isEmpty(x - 1, y - 1);
        const rightEmpty = isEmpty(x + 1, y - 1);
        
        if (leftEmpty && rightEmpty) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            swap(x, y, x + dir, y - 1);
        } else if (leftEmpty) {
            swap(x, y, x - 1, y - 1);
        } else if (rightEmpty) {
            swap(x, y, x + 1, y - 1);
        }
    }
    // Spread horizontally and disperse
    else {
        const spreadDistance = 3 + Math.floor(Math.random() * 4);
        const dir = Math.random() < 0.5 ? -1 : 1;
        
        for (let i = 1; i <= spreadDistance; i++) {
            const newX = x + (dir * i);
            if (isEmpty(newX, y)) {
                swap(x, y, newX, y);
                break;
            } else {
                break;
            }
        }
    }
}

function updateOrganism(particle, x, y) {
    particle.age++;
    particle.energy -= 0.2;
    
    // Die from old age or low energy
    if (particle.age > particle.maxAge || particle.energy <= 0) {
        grid[y][x] = null;
        return;
    }
    
    // Try to move randomly
    const directions = [
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 1 },  // down-left
        { dx: 1, dy: 1 },   // down-right
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: -1 },  // up
        { dx: -1, dy: -1 }, // up-left
        { dx: 1, dy: -1 }   // up-right
    ];
    
    // Shuffle directions for random movement
    for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    let moved = false;
    for (let dir of directions) {
        const newX = x + dir.dx;
        const newY = y + dir.dy;
        
        if (isEmpty(newX, newY) && Math.random() < 0.3) {
            swap(x, y, newX, newY);
            moved = true;
            break;
        }
    }
    
    // Reproduction
    if (particle.reproductionCooldown > 0) {
        particle.reproductionCooldown--;
    }
    
    if (particle.energy > 150 && particle.age > 100 && 
        particle.reproductionCooldown === 0 && Math.random() < 0.01) {
        // Try to reproduce in adjacent empty cell
        for (let dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (isEmpty(newX, newY)) {
                // Offspring inherits parent's color with slight variation
                const offspring = new Particle(ParticleType.ORGANISM, newX, newY, particle.color);
                offspring.mixedGenerations = particle.mixedGenerations;
                grid[newY][newX] = offspring;
                particle.energy -= 50;
                particle.reproductionCooldown = 100;
                break;
            }
        }
    }
}

// Render
function render() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particleCount = 0;
    
    // Calculate density map if heat map is enabled
    let densityMap = null;
    if (heatMapEnabled) {
        densityMap = calculateDensityMap();
    }
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const particle = grid[y][x];
            if (particle) {
                particleCount++;
                
                if (!heatMapEnabled) {
                    // Normal rendering with fade effect
                    const lifeRatio = particle.getLifeRatio();
                    const opacity = Math.max(0.3, lifeRatio);
                    
                    ctx.globalAlpha = opacity;
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }
    
    ctx.globalAlpha = 1.0; // Reset alpha
    
    // Render heat map overlay
    if (heatMapEnabled && densityMap) {
        renderHeatMap(densityMap);
    }
    
    // Update stats
    document.getElementById('particleCount').textContent = particleCount;
}

function calculateDensityMap() {
    const regionSize = 10; // Size of each density region in grid cells
    const regionsX = Math.ceil(GRID_WIDTH / regionSize);
    const regionsY = Math.ceil(GRID_HEIGHT / regionSize);
    const densityMap = Array(regionsY).fill(null).map(() => Array(regionsX).fill(0));
    
    // Count particles in each region
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x]) {
                const regionX = Math.floor(x / regionSize);
                const regionY = Math.floor(y / regionSize);
                densityMap[regionY][regionX]++;
            }
        }
    }
    
    return { map: densityMap, regionSize, regionsX, regionsY };
}

function renderHeatMap(densityData) {
    const { map, regionSize, regionsX, regionsY } = densityData;
    
    // Find max density for normalization
    let maxDensity = 1;
    for (let y = 0; y < regionsY; y++) {
        for (let x = 0; x < regionsX; x++) {
            maxDensity = Math.max(maxDensity, map[y][x]);
        }
    }
    
    // Render heat map
    for (let y = 0; y < regionsY; y++) {
        for (let x = 0; x < regionsX; x++) {
            const density = map[y][x];
            if (density > 0) {
                const normalized = density / maxDensity;
                const color = getHeatColor(normalized);
                
                ctx.globalAlpha = 0.6; // Semi-transparent overlay
                ctx.fillStyle = color;
                ctx.fillRect(
                    x * regionSize * CELL_SIZE,
                    y * regionSize * CELL_SIZE,
                    regionSize * CELL_SIZE,
                    regionSize * CELL_SIZE
                );
            }
        }
    }
    
    ctx.globalAlpha = 1.0;
}

function getHeatColor(intensity) {
    // Thermal camera color scheme: black -> blue -> purple -> red -> orange -> yellow -> white
    if (intensity < 0.2) {
        // Black to blue
        const t = intensity / 0.2;
        const r = 0;
        const g = 0;
        const b = Math.floor(t * 150);
        return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.4) {
        // Blue to purple
        const t = (intensity - 0.2) / 0.2;
        const r = Math.floor(t * 128);
        const g = 0;
        const b = 150 + Math.floor(t * 80);
        return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.6) {
        // Purple to red
        const t = (intensity - 0.4) / 0.2;
        const r = 128 + Math.floor(t * 127);
        const g = 0;
        const b = Math.floor(230 * (1 - t));
        return `rgb(${r}, ${g}, ${b})`;
    } else if (intensity < 0.8) {
        // Red to orange
        const t = (intensity - 0.6) / 0.2;
        const r = 255;
        const g = Math.floor(t * 165);
        const b = 0;
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Orange to yellow/white
        const t = (intensity - 0.8) / 0.2;
        const r = 255;
        const g = 165 + Math.floor(t * 90);
        const b = Math.floor(t * 100);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Game Loop
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastFrameTime;
    
    if (deltaTime >= 16) { // Cap at ~60 FPS
        if (!isPaused) {
            update();
        }
        render();
        
        // Calculate FPS
        fps = Math.round(1000 / deltaTime);
        document.getElementById('fps').textContent = fps;
        
        lastFrameTime = now;
    }
    
    requestAnimationFrame(gameLoop);
}

// Start
window.addEventListener('click', initAudio, { once: true });
init();

// Formation functions
function getTextPixels(text, fontSize = 80) {
    // Create temporary canvas to render text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = GRID_WIDTH * CELL_SIZE;
    tempCanvas.height = GRID_HEIGHT * CELL_SIZE;
    
    tempCtx.fillStyle = 'white';
    tempCtx.font = `bold ${fontSize}px Arial`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    
    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const pixels = [];
    
    // Sample pixels where text exists
    for (let y = 0; y < tempCanvas.height; y += CELL_SIZE) {
        for (let x = 0; x < tempCanvas.width; x += CELL_SIZE) {
            const index = (y * tempCanvas.width + x) * 4;
            const alpha = imageData.data[index + 3];
            
            if (alpha > 128) {
                pixels.push({
                    x: Math.floor(x / CELL_SIZE),
                    y: Math.floor(y / CELL_SIZE)
                });
            }
        }
    }
    
    return pixels;
}

function assignParticlesToFormation() {
    const textInput = document.getElementById('logoText');
    const text = textInput.value.trim().toUpperCase() || 'PARTICLE';
    const targetPixels = getTextPixels(text);
    
    if (targetPixels.length === 0) {
        alert('Please enter some text for the logo!');
        formationMode = false;
        document.getElementById('formTextBtn').textContent = 'Form Logo ✨';
        return;
    }
    
    // Get all non-wall particles
    const particles = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const particle = grid[y][x];
            if (particle && particle.type !== ParticleType.WALL) {
                particles.push({ particle, x, y });
            }
        }
    }
    
    // If not enough particles, create some
    while (particles.length < targetPixels.length) {
        const type = [ParticleType.SAND, ParticleType.WATER, ParticleType.ORGANISM][Math.floor(Math.random() * 3)];
        const x = Math.floor(Math.random() * GRID_WIDTH);
        const y = Math.floor(Math.random() * GRID_HEIGHT);
        
        if (!grid[y][x]) {
            const particle = new Particle(type, x, y);
            grid[y][x] = particle;
            particles.push({ particle, x, y });
        }
    }
    
    // Assign each particle to nearest target position
    const usedTargets = new Set();
    
    for (let p of particles) {
        let closestTarget = null;
        let closestDist = Infinity;
        
        for (let i = 0; i < targetPixels.length; i++) {
            if (usedTargets.has(i)) continue;
            
            const target = targetPixels[i];
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const dist = dx * dx + dy * dy;
            
            if (dist < closestDist) {
                closestDist = dist;
                closestTarget = i;
            }
        }
        
        if (closestTarget !== null) {
            p.particle.targetX = targetPixels[closestTarget].x;
            p.particle.targetY = targetPixels[closestTarget].y;
            usedTargets.add(closestTarget);
        }
    }
}

function releaseFormation() {
    // Clear all target positions
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const particle = grid[y][x];
            if (particle) {
                particle.targetX = null;
                particle.targetY = null;
            }
        }
    }
}
