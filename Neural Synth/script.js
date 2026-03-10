// ─── DOM References ──────────────────────────────────────────────────────────
// Grab every element we need to interact with so we have quick handles to them.
const canvas = document.getElementById('canvas');        // The drawing surface
const ctx = canvas.getContext('2d');                     // 2D rendering context
const clearBtn = document.getElementById('clearBtn');    // Manual clear button
const frequencyDisplay = document.getElementById('frequencyDisplay'); // Hz readout
const noteDisplay = document.getElementById('noteDisplay');           // Note name readout
const instrumentBtns = document.querySelectorAll('.instrument-btn');  // Bass/Piano/Synth buttons
const echoToggle = document.getElementById('echoToggle');             // Echo on/off toggle
const waveformToggle = document.getElementById('waveformToggle');     // Waveform brush toggle
const modeBtns = document.querySelectorAll('.mode-btn');              // Draw/Symmetry/Gravity mode buttons
const drawModeInstructions = document.getElementById('drawModeInstructions');         // Hint text for draw mode
const symmetryModeInstructions = document.getElementById('symmetryModeInstructions'); // Hint text for symmetry mode
const gravityModeInstructions = document.getElementById('gravityModeInstructions');   // Hint text for gravity mode
const recordBtn = document.getElementById('recordBtn');   // Start/stop recording
const playLoopBtn = document.getElementById('playLoopBtn'); // Play recorded loop
const stopLoopBtn = document.getElementById('stopLoopBtn'); // Pause loop playback
const clearLoopBtn = document.getElementById('clearLoopBtn'); // Discard recording
const loopStatus = document.getElementById('loopStatus'); // Status text for the loop
const shakeToClearBtn = document.getElementById('shakeToClearBtn'); // Manual shake-to-clear trigger

// ─── App State ───────────────────────────────────────────────────────────────
// Active drawing mode: 'draw' paints freehand lines, 'symmetry' mirrors them
// across all four quadrants, 'gravity' places magnetic dots that attract particles.
let currentMode = 'draw'; // 'draw', 'symmetry', or 'gravity'

// ─── Recording & Looping ────────────────────────────────────────────────────
// The app can record up to 5 seconds of draw actions and play them back
// in a continuous loop. Each action stores its timestamp so playback is
// time-accurate.
let isRecording = false;          // True while the user is actively recording
let isLooping = false;            // True while a recorded loop is playing
let recordedActions = [];         // Array of { type, x, y, timestamp, ... } events
let recordingStartTime = 0;       // Epoch ms when recording began (for relative timestamps)
let loopStartTime = 0;            // Epoch ms when the current loop playback started
let loopDuration = 5000;          // Maximum recording / loop cycle length in ms (5 s)
let loopPlaybackInterval = null;  // setTimeout handle for the playback tick
let recordingTimeout = null;      // Auto-stop timeout when recording hits 5 s

// ─── Waveform Brush ─────────────────────────────────────────────────────────
// When enabled, strokes are drawn as a sine-wave (oscillating line) that
// visually reflects the current pitch and volume rather than a plain line.
let waveformEnabled = true;  // Toggled by the waveform checkbox
let waveformPhase = 0;       // Phase accumulator so the wave continues smoothly across strokes

// ─── Symmetry Oscillators ───────────────────────────────────────────────────
// Symmetry mode creates four mirrored strokes simultaneously, each with its
// own oscillator so every reflected line plays its own pitch.
let symmetryOscillators = []; // Array of { osc, gain, filter } objects, one per mirror

// ─── Shake to Clear ─────────────────────────────────────────────────────────
// Physical device shake (or pressing the button) triggers a spark-burst
// animation that "explodes" the current drawing before wiping the canvas.
let isClearing = false;           // True while the clear animation is running (blocks re-triggers)
let shakeThreshold = 25;          // Minimum combined acceleration (m/s²) to count as a shake
let lastShakeTime = 0;            // Epoch ms of the most recent shake (used for debounce)
let shakeDebounce = 1800;         // Minimum ms between successive shakes to prevent double-fires
let sparks = [];                  // Active spark particles used for the clear animation
let hasCanvasContent = false;     // True once the user has drawn something (prevents empty-canvas shakes)
let drawHistory = [];             // Ring-buffer of recent { x, y, color } draw points – spark source positions
const maxDrawHistory = 500;       // How many draw points to keep in the ring-buffer
let clearFailSafeTimeout = null;  // Fallback timer that forces the clear state to reset if sparks stall

// ─── Gravity Mode Data ───────────────────────────────────────────────────────
// Gravity mode lets users place magnetic attractor dots on the canvas.
// Particles spawn around each dot and orbit under simulated gravity,
// playing short tones as they move.
let magneticDots = [];                         // Array of MagneticDot instances
let particles = [];                            // Array of Particle instances
let gravityLoopActive = false;                 // Controls whether animateGravityLoop runs
let particleOscillators = new Map();           // Reserved: maps particle id → oscillator (not currently used)

// ─── Canvas Sizing ───────────────────────────────────────────────────────────
// Match the canvas pixel resolution to its CSS layout size so drawings
// are never blurry. Re-runs on every window resize.
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─── Main Render Loop ────────────────────────────────────────────────────────
// fadeCanvas() is the heart of the visual engine. It runs every animation
// frame and handles three things:
//   1. Slowly darkens the canvas so old strokes fade away over time (trail effect).
//   2. Advances the spark-burst clear animation when active.
//   3. Throttles background audio vibe updates to at most once per 80 ms so
//      the Web Audio API isn't called on every single frame.
let fadeEnabled = true; // Set to false during spark animation to pause the fade
function fadeCanvas() {
    if (fadeEnabled && (currentMode === 'draw' || currentMode === 'symmetry')) {
        // Overlay a near-transparent background to gradually erase old strokes
        ctx.fillStyle = 'rgba(10, 31, 10, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        decayColorAmount(0.0015); // Slowly reduce the ambient vibe energy as strokes fade
    }
    
    // Advance spark animation when a clear is in progress
    if (sparks.length > 0) {
        updateSparks();
    }

    // Throttle background vibe updates: audio automation is expensive, so only
    // apply changes when flagged AND at least 80 ms have elapsed since the last update.
    const now = performance.now();
    if (vibeNeedsUpdate && (now - lastVibeUpdateAt) > 80) {
        updateBackgroundVibe();
        vibeNeedsUpdate = false;
        lastVibeUpdateAt = now;
    }
    
    requestAnimationFrame(fadeCanvas); // Schedule next frame
}

