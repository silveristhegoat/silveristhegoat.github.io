# Particle Sandbox - Code Documentation

## Overview
This is an interactive particle physics sandbox where thousands of small particles behave like different materials (sand, water, gas, organisms) with realistic physics. The simulation runs at ~60 FPS using HTML5 Canvas and vanilla JavaScript.

## Architecture

### Core Concepts

**Grid-Based System**
- The canvas is divided into a 2D grid where each cell can contain one particle
- Grid dimensions are calculated based on canvas size divided by `CELL_SIZE` (4 pixels)
- Grid is stored as a 2D array: `grid[y][x]` contains a Particle object or `null`

**Update Loop**
- Each frame, particles are updated bottom-to-top (important for falling particles)
- Horizontal order is randomized to prevent grid-aligned patterns
- Particles marked as `updated` skip processing to prevent double-updates

**Render Loop**
- Particles are drawn as colored squares at their grid positions
- Uses `requestAnimationFrame` for smooth 60 FPS rendering
- Supports fade-out effects based on particle age

---

## File Structure

### `index.html`
- Main HTML structure
- Contains canvas element and all UI controls
- Buttons for particle types, forces, and modes
- Sliders for brush size, force strength, and wind

### `style.css`
- Responsive design with flexbox layout
- Gradient backgrounds and smooth transitions
- Button states (active, hover)
- Mobile-friendly styling

### `particles.js`
- **Main simulation engine** - All physics, rendering, and interaction logic

---

## Particle System

### Particle Class
Each particle has:
- **Core properties**: `type`, `x`, `y`, `color`, `baseColor`
- **Physics**: `velocity` (unused but available), `updated` flag
- **Lifespan**: `birthTime`, `lifespan` (10 seconds)
- **Color mixing**: `mixedGenerations` (prevents over-mixing)
- **Formation**: `targetX`, `targetY` (for text formation)
- **Organisms only**: `energy`, `age`, `maxAge`, `reproductionCooldown`

### Particle Types

**SAND (Type 1)**
- Falls straight down
- Settles diagonally left/right when blocked
- Piles up naturally
- Can be displaced by water

**WATER (Type 2)**
- Falls down with priority
- Spreads horizontally when can't fall
- Can displace sand and organisms
- Flows further horizontally than sand

**GAS (Type 3)**
- Rises upward (opposite of sand/water)
- Disperses diagonally if blocked
- Spreads widely when at ceiling
- Lightest material

**ORGANISM (Type 4)**
- Random 8-directional movement
- Ages each frame, dies when too old
- Loses energy over time, dies at 0 energy
- Reproduces when healthy (energy > 150, age > 100)
- Offspring inherit parent's color (color lineages)

**WALL (Type 5)**
- Completely immovable
- Blocks all other particles
- Not affected by wind or forces

---

## Physics Update System

### Update Order
1. Apply force mode (attract/repel) if active
2. Check particle lifespans (remove dead particles)
3. Respawn dead particles at mouse (if drawing)
4. Reset all `updated` flags
5. Update each particle bottom-to-top, random horizontal

### Per-Particle Update
1. Check if in formation mode → move toward target
2. Check for wind → apply wind force (probabilistic)
3. Execute type-specific physics behavior

### Type-Specific Physics

**Sand Physics**
```javascript
1. Try fall straight down
2. If blocked, try diagonal (random left/right)
3. If both diagonals blocked, stay put
```

**Water Physics**
```javascript
1. Try fall straight down
2. Try fall diagonal (can displace sand/organisms)
3. If can't fall, spread horizontally 2-4 cells
```

**Gas Physics**
```javascript
1. Try rise straight up
2. Try rise diagonal (random direction)
3. If can't rise, spread horizontally 3-6 cells
```

**Organism Physics**
```javascript
1.  Increment age, decrease energy
2. If too old or no energy → die (remove from grid)
3. Shuffle 8 movement directions
4. Try to move to empty adjacent cell (30% chance)
5. Check reproduction conditions
6. If can reproduce → create offspring in adjacent cell
```

---

## Advanced Features

### Color Mixing System
- When particles swap positions (collide), 30% chance to mix colors
- Colors mixed by averaging RGB values
- Each particle tracks `mixedGenerations` (stops at 5 to prevent gray)
- Organisms inherit mixed colors to offspring (evolutionary lineages)

```javascript
// Example: Blue water + Gold sand = Teal mixture
RGB(30, 144, 255) + RGB(212, 175, 55) = RGB(121, 159, 155)
```

### Lifespan & Respawning
- Every particle created gets `birthTime = Date.now()`
- After 10 seconds (10000ms), particle is "dead"
- Dead particles fade out visually (opacity decreases)
- Dead particle info stored in `deadParticles` queue
- When drawing, dead particles respawn at mouse position
- Respawned particles keep their original type and color

### Force System (Attract/Repel)

**Attract Mode**
- Pulls particles toward cursor in a radius
- Particles outside brush radius move toward center
- Particles inside brush slow down (settle)
- Can swap with farther particles to allow clustering

**Repel Mode**
- Pushes particles away from cursor
- Stronger near center, weaker at edges
- Creates explosive/blast effects

**Force Calculation**
```javascript
forceRadius = brushSize * 3
distance = sqrt((centerX - x)² + (centerY - y)²)
normalizedForce = 1 - (distance / forceRadius)
strength = normalizedForce * baseStrength * (forceStrength / 5)
movement = round(strength * direction * 3)
```