// trackDrawPoint – called every time a visible mark is made on the canvas.
// It maintains the drawHistory ring-buffer (used as spark spawn positions during
// the clear animation) and bumps the ambient energy level so the background vibe
// responds to how actively the user is drawing.
function trackDrawPoint(x, y, color) {
    drawHistory.push({ x, y, color }); // Record this point for spark source data
    if (drawHistory.length > maxDrawHistory) {
        drawHistory.shift(); // Evict oldest entry once the ring-buffer is full
    }
    hasCanvasContent = true;    // Unlock shake-to-clear so it won't fire on an empty canvas
    addColorAmount(0.012);      // Increase ambient energy slightly for each stroke
}

// ─── Web Audio API Setup ─────────────────────────────────────────────────────
// All audio runs through the Web Audio API. Nodes are created lazily on the
// first user gesture (required by browser autoplay policy).
// Signal chain: oscillator → filterNode → gainNode → destination
//               (optional echo)       ↗ delayNode → delayGain → destination
//                                          ↕ delayFeedback (feedback loop)
let audioContext = null;    // Created once on first interaction
let oscillator = null;      // Main tone generator (recreated each stroke)
let gainNode = null;        // Master volume for the main oscillator
let filterNode = null;      // Timbre shaping (lowpass / bandpass depending on instrument)
let delayNode = null;       // Delay line for the echo effect
let delayFeedback = null;   // Feedback gain – controls how long the echo rings
let delayGain = null;       // Wet/dry mix for the echo signal
let isPlaying = false;      // True while the main oscillator is producing sound
let echoEnabled = true;     // Mirrors the echo toggle checkbox

// ─── Background Vibe (Ambient Drone) ────────────────────────────────────────
// A continuously running ambient tone that evolves based on how much the user
// has drawn. More color on screen → higher pitch, brighter filter, louder volume.
// Two slightly detuned oscillators (A=triangle, B=sine +6 cents) create a gentle
// chorus. An LFO slowly sweeps the filter cutoff for an atmospheric "breathing" feel.
let vibeOscA = null;         // Triangle-wave oscillator (fundamental)
let vibeOscB = null;         // Sine-wave oscillator (harmony, slightly detuned)
let vibeGain = null;         // Master volume for the ambient drone
let vibeFilter = null;       // Lowpass filter sculpting the drone's brightness
let vibeLfo = null;          // Low-frequency oscillator (0.08 Hz) driving the filter sweep
let vibeLfoGain = null;      // Scales the LFO output to a useful filter frequency range
let vibeStarted = false;     // True once the drone nodes have been created and started
let colorAmount = 0;         // 0–1 measure of how much colour/energy is on the canvas
let vibeNeedsUpdate = false; // Flag: set whenever colorAmount changes, cleared after update
let lastVibeUpdateAt = 0;    // performance.now() timestamp of the last vibe parameter update

// Current instrument settings
let currentInstrument = {
    type: 'red',
    color: '#ef4444',
    waveform: 'sawtooth',
    filterFreq: 800,
    volume: 0.4
};

// Initialize audio context on user interaction
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Main gain node
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        
        // Filter node
        filterNode = audioContext.createBiquadFilter();
        
        // Delay/Echo setup
        delayNode = audioContext.createDelay(2.0); // Max 2 second delay
        delayNode.delayTime.value = 0.3; // 300ms delay
        
        delayFeedback = audioContext.createGain();
        delayFeedback.gain.value = 0.4; // Feedback amount (echo decay)
        
        delayGain = audioContext.createGain();
        delayGain.gain.value = 0.5; // Wet/dry mix
        
        // Connect: oscillator -> filter -> gainNode -> destination
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Echo path: gainNode -> delay -> delayGain -> destination
        //                           -> delayFeedback -> delay (feedback loop)
        if (echoEnabled) {
            gainNode.connect(delayNode);
            delayNode.connect(delayGain);
            delayGain.connect(audioContext.destination);
            delayNode.connect(delayFeedback);
            delayFeedback.connect(delayNode);
        }

        ensureBackgroundVibe();
    }
}

// ensureBackgroundVibe – creates and starts all ambient drone nodes the first time
// audio is initialised. Safe to call multiple times; exits immediately if already running.
function ensureBackgroundVibe() {
    if (!audioContext || vibeStarted) return; // Only set up once

    // Create the node graph for the ambient drone
    vibeOscA = audioContext.createOscillator();
    vibeOscB = audioContext.createOscillator();
    vibeGain = audioContext.createGain();
    vibeFilter = audioContext.createBiquadFilter();
    vibeLfo = audioContext.createOscillator();
    vibeLfoGain = audioContext.createGain();

    // Two complementary waveforms for a richer tone
    vibeOscA.type = 'triangle';
    vibeOscB.type = 'sine';
    vibeOscB.detune.value = 6; // 6 cents above A for a subtle chorus / beating effect

    vibeFilter.type = 'lowpass';
    vibeFilter.Q.value = 0.8; // Gentle resonance – avoids harsh peak

    vibeGain.gain.value = 0; // Start silent; volume rises with colorAmount

    // The LFO breathes the filter cutoff up/down very slowly (once every ~12 s)
    vibeLfo.type = 'sine';
    vibeLfo.frequency.value = 0.08;   // Very slow sweep
    vibeLfoGain.gain.value = 180;     // ±180 Hz sweep depth on the filter cutoff

    // Wire up: LFO → filter frequency modulation
    vibeLfo.connect(vibeLfoGain);
    vibeLfoGain.connect(vibeFilter.frequency);

    // Wire up: both oscillators → filter → gain → speakers
    vibeOscA.connect(vibeFilter);
    vibeOscB.connect(vibeFilter);
    vibeFilter.connect(vibeGain);
    vibeGain.connect(audioContext.destination);

    // Start all oscillators – they run continuously in the background
    vibeOscA.start();
    vibeOscB.start();
    vibeLfo.start();

    vibeStarted = true;
    vibeNeedsUpdate = true; // Trigger an immediate parameter update
}

// updateBackgroundVibe – recalculates target audio parameters from colorAmount and
// smoothly lerps each audio node toward the new target.
// NOTE: We use direct .value interpolation instead of setTargetAtTime() because
// setTargetAtTime() called on every animation frame can lock up the audio thread.
function updateBackgroundVibe() {
    if (!audioContext || !vibeStarted || !vibeGain || !vibeFilter || !vibeOscA || !vibeOscB) return;

    // Map colorAmount (0–1) to musical parameter ranges
    const baseFreq   = 65 + (colorAmount * 140);   // Pitch: 65 Hz (quiet) → 205 Hz (full canvas)
    const filterFreq = 350 + (colorAmount * 2500);  // Filter: dark → bright as more is drawn
    const vibeVolume = 0.01 + (colorAmount * 0.07); // Volume: nearly silent → subtle presence

    // Lerp each parameter toward its target (smooth glide, not instant jump)
    vibeOscA.frequency.value += (baseFreq - vibeOscA.frequency.value) * 0.25;
    vibeOscB.frequency.value += ((baseFreq * 1.5) - vibeOscB.frequency.value) * 0.25; // Harmony a fifth above
    vibeFilter.frequency.value += (filterFreq - vibeFilter.frequency.value) * 0.25;
    vibeGain.gain.value += (vibeVolume - vibeGain.gain.value) * 0.2;
}

// setColorAmount – clamps the value to [0, 1] and marks the vibe for update.
function setColorAmount(value) {
    colorAmount = Math.max(0, Math.min(1, value));
    vibeNeedsUpdate = true; // Tell the render loop to recalculate vibe parameters
}

// addColorAmount – increases energy (e.g. when drawing or placing a gravity dot).
function addColorAmount(value) {
    setColorAmount(colorAmount + value);
}

// decayColorAmount – decreases energy (e.g. every frame as strokes fade away).
function decayColorAmount(value) {
    setColorAmount(colorAmount - value);
}

// Start render loop after vibe state is initialized.
fadeCanvas();

// ─── Instrument Presets ──────────────────────────────────────────────────────
// Each instrument defines the Web Audio parameters and stroke colour used when
// that instrument is selected. The key matches the button's data-instrument attribute.
const instruments = {
    red: {
        name: 'Bass',
        waveform: 'sawtooth',
        filterType: 'lowpass',
        filterFreq: 800,
        filterQ: 5,
        volume: 0.4,
        color: '#ef4444'
    },
    blue: {
        name: 'Piano',
        waveform: 'triangle',
        filterType: 'lowpass',
        filterFreq: 3000,
        filterQ: 1,
        volume: 0.25,
        color: '#3b82f6'
    },
    yellow: {
        name: 'Synth',
        waveform: 'square',
        filterType: 'bandpass',
        filterFreq: 2000,
        filterQ: 2,
        volume: 0.3,
        color: '#fbbf24'
    }
};

// ─── Note Display Helpers ────────────────────────────────────────────────────
// Converts a raw frequency in Hz to the nearest musical note name + octave
// (e.g. 440 Hz → "A4") for the HUD display.
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function frequencyToNote(frequency) {
    // Piano key number formula: A4 = 440 Hz = key 49
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2)) + 49;
    const noteIndex = Math.round(noteNum) % 12;
    const octave = Math.floor((Math.round(noteNum) + 8) / 12);
    return noteNames[noteIndex] + octave;
}

// Gravity Loops - Magnetic Dot class
class MagneticDot {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 15;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    draw() {
        const pulse = Math.sin(this.pulsePhase) * 3;
        this.pulsePhase += 0.05;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + pulse + 10, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '20';
        ctx.fill();
        
        // Middle glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '60';
        ctx.fill();
        
        // Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Gravity Loops - Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.color = color;
        this.radius = 4;
        this.trail = [];
        this.maxTrailLength = 10;
        this.lastSoundTime = 0;
        this.id = Math.random();
    }
    
    update() {
        // Apply gravity from magnetic dots
        magneticDots.forEach(dot => {
            const dx = dot.x - this.x;
            const dy = dot.y - this.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);
            
            if (dist > 1) {
                const force = 500 / distSq; // Gravity strength
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }
        });
        
        // Apply velocity damping
        this.vx *= 0.99;
        this.vy *= 0.99;
        
        // Limit max speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 8) {
            this.vx = (this.vx / speed) * 8;
            this.vy = (this.vy / speed) * 8;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) {
            this.vx *= -0.8;
            this.x = Math.max(0, Math.min(canvas.width, this.x));
        }
        if (this.y < 0 || this.y > canvas.height) {
            this.vy *= -0.8;
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }
        
        // Update trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Play sound based on speed and position
        const now = Date.now();
        if (now - this.lastSoundTime > 100 && speed > 2) {
            this.playSound();
            this.lastSoundTime = now;
        }
    }
    
    playSound() {
        if (!audioContext) return;
        
        const frequency = yToFrequency(this.y);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const volume = Math.min(speed / 10, 0.15);
        
        // Create a short blip sound
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = currentInstrument.waveform;
        osc.frequency.value = frequency;
        
        filter.type = currentInstrument.filterType;
        filter.frequency.value = currentInstrument.filterFreq;
        filter.Q.value = currentInstrument.filterQ;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.1);
    }
    
    draw() {
        // Draw trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.color + '60';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Map Y position to frequency (pitch)
function yToFrequency(y) {
    // Higher on screen (lower y value) = higher frequency
    // Range: ~200 Hz (bottom) to ~2000 Hz (top)
    const minFreq = 200;  // Low pitch (bottom of screen)
    const maxFreq = 2000; // High pitch (top of screen)
    
    // Invert Y so top = high pitch
    const normalizedY = 1 - (y / canvas.height);
    
    // Use exponential scaling for more musical feel
    const frequency = minFreq * Math.pow(maxFreq / minFreq, normalizedY);
    
    return frequency;
}

// Start playing sound
function startSound(frequency) {
    initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    ensureBackgroundVibe();
    
    if (!oscillator) {
        oscillator = audioContext.createOscillator();
        oscillator.type = currentInstrument.waveform;
        oscillator.connect(filterNode);
        oscillator.start();
        
        // Configure filter based on instrument
        filterNode.type = currentInstrument.filterType;
        filterNode.frequency.value = currentInstrument.filterFreq;
        filterNode.Q.value = currentInstrument.filterQ;
    }
    
    oscillator.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.01);
    gainNode.gain.setTargetAtTime(currentInstrument.volume, audioContext.currentTime, 0.01);
    isPlaying = true;
}