### Wind System
- Global horizontal (windX) and vertical (windY) forces
- Range: -10 to 10 for each axis
- Probabilistic application (stronger wind = higher chance)
- Applied before normal physics each frame
- Affects all particles except walls

**Wind Probability**
```javascript
windChance = |windX + windY| / 40  // 0 to 0.5
if (random() < windChance) applyWind()
```

### Text Formation Mode
1. User enters text in input field
2. Text rendered to temp canvas in bold 80px Arial
3. Pixel data extracted where alpha > 128
4. Each pixel position becomes a target coordinate
5. Existing particles assigned to nearest targets
6. Missing particles created automatically
7. Particles navigate toward targets (1 cell per frame)
8. formation motion overrides normal physics

### Heat Map Visualization
- Divides canvas into 10x10 cell regions
- Counts particles in each region
- Normalizes density (0 = empty, 1 = max density)
- Renders thermal camera colors:
  - **0-20%**: Black → Blue
  - **20-40%**: Blue → Purple
  - **40-60%**: Purple → Red
  - **60-80%**: Red → Orange
  - **80-100%**: Orange → Yellow/White
- Semi-transparent overlay (60% opacity)

### Procedural Sound System
- Uses Web Audio API for collision sounds
- Each particle type has unique sound profile:
  - **Sand**: Crackling, 150-250Hz, high noise (0.8)
  - **Water**: Bubbly, 200-350Hz, medium noise (0.5)
  - **Gas**: Airy, 400-700Hz, low noise (0.3)
  - **Organism**: Organic, 100-200Hz, soft (0.4)
- Only 5% of collisions produce sound (throttling)
- Minimum 10ms between sounds
- Sound: Noise → Bandpass Filter → Gain Envelope

---

## Optimization Techniques

### Performance Optimizations
1. **Grid-based**: O(width * height) instead of O(n²) particle checks
2. **Updated flags**: Prevents double-processing particles
3. **Bottom-to-top update**: Ensures falling particles don't "skip" frames
4. **Random horizontal order**: Prevents grid artifacts
5. **Sound throttling**: Only 5% of collisions, 10ms cooldown
6. **Heat map regions**: 10x10 cells instead of per-pixel

### FPS Limiting
```javascript
if (deltaTime >= 16) { // ~60 FPS cap
    update();
    render();
}
```

---

## User Interaction

### Mouse/Touch Input
- **Click & Drag**: Spawn particles (scatter from above)
- **Brush Size**: Controls spawn radius and force radius
- **Force Modes**: Attract/repel when active (no spawning)

### Keyboard Events
(None currently - could be added)

---

## Key Functions Reference

### Core Functions
- `init()` - Initialize canvas, events, start loop
- `resizeCanvas()` - Set up grid dimensions
- `gameLoop()` - Main loop (update + render)
- `update()` - Update all particle physics
- `render()` - Draw particles to canvas

### Particle Management
- `addParticles(e)` - Spawn particles at mouse
- `checkParticleLifespans()` - Remove dead particles
- `respawnParticles()` - Recycle dead particles
- `swap(x1, y1, x2, y2)` - Swap two grid cells
- `mixColors(c1, c2)` - Blend two hex colors

### Physics
- `updateParticle(p, x, y)` - Router to type-specific update
- `updateSand(p, x, y)` - Sand falling physics
- `updateWater(p, x, y)` - Water flowing physics
- `updateGas(p, x, y)` - Gas rising physics
- `updateOrganism(p, x, y)` - Organism AI physics
- `applyWind(p, x, y)` - Wind force application
- `applyForce(cx, cy, mode)` - Attract/repel force

### Rendering
- `calculateDensityMap()` - Count particles per region
- `renderHeatMap(data)` - Draw thermal overlay
- `getHeatColor(intensity)` - Convert density to RGB

### Formation
- `getTextPixels(text)` - Render text, extract pixels
- `assignParticlesToFormation()` - Assign targets
- `moveTowardTarget(p, x, y)` - Navigate to target
- `releaseFormation()` - Clear all targets

### Audio
- `initAudio()` - Create AudioContext
- `playCollisionSound(p1, p2)` - Generate collision sound

---

## Constants & Configuration

```javascript
CELL_SIZE = 4           // Particle size in pixels
GRID_WIDTH/HEIGHT       // Calculated from canvas size
SOUND_COOLDOWN = 10     // ms between sounds
Particle.lifespan = 10000  // 10 seconds in ms
```

---

## Future Enhancement Ideas
- Temperature system (fire particles)
- Pressure/compression physics
- Particle reactions (water + sand = mud)
- Gravity slider (adjustable)
- Save/load states
- Particle brushes (textures)
- Performance stats overlay
- Particle trails/motion blur
- Chemistry system (combine elements)
- Erosion effects

---

## Browser Compatibility
- **Canvas**: All modern browsers
- **Web Audio API**: Chrome, Firefox, Safari, Edge
- **Touch Events**: Mobile browsers
- **RequestAnimationFrame**: All modern browsers

---

## Credits
Created as an interactive particle physics sandbox demonstrating:
- Cellular automata concepts
- Grid-based physics simulation
- Procedural audio generation
- Canvas rendering techniques
- Particle system design patterns