// Update sound frequency
function updateSound(frequency) {
    if (oscillator && isPlaying) {
        oscillator.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.01);
    }
}

// Stop playing sound
function stopSound() {
    if (gainNode && isPlaying) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
        isPlaying = false;
        
        // Clean up oscillator for next draw
        if (oscillator) {
            setTimeout(() => {
                if (!isPlaying && oscillator) {
                    oscillator.stop();
                    oscillator.disconnect();
                    oscillator = null;
                }
            }, 100);
        }
    }
}

// ─── Symmetry Sound ──────────────────────────────────────────────────────────
// Symmetry mode plays one oscillator per mirror position (4 total) so each
// reflected stroke has its own pitch matching its Y position on screen.
function startSymmetrySound(frequencies) {
    initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    ensureBackgroundVibe();
    
    // Tear down leftover oscillators from the previous stroke before creating new ones
    stopSymmetrySound();
    
    // Spin up one oscillator per symmetry position (four mirrors)
    frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = currentInstrument.waveform;
        osc.frequency.value = freq;
        
        filter.type = currentInstrument.filterType;
        filter.frequency.value = currentInstrument.filterFreq;
        filter.Q.value = currentInstrument.filterQ;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        // Slightly lower volume per oscillator to avoid clipping
        gain.gain.setTargetAtTime(currentInstrument.volume * 0.4, audioContext.currentTime, 0.01);
        
        osc.start();
        
        symmetryOscillators.push({ osc, gain, filter });
    });
    
    isPlaying = true;
}

// updateSymmetrySound – called every draw frame to keep each mirror oscillator
// in sync with the current cursor position and speed.
function updateSymmetrySound(frequencies, speeds) {
    if (symmetryOscillators.length === 4 && isPlaying) {
        frequencies.forEach((freq, index) => {
            const { osc, gain, filter } = symmetryOscillators[index];
            
            // Glide pitch to the new frequency (0.01 s time constant for smooth slides)
            osc.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.01);
            
            // Faster strokes are louder; scale down to avoid summed clipping across 4 oscs
            const volume = speedToVolume(speeds[index]);
            const speedAdjustedVolume = currentInstrument.volume * (volume / 0.35) * 0.4;
            gain.gain.setTargetAtTime(speedAdjustedVolume, audioContext.currentTime, 0.01);
            
            // Faster strokes open the filter for a brighter, more energetic sound
            const sharpness = speedToSharpness(speeds[index], currentInstrument.filterFreq);
            filter.frequency.setTargetAtTime(sharpness, audioContext.currentTime, 0.01);
        });
    }
}

// stopSymmetrySound – fades all four mirror oscillators to silence then disposes them.
function stopSymmetrySound() {
    if (symmetryOscillators.length > 0) {
        symmetryOscillators.forEach(({ osc, gain }) => {
            gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05); // Smooth fade-out
            setTimeout(() => {
                osc.stop();       // Stop the oscillator after fade
                osc.disconnect(); // Detach from graph to allow GC
                gain.disconnect();
            }, 100);
        });
        symmetryOscillators = []; // Clear the array so the next stroke starts fresh
        isPlaying = false;
    }
}

// Drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastTime = 0;
let currentSpeed = 0;

// Calculate cursor speed
function calculateSpeed(x1, y1, x2, y2, deltaTime) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = deltaTime > 0 ? distance / deltaTime : 0;
    return speed;
}

// Map speed to volume (0 to 1)
function speedToVolume(speed) {
    // Speed range: 0 to ~5 (pixels per ms)
    const minVolume = 0.1;
    const maxVolume = 0.6;
    const normalizedSpeed = Math.min(speed / 3, 1); // Cap at speed 3
    return minVolume + (normalizedSpeed * (maxVolume - minVolume));
}

// Map speed to filter sharpness
function speedToSharpness(speed, baseFreq) {
    // Faster movement = higher filter cutoff = sharper sound
    const normalizedSpeed = Math.min(speed / 3, 1);
    const multiplier = 1 + (normalizedSpeed * 2); // 1x to 3x
    return baseFreq * multiplier;
}

// Draw waveform line (oscillating brush stroke)
function drawWaveformLine(x1, y1, x2, y2, frequency, volume, color, lineWidth) {
    if (!waveformEnabled) {
        // Draw normal line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        return;
    }
    
    // Calculate line properties
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) return;
    
    // Waveform properties based on sound
    const waveFrequency = (frequency / 200) * 0.5; // Higher pitch = tighter waves
    const amplitude = Math.min(volume * 15, 12); // Volume affects wave height
    
    // Perpendicular direction for wave oscillation
    const perpX = -dy / distance;
    const perpY = dx / distance;
    
    // Draw the waveform
    ctx.beginPath();
    
    const segments = Math.max(Math.floor(distance / 2), 5);
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = x1 + dx * t;
        const y = y1 + dy * t;
        
        // Calculate wave offset
        const waveOffset = Math.sin(waveformPhase + t * distance * waveFrequency * 0.1) * amplitude;
        
        const finalX = x + perpX * waveOffset;
        const finalY = y + perpY * waveOffset;
        
        if (i === 0) {
            ctx.moveTo(finalX, finalY);
        } else {
            ctx.lineTo(finalX, finalY);
        }
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Increment phase for animation
    waveformPhase += 0.3;
}

// Get position from mouse or touch event
function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

// Get 4-way symmetry positions
function getSymmetryPositions(x, y) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    return [
        { x, y }, // Original
        { x: canvas.width - x, y }, // Horizontal flip
        { x, y: canvas.height - y }, // Vertical flip
        { x: canvas.width - x, y: canvas.height - y } // Both flips
    ];
}

// Start drawing
function startDrawing(e) {
    e.preventDefault();
    const pos = getPosition(e);
    isDrawing = true;
    lastX = pos.x;
    lastY = pos.y;
    lastTime = Date.now();
    currentSpeed = 0;

    // Mark content even for short taps with no movement.
    trackDrawPoint(pos.x, pos.y, currentInstrument.color);
    
    // Record action if recording
    if (isRecording) {
        const timestamp = Date.now() - recordingStartTime;
        recordedActions.push({
            type: 'start',
            x: pos.x,
            y: pos.y,
            timestamp: timestamp,
            mode: currentMode,
            instrument: { ...currentInstrument }
        });
    }
    
    if (currentMode === 'symmetry') {
        // Get all 4 symmetry positions
        const positions = getSymmetryPositions(pos.x, pos.y);
        const frequencies = positions.map(p => yToFrequency(p.y));
        startSymmetrySound(frequencies);
        updateDisplay(frequencies[0]); // Display main frequency
    } else {
        const frequency = yToFrequency(pos.y);
        startSound(frequency);
        updateDisplay(frequency);
    }
}

// Continue drawing
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getPosition(e);
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    
    // Calculate speed
    currentSpeed = calculateSpeed(lastX, lastY, pos.x, pos.y, deltaTime);
    
    // Record action if recording
    if (isRecording) {
        const timestamp = Date.now() - recordingStartTime;
        if (timestamp <= loopDuration) {
            recordedActions.push({
                type: 'draw',
                x: pos.x,
                y: pos.y,
                prevX: lastX,
                prevY: lastY,
                speed: currentSpeed,
                timestamp: timestamp,
                mode: currentMode,
                instrument: { ...currentInstrument }
            });
        }
    }
    
    if (currentMode === 'symmetry') {
        // Symmetry mode - draw in 4 positions
        const currentPositions = getSymmetryPositions(pos.x, pos.y);
        const lastPositions = getSymmetryPositions(lastX, lastY);
        
        // Calculate frequencies and speeds for all 4 positions
        const frequencies = currentPositions.map(p => yToFrequency(p.y));
        const speeds = currentPositions.map((p, i) => {
            const last = lastPositions[i];
            return calculateSpeed(last.x, last.y, p.x, p.y, deltaTime);
        });
        
        // Update sound
        updateSymmetrySound(frequencies, speeds);
        updateDisplay(frequencies[0]);
        
        // Draw all 4 reflected lines
        const baseColor = currentInstrument.color;
        const speedLineWidth = 2 + Math.min(currentSpeed / 2, 4);
        
        currentPositions.forEach((currPos, i) => {
            const prevPos = lastPositions[i];
            
            // Add slight transparency and color variation
            const alpha = i === 0 ? 0.9 : 0.7;
            const volume = speedToVolume(speeds[i]);
            
            ctx.globalAlpha = alpha;
            
            // Draw waveform line
            drawWaveformLine(prevPos.x, prevPos.y, currPos.x, currPos.y, 
                            frequencies[i], volume, baseColor, speedLineWidth);
            
            // Add glow effect
            const glowIntensity = 15 + Math.min(speeds[i] * 2, 15);
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = baseColor;
            
            // Redraw for glow
            drawWaveformLine(prevPos.x, prevPos.y, currPos.x, currPos.y, 
                            frequencies[i], volume, baseColor, speedLineWidth);
            
            ctx.shadowBlur = 0;
        });
        
        ctx.globalAlpha = 1;
    } else {
        // Normal draw mode
        const frequency = yToFrequency(pos.y);
        const volume = speedToVolume(currentSpeed);
        const sharpness = speedToSharpness(currentSpeed, currentInstrument.filterFreq);
        
        // Update sound with speed-based parameters
        updateSound(frequency);
        
        // Apply volume based on speed
        if (gainNode && isPlaying) {
            const speedAdjustedVolume = currentInstrument.volume * (volume / 0.35); // Normalize
            gainNode.gain.setTargetAtTime(speedAdjustedVolume, audioContext.currentTime, 0.01);
        }
        
        // Apply sharpness (filter cutoff) based on speed
        if (filterNode && isPlaying) {
            filterNode.frequency.setTargetAtTime(sharpness, audioContext.currentTime, 0.01);
        }
        
        updateDisplay(frequency);
        
        // Draw line with instrument color
        const baseColor = currentInstrument.color;
        
        // Line width varies with speed (faster = thicker)
        const speedLineWidth = 2 + Math.min(currentSpeed / 2, 4);
        
        ctx.globalAlpha = 0.9;
        
        // Draw waveform line
        drawWaveformLine(lastX, lastY, pos.x, pos.y, frequency, volume, baseColor, speedLineWidth);
        
        // Add glow effect (stronger for faster movements)
        const glowIntensity = 15 + Math.min(currentSpeed * 2, 15);
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = baseColor;
        
        // Redraw for glow
        drawWaveformLine(lastX, lastY, pos.x, pos.y, frequency, volume, baseColor, speedLineWidth);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    trackDrawPoint(pos.x, pos.y, currentInstrument.color);
    
    lastX = pos.x;
    lastY = pos.y;
    lastTime = currentTime;
}

// Stop drawing
function stopDrawing(e) {
    if (isDrawing) {
        e.preventDefault();
        isDrawing = false;
        
        // Record action if recording
        if (isRecording) {
            const timestamp = Date.now() - recordingStartTime;
            if (timestamp <= loopDuration) {
                recordedActions.push({
                    type: 'stop',
                    timestamp: timestamp,
                    mode: currentMode
                });
            }
        }
        
        if (currentMode === 'symmetry') {
            stopSymmetrySound();
        } else {
            stopSound();
        }
        
        updateDisplay(null);
    }
}

// Update frequency display
let displayedFrequency = 0;
let animationFrameId = null;

function updateDisplay(frequency) {
    if (frequency) {
        // Trigger pulse animation
        frequencyDisplay.style.animation = 'none';
        noteDisplay.style.animation = 'none';
        
        // Force reflow
        void frequencyDisplay.offsetWidth;
        void noteDisplay.offsetWidth;
        
        frequencyDisplay.style.animation = 'pulse 0.5s ease-in-out';
        noteDisplay.style.animation = 'pulse 0.5s ease-in-out';
        
        // Add active class for glow
        frequencyDisplay.classList.add('active');
        noteDisplay.classList.add('active');
        
        // Smooth frequency transition
        const targetFrequency = frequency;
        
        function animateFrequency() {
            const diff = targetFrequency - displayedFrequency;
            displayedFrequency += diff * 0.3; // Smooth interpolation
            
            frequencyDisplay.textContent = `Frequency: ${Math.round(displayedFrequency)} Hz`;
            noteDisplay.textContent = `Note: ${frequencyToNote(displayedFrequency)}`;
            
            if (Math.abs(diff) > 0.5 && isPlaying) {
                animationFrameId = requestAnimationFrame(animateFrequency);
            } else {
                displayedFrequency = targetFrequency;
                frequencyDisplay.textContent = `Frequency: ${Math.round(targetFrequency)} Hz`;
                noteDisplay.textContent = `Note: ${frequencyToNote(targetFrequency)}`;
            }
        }
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animateFrequency();
    } else {
        // Animate frequency down to 0 before showing "--"
        function animateDown() {
            displayedFrequency *= 0.85; // Exponential decay
            
            if (displayedFrequency > 10) {
                frequencyDisplay.textContent = `Frequency: ${Math.round(displayedFrequency)} Hz`;
                noteDisplay.textContent = `Note: ${frequencyToNote(displayedFrequency)}`;
                animationFrameId = requestAnimationFrame(animateDown);
            } else {
                // Finished animating down
                frequencyDisplay.classList.remove('active');
                noteDisplay.classList.remove('active');
                frequencyDisplay.textContent = 'Frequency: --';
                noteDisplay.textContent = 'Note: --';
                displayedFrequency = 0;
            }
        }
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        if (displayedFrequency > 10) {
            animateDown();
        } else {
            frequencyDisplay.classList.remove('active');
            noteDisplay.classList.remove('active');
            frequencyDisplay.textContent = 'Frequency: --';
            noteDisplay.textContent = 'Note: --';
            displayedFrequency = 0;
        }
    }
}

// Event listeners for mouse
canvas.addEventListener('mousedown', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        startDrawing(e);
    } else if (currentMode === 'gravity') {
        handleGravityClick(e);
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        draw(e);
    }
});
canvas.addEventListener('mouseup', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        stopDrawing(e);
    }
});
canvas.addEventListener('mouseleave', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        stopDrawing(e);
    }
});

// Event listeners for touch
canvas.addEventListener('touchstart', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        startDrawing(e);
    } else if (currentMode === 'gravity') {
        handleGravityClick(e);
    }
});
canvas.addEventListener('touchmove', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        draw(e);
    }
});
canvas.addEventListener('touchend', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        stopDrawing(e);
    }
});
canvas.addEventListener('touchcancel', (e) => {
    if (currentMode === 'draw' || currentMode === 'symmetry') {
        stopDrawing(e);
    }
});

// Gravity mode click handler
function handleGravityClick(e) {
    initAudio();
    ensureBackgroundVibe();
    const pos = getPosition(e);
    
    // Add magnetic dot
    const dot = new MagneticDot(pos.x, pos.y, currentInstrument.color);
    magneticDots.push(dot);
    trackDrawPoint(pos.x, pos.y, currentInstrument.color);
    addColorAmount(0.08);
    
    // Spawn particles around the dot
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const dist = 50;
        const px = pos.x + Math.cos(angle) * dist;
        const py = pos.y + Math.sin(angle) * dist;
        particles.push(new Particle(px, py, currentInstrument.color));
    }
    
    // Start gravity loop animation if not already running
    if (!gravityLoopActive) {
        gravityLoopActive = true;
        animateGravityLoop();
    }
}

// Gravity loop animation
function animateGravityLoop() {
    if (!gravityLoopActive) return;

    // Keep ambient energy alive while gravity visuals are active.
    if (magneticDots.length > 0 || particles.length > 0) {
        addColorAmount(0.0025);
    }
    
    // Clear with fade effect
    if (fadeEnabled) {
        ctx.fillStyle = 'rgba(10, 31, 10, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Update and draw particles
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    
    // Draw magnetic dots
    magneticDots.forEach(dot => {
        dot.draw();
    });
    
    requestAnimationFrame(animateGravityLoop);
}

// Mode switching
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all mode buttons
        modeBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current mode
        currentMode = btn.dataset.mode;
        
        // Update canvas cursor
        if (currentMode === 'gravity') {
            canvas.classList.add('gravity-mode');
        } else {
            canvas.classList.remove('gravity-mode');
        }
        
        // Update instructions
        if (currentMode === 'draw') {
            drawModeInstructions.style.display = 'block';
            symmetryModeInstructions.style.display = 'none';
            gravityModeInstructions.style.display = 'none';
            gravityLoopActive = false;
        } else if (currentMode === 'symmetry') {
            drawModeInstructions.style.display = 'none';
            symmetryModeInstructions.style.display = 'block';
            gravityModeInstructions.style.display = 'none';
            gravityLoopActive = false;
        } else if (currentMode === 'gravity') {
            drawModeInstructions.style.display = 'none';
            symmetryModeInstructions.style.display = 'none';
            gravityModeInstructions.style.display = 'block';
        }
        
        // Clear canvas when switching modes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stopSound();
        stopSymmetrySound();
    });
});

// Clear canvas
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stopSound();
    stopSymmetrySound();
    magneticDots = [];
    particles = [];
    gravityLoopActive = false;
    hasCanvasContent = false;
    drawHistory = [];
    sparks = [];
    setColorAmount(0);
});

// Shake to Clear button
shakeToClearBtn.addEventListener('click', () => {
    triggerClearAnimation();
});

// Device motion for shake detection
window.addEventListener('devicemotion', (event) => {
    if (!event.accelerationIncludingGravity) return;
    if (isClearing || !hasCanvasContent) return;
    
    const x = event.accelerationIncludingGravity.x;
    const y = event.accelerationIncludingGravity.y;
    const z = event.accelerationIncludingGravity.z;
    
    const acceleration = Math.sqrt(x*x + y*y + z*z);
    const now = Date.now();
    
    // Check if shake is strong enough and not too soon after last shake
    if (acceleration > shakeThreshold && (now - lastShakeTime) > shakeDebounce) {
        lastShakeTime = now;
        triggerClearAnimation();
    }
});

// Instrument selection
instrumentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        instrumentBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current instrument
        const instrumentType = btn.dataset.instrument;
        const instrumentConfig = instruments[instrumentType];
        
        currentInstrument = {
            type: instrumentType,
            color: instrumentConfig.color,
            waveform: instrumentConfig.waveform,
            filterType: instrumentConfig.filterType,
            filterFreq: instrumentConfig.filterFreq,
            filterQ: instrumentConfig.filterQ,
            volume: instrumentConfig.volume
        };
        
        // Stop current sound to apply new settings
        if (isPlaying) {
            stopSound();
        }
    });
});

// Initialize with red instrument
currentInstrument = {
    type: 'red',
    color: instruments.red.color,
    waveform: instruments.red.waveform,
    filterType: instruments.red.filterType,
    filterFreq: instruments.red.filterFreq,
    filterQ: instruments.red.filterQ,
    volume: instruments.red.volume
};

// Prevent scrolling on touch devices
document.body.addEventListener('touchmove', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Echo toggle
echoToggle.addEventListener('change', (e) => {
    echoEnabled = e.target.checked;
    fadeEnabled = e.target.checked;
    
    // Reconnect audio graph if audio context exists
    if (audioContext && delayNode && delayGain && delayFeedback) {
        // Disconnect existing delay connections
        try {
            gainNode.disconnect(delayNode);
            delayNode.disconnect(delayGain);
            delayNode.disconnect(delayFeedback);
            delayFeedback.disconnect(delayNode);
        } catch (e) {
            // Ignore disconnect errors
        }
        
        // Reconnect if echo enabled
        if (echoEnabled) {
            gainNode.connect(delayNode);
            delayNode.connect(delayGain);
            delayGain.connect(audioContext.destination);
            delayNode.connect(delayFeedback);
            delayFeedback.connect(delayNode);
        }
    }
    
    // Clear canvas if disabling echo
    if (!echoEnabled) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasCanvasContent = false;
        drawHistory = [];
        sparks = [];
        setColorAmount(0);
    }
});

// Waveform toggle
waveformToggle.addEventListener('change', (e) => {
    waveformEnabled = e.target.checked;
});

// Record & Loop functionality
recordBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

playLoopBtn.addEventListener('click', () => {
    if (!isLooping) {
        startLoop();
    }
});

stopLoopBtn.addEventListener('click', () => {
    if (isLooping) {
        stopLoop();
    }
});

clearLoopBtn.addEventListener('click', () => {
    stopLoop();
    recordedActions = [];
    recordBtn.style.display = 'inline-block';
    recordBtn.textContent = '⏺️ Record Loop (5s)';
    recordBtn.classList.remove('recording');
    playLoopBtn.style.display = 'none';
    stopLoopBtn.style.display = 'none';
    clearLoopBtn.style.display = 'none';
    loopStatus.textContent = '';
});

function startRecording() {
    isRecording = true;
    recordedActions = [];
    recordingStartTime = Date.now();
    
    recordBtn.textContent = '⏹️ Stop Recording';
    recordBtn.classList.add('recording');
    loopStatus.textContent = 'Recording...';
    
    // Auto-stop after 5 seconds
    recordingTimeout = setTimeout(() => {
        if (isRecording) {
            stopRecording();
        }
    }, loopDuration);
}

function stopRecording() {
    isRecording = false;
    recordBtn.classList.remove('recording');
    
    // Cancel the auto-stop timeout if stopping early
    if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
    }
    
    if (recordedActions.length > 0) {
        // Show play controls
        recordBtn.style.display = 'none';
        playLoopBtn.style.display = 'inline-block';
        clearLoopBtn.style.display = 'inline-block';
        loopStatus.textContent = 'Loop ready';
        // Auto-start the loop
        startLoop();
    } else {
        recordBtn.textContent = '⏺️ Record Loop (5s)';
        loopStatus.textContent = '';
    }
}

function startLoop() {
    isLooping = true;
    loopStartTime = Date.now();
    
    playLoopBtn.style.display = 'none';
    stopLoopBtn.style.display = 'inline-block';
    loopStatus.textContent = 'Playing loop...';
    
    playbackLoop();
}

function stopLoop() {
    isLooping = false;
    if (loopPlaybackInterval) {
        clearTimeout(loopPlaybackInterval);
        loopPlaybackInterval = null;
    }
    
    if (recordedActions.length > 0) {
        playLoopBtn.style.display = 'inline-block';
        stopLoopBtn.style.display = 'none';
        loopStatus.textContent = 'Loop paused';
    }
}

// playbackLoop – the timing engine for loop replay.
// It ticks ~60fps, computes the current position within the 5-second cycle,
// and fires any recorded actions whose timestamp falls within a ±50 ms window.
// Using setTimeout (not requestAnimationFrame) keeps it independent of tab visibility.
function playbackLoop() {
    if (!isLooping) return;
    
    const elapsed = Date.now() - loopStartTime;
    const loopPosition = elapsed % loopDuration; // Position within the current cycle (0–5000 ms)
    
    // Find actions whose original timestamp matches our current loop position
    const actionsToPlay = recordedActions.filter(action => {
        const timeDiff = Math.abs(action.timestamp - loopPosition);
        return timeDiff < 50; // ±50 ms tolerance catches actions even if a tick runs slightly late
    });
    
    actionsToPlay.forEach(action => {
        playbackAction(action);
    });
    
    loopPlaybackInterval = setTimeout(() => playbackLoop(), 16); // ~60 fps tick
}

// playbackAction – replays a single recorded action on the canvas and audio graph.
// It temporarily swaps the active instrument to the one recorded with the action
// so the replayed stroke looks and sounds exactly as it did when captured.
function playbackAction(action) {
    // Swap to the recorded instrument for this action, then restore afterwards
    const previousInstrument = { ...currentInstrument };
    currentInstrument = action.instrument;
    
    if (action.type === 'start') {
        // Visual: mark start point
        const frequency = yToFrequency(action.y);
        
        // Audio: play note
        if (action.mode === 'symmetry') {
            const positions = getSymmetryPositions(action.x, action.y);
            const frequencies = positions.map(p => yToFrequency(p.y));
            startSymmetrySound(frequencies);
        } else {
            startSound(frequency);
        }
    } else if (action.type === 'draw') {
        hasCanvasContent = true;
        trackDrawPoint(action.x, action.y, action.instrument.color);
        addColorAmount(0.004);
        // Visual: draw line segment
        const frequency = yToFrequency(action.y);
        const volume = speedToVolume(action.speed);
        
        if (action.mode === 'symmetry') {
            const currentPositions = getSymmetryPositions(action.x, action.y);
            const lastPositions = getSymmetryPositions(action.prevX, action.prevY);
            const frequencies = currentPositions.map(p => yToFrequency(p.y));
            const speedLineWidth = 2 + Math.min(action.speed / 2, 4);
            
            // Update sound
            updateSymmetrySound(frequencies, [action.speed, action.speed, action.speed, action.speed]);
            
            // Draw all 4 reflected lines
            currentPositions.forEach((currPos, i) => {
                const prevPos = lastPositions[i];
                const alpha = i === 0 ? 0.6 : 0.4; // Slightly faded for playback
                
                ctx.globalAlpha = alpha;
                drawWaveformLine(prevPos.x, prevPos.y, currPos.x, currPos.y, 
                                frequencies[i], volume, action.instrument.color, speedLineWidth);
                
                const glowIntensity = 10 + Math.min(action.speed * 1.5, 10);
                ctx.shadowBlur = glowIntensity;
                ctx.shadowColor = action.instrument.color;
                drawWaveformLine(prevPos.x, prevPos.y, currPos.x, currPos.y, 
                                frequencies[i], volume, action.instrument.color, speedLineWidth);
                ctx.shadowBlur = 0;
            });
            ctx.globalAlpha = 1;
        } else {
            // Normal draw mode
            const speedLineWidth = 2 + Math.min(action.speed / 2, 4);
            
            // Update sound
            updateSound(frequency);
            if (gainNode && isPlaying) {
                const speedAdjustedVolume = action.instrument.volume * (volume / 0.35);
                gainNode.gain.setTargetAtTime(speedAdjustedVolume, audioContext.currentTime, 0.01);
            }
            if (filterNode && isPlaying) {
                const sharpness = speedToSharpness(action.speed, action.instrument.filterFreq);
                filterNode.frequency.setTargetAtTime(sharpness, audioContext.currentTime, 0.01);
            }
            
            ctx.globalAlpha = 0.6; // Slightly faded for playback
            drawWaveformLine(action.prevX, action.prevY, action.x, action.y, 
                            frequency, volume, action.instrument.color, speedLineWidth);
            
            const glowIntensity = 10 + Math.min(action.speed * 1.5, 10);
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = action.instrument.color;
            drawWaveformLine(action.prevX, action.prevY, action.x, action.y, 
                            frequency, volume, action.instrument.color, speedLineWidth);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    } else if (action.type === 'stop') {
        // Audio: stop sound
        if (action.mode === 'symmetry') {
            stopSymmetrySound();
        } else {
            stopSound();
        }
    }
    
    // Restore previous instrument
    currentInstrument = previousInstrument;
}

// ─── Shake / Clear Animation ─────────────────────────────────────────────────
// triggerClearAnimation – launches the spark burst that plays before wiping the canvas.
// Sparks are seeded from recent drawHistory points so they appear to "explode" from
// where the user drew. Uses pixel-free tracking (no getImageData) for performance.
function triggerClearAnimation() {
    if (isClearing || !hasCanvasContent) return; // Ignore if already clearing or canvas is empty

    isClearing = true;

    // Mute all audio immediately so sounds don't play during the clear animation
    stopSound();
    stopSymmetrySound();
    stopLoop();

    // Seed spark positions from the draw history ring-buffer.
    // Falls back to the canvas centre if no history exists.
    const source = drawHistory.length > 0 ? drawHistory : [{
        x: canvas.width / 2,
        y: canvas.height / 2,
        color: currentInstrument.color
    }];

    // Sample up to 70 evenly-spaced points from the history so sparks spread
    // across the whole drawing rather than clustering at the most recent point.
    const targetSparks = Math.min(70, source.length);
    sparks = [];
    for (let i = 0; i < targetSparks; i++) {
        const p = source[(i * Math.ceil(source.length / targetSparks)) % source.length];
        sparks.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 6, // Random burst velocity
            vy: (Math.random() - 0.5) * 6,
            life: 1,   // 1.0 = fully visible; decremented each frame until 0
            color: p.color
        });
    }

    // Fail-safe timer: if sparks somehow finish without calling finalizeClear
    // (e.g. rAF is paused), force-reset the clearing state after 1.2 s.
    if (clearFailSafeTimeout) {
        clearTimeout(clearFailSafeTimeout);
    }
    clearFailSafeTimeout = setTimeout(() => {
        if (isClearing) {
            sparks = [];
            finalizeClear();
        }
    }, 1200);
}

function createSparks() {
    // Legacy no-op: kept for compatibility with old calls.
}

// finalizeClear – completes the clear sequence once sparks have faded.
// Wipes the canvas, resets all drawing + gravity data, zeroes audio gains,
// and unlocks the clearing guard so future shakes work again.
function finalizeClear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Blank the canvas
    magneticDots = [];          // Remove all gravity attractors
    particles = [];             // Remove all orbiting particles
    gravityLoopActive = false;  // Stop the gravity animation loop
    hasCanvasContent = false;   // Reset content flag so empty-canvas shake guard works
    drawHistory = [];           // Clear spark source data for next session
    setColorAmount(0);          // Kill ambient drone energy

    // Reset audio to a silent idle state ready for the next stroke
    if (gainNode) {
        gainNode.gain.value = 0;     // Silence main oscillator output
    }
    if (delayGain) {
        delayGain.gain.value = 0.5; // Restore echo wet/dry mix to default
    }

    fadeEnabled = true;  // Re-enable the canvas fade trail effect
    isClearing = false;  // Unlock – the next shake can now trigger a new clear
}

// updateSparks – called each animation frame while a clear animation is active.
// Moves each spark under simulated physics (velocity + gravity), draws it, fades it.
// When the last spark dies, calls finalizeClear() to finish the wipe.
function updateSparks() {
    if (sparks.length === 0) {
        // All sparks have expired – complete the clear sequence
        if (isClearing) {
            if (clearFailSafeTimeout) {
                clearTimeout(clearFailSafeTimeout); // Cancel the fail-safe, we finished normally
                clearFailSafeTimeout = null;
            }
            finalizeClear();
        }
        return;
    }
    
    for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        
        // Physics update
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.25;  // Downward gravity pulls sparks toward the bottom
        spark.life -= 0.08; // Fade out over ~12 frames
        
        // Draw the spark as a small filled circle, its opacity tied to remaining life
        ctx.fillStyle = spark.color;
        ctx.globalAlpha = spark.life;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Rebuild the array without dead entries (life ≤ 0).
    // Using filter() after the loop avoids splice() performance issues inside tight loops.
    sparks = sparks.filter(spark => spark.life > 0);

    decayColorAmount(0.01); // Drain ambient energy as the canvas clears
    
    ctx.globalAlpha = 1; // Restore full opacity for all other rendering
}
