// Placeholder for the loaded COCO-SSD model (object detection)
let cocoModel = null;

// Global session state object tracking active tracks, effects, recorder, and visualizer
let currentSession = null;

// Preset definitions: tweak mapping, tempo and density multipliers, and effects
const PRESETS = {
  ambient: {
    tempoMul: 0.7,
    densityMul: 0.8,
    synthOverrides: { default: 'DuoSynth' },
    reverb: { wet: 0.6, decay: 6 }
  },
  lofi: {
    tempoMul: 0.85,
    densityMul: 0.9,
    synthOverrides: { default: 'FMSynth' },
    lofi: { bitcrush: true }
  },
  synthwave: {
    tempoMul: 1.05,
    densityMul: 1.1,
    synthOverrides: { default: 'FMSynth', lead: 'AMSynth' },
    chorus: { wet: 0.25 }
  },
  orchestral: {
    tempoMul: 0.95,
    densityMul: 0.9,
    synthOverrides: { default: 'DuoSynth' },
    reverb: { wet: 0.4, decay: 4 }
  }
};

// Load the TensorFlow COCO-SSD model asynchronously (cached in `cocoModel`).
async function loadModel() {
  if (window.cocoSsd && !cocoModel) {
    try {
      cocoModel = await cocoSsd.load();
    } catch (e) {
      console.warn('coco-ssd load failed', e);
    }
  }
}

// Draw an image onto a canvas and return its ImageData for pixel analysis.
function getImageData(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return ctx.getImageData(0, 0, c.width, c.height);
}

// Compute the average RGB color across an ImageData object.
function averageColor(imageData) {
  const d = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]; g += d[i+1]; b += d[i+2]; count++;
  }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

// Convert RGB to a hue angle (0..360). Useful to map color hue to musical scales.
function rgbToHue(r,g,b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max === min) h = 0;
  else if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) h = (60 * ((b - r) / (max - min)) + 120) % 360;
  else if (max === b) h = (60 * ((r - g) / (max - min)) + 240) % 360;
  return Math.round(h);
}

// Run object detection on an image using the COCO model. Returns an array of predictions.
async function detectObjects(img) {
  if (!cocoModel) await loadModel();
  if (!cocoModel) return [];
  try {
    return await cocoModel.detect(img);
  } catch (e) {
    console.warn('object detection failed', e);
    return [];
  }
}

// Map average color + object predictions to musical parameters used for track creation.
// Returns tempo, synthName, density, brightness, hue and objectSeeds.
function mapToMusicParams(avgColor, predictions) {
  const brightness = (avgColor.r + avgColor.g + avgColor.b) / (3 * 255); // 0..1
  const hue = rgbToHue(avgColor.r, avgColor.g, avgColor.b);
  const tempo = Math.round(70 + brightness * 100); // 70..170
  const saturationApprox = (Math.max(avgColor.r, avgColor.g, avgColor.b) - Math.min(avgColor.r, avgColor.g, avgColor.b)) / 255;
  const density = 1 + Math.round(saturationApprox * 3); // 1..4
  const objectSeeds = predictions.slice(0, 3).map(p => p.class);
  const objSet = new Set(objectSeeds.map(s => s.toLowerCase()));
  let synthName = 'Synth';
  if ([...objSet].some(o => ['dog','cat','bird','person'].includes(o))) synthName = 'PluckSynth';
  else if ([...objSet].some(o => ['car','truck','bus','motorcycle','bicycle'].includes(o))) synthName = 'MembraneSynth';
  else if ([...objSet].some(o => ['tree','plant','flower'].includes(o))) synthName = 'DuoSynth';
  else if ([...objSet].some(o => ['cup','bottle','chair','table'].includes(o))) synthName = 'FMSynth';
  else {
    if (brightness > 0.7) synthName = 'FMSynth';
    else if (hue < 60 || hue > 300) synthName = 'AMSynth';
    else synthName = 'Synth';
  }
  return { tempo, synthName, density, brightness, hue, objectSeeds };
}

// Apply a named preset (tempo/density multipliers, etc.) to a params object.
function applyPresetToParams(params, presetName) {
  const preset = PRESETS[presetName] || PRESETS.ambient;
  return Object.assign({}, params, {
    tempo: Math.round(params.tempo * (preset.tempoMul || 1)),
    density: Math.max(1, Math.round(params.density * (preset.densityMul || 1))),
    presetName
  });
}

// Choose a preset based on detected objects and image brightness/hue
// Choose a preset name automatically based on detected object classes and image brightness.
function choosePresetForImage(predictions, avgColor) {
  const classes = (predictions || []).map(p => (p.class || '').toLowerCase());
  const has = (list) => classes.some(c => list.includes(c));
  const brightness = (avgColor.r + avgColor.g + avgColor.b) / (3 * 255);

  if (has(['person'])) return 'lofi';
  if (has(['car','truck','bus','motorcycle','bicycle'])) return 'synthwave';
  if (has(['dog','cat','bird'])) return 'ambient';
  if (has(['tree','plant','flower'])) return 'orchestral';
  // fallback to color-driven choices
  if (brightness > 0.75) return 'synthwave';
  return 'ambient';
}

// Map a single detected object class (and image color) into musical params for a track.
function mapObjectToParams(avgColor, objectClass) {
  const brightness = (avgColor.r + avgColor.g + avgColor.b) / (3 * 255);
  const hue = rgbToHue(avgColor.r, avgColor.g, avgColor.b);
  const tempo = Math.round(70 + brightness * 100);
  const saturationApprox = (Math.max(avgColor.r, avgColor.g, avgColor.b) - Math.min(avgColor.r, avgColor.g, avgColor.b)) / 255;
  const density = 1 + Math.round(saturationApprox * 3);
  const obj = (objectClass || '').toLowerCase();
  let synthName = 'Synth';
  if (['dog','cat','bird','person'].includes(obj)) synthName = 'PluckSynth';
  else if (['car','truck','bus','motorcycle','bicycle'].includes(obj)) synthName = 'MembraneSynth';
  else if (['tree','plant','flower'].includes(obj)) synthName = 'DuoSynth';
  else if (['cup','bottle','chair','table'].includes(obj)) synthName = 'FMSynth';
  else {
    if (brightness > 0.7) synthName = 'FMSynth';
    else if (hue < 60 || hue > 300) synthName = 'AMSynth';
    else synthName = 'Synth';
  }
  return { tempo, synthName, density, brightness, hue, objectSeeds: [objectClass] };
}

// Generate a melodic/rhythmic pattern based on object type and params.
// Returns an object with `pattern` (array of note names or null for rests) and `subdivision`.
function generatePattern(params) {
  const hue = params.hue || 180;
  const major = ['C4','D4','E4','F4','G4','A4','B4'];
  const minor = ['C4','D4','D#4','F4','G4','G#4','A#4'];
  const notesPool = (hue < 180) ? major : minor;
  const obj = (params.objectSeeds && params.objectSeeds[0] || '').toLowerCase();
  let steps = 8 * (params.density || 1);
  let subdivision = '8n';
  const seq = [];

  if (obj.includes('person')) {
    // syncopated, human-like melodic motif: longer 16-step with occasional rests
    steps = 16;
    subdivision = '16n';
    for (let i = 0; i < steps; i++) {
      if (i % 4 === 1 || i % 4 === 3) seq.push(null); // off-beat rests
      else seq.push(notesPool[(i + (params.hue % notesPool.length)) % notesPool.length]);
    }
  } else if (obj.match(/car|truck|bus|motorcycle|bicycle/)) {
    // driving ostinato: short percussive rhythm, repeat a small motif
    steps = 8 * (params.density || 1);
    subdivision = '16n';
    for (let i = 0; i < steps; i++) {
      if (i % 3 === 0) seq.push(notesPool[(i % notesPool.length)]);
      else seq.push(null);
    }
  } else if (obj.match(/dog|cat|bird/)) {
    // plucky arpeggio: quick 12-step pattern
    steps = 12;
    subdivision = '8n';
    for (let i = 0; i < steps; i++) seq.push(notesPool[(i * 2 + (params.hue % notesPool.length)) % notesPool.length]);
  } else if (obj.match(/tree|plant|flower/)) {
    // slow evolving pads: longer sustained notes
    steps = 8;
    subdivision = '1n';
    for (let i = 0; i < steps; i++) seq.push(notesPool[i % notesPool.length]);
  } else {
    // default: simple repeating pattern based on density
    steps = 8 * (params.density || 1);
    subdivision = '8n';
    for (let i = 0; i < steps; i++) seq.push(notesPool[i % notesPool.length]);
  }

  return { pattern: seq, subdivision };
}

// Create a track object from params: construct synth, gain/pan/filter, and a sequenced pattern.
function createTrack(params, name) {
  let synth;
  switch (params.synthName) {
    case 'PluckSynth': synth = new Tone.PluckSynth(); break;
    case 'MembraneSynth': synth = new Tone.MembraneSynth(); break;
    case 'DuoSynth': synth = new Tone.DuoSynth(); break;
    case 'FMSynth': synth = new Tone.FMSynth(); break;
    case 'AMSynth': synth = new Tone.AMSynth(); break;
    default: synth = new Tone.Synth({ oscillator: { type: 'sine' } });
  }
  // Per-track routing nodes: gain (volume), pan (stereo), and a filter shaped by hue.
  const gain = new Tone.Gain(0.8);
  const pan = new Tone.Panner(0);
  const filter = new Tone.Filter(800 + params.hue * 2, 'lowpass');
  synth.connect(filter);
  filter.connect(gain);
  gain.connect(pan);

  // build pattern and subdivision based on object/type
  const gen = generatePattern(params || {});
  const seqNotes = gen.pattern;
  const subdivision = gen.subdivision || '8n';

  const seq = new Tone.Sequence((time, note) => {
    if (!note) return; // rest
    const dur = subdivision;
    const vel = 0.8 - (params.brightness || 0) * 0.6;
    if (synth.triggerAttackRelease) synth.triggerAttackRelease(note, dur, time, vel);
    else if (synth.triggerAttack) { synth.triggerAttack(note, time); synth.triggerRelease(time + Tone.Time(dur)); }
  }, seqNotes, subdivision);

  return { name: name || params.objectSeeds.join('-') || 'track', params, synth, gain, pan, filter, seq, pattern: seqNotes, muted: false };
}

// Create a multi-track session: build master chain, effects, per-track synths and analysers.
function createMultiSession(trackParams, presetName) {
  if (currentSession) disposeSession();
  Tone.Transport.cancel();
  Tone.Transport.bpm.value = trackParams.length ? trackParams[0].tempo : 90;

  const masterGain = new Tone.Gain(0.9);
  const recorder = new Tone.Recorder();
  // masterGain -> recorder and destination
  masterGain.connect(recorder);
  masterGain.toDestination();

  // master analysers for visualizers
  const masterAnalyser = new Tone.Analyser('waveform', 1024);
  const masterFFT = new Tone.Analyser('fft', 1024);
  masterGain.connect(masterAnalyser);
  masterGain.connect(masterFFT);

  // build effects chain based on preset
  const preset = PRESETS[presetName] || {};
  const nodes = [];
  if (preset.lofi && preset.lofi.bitcrush) {
    const bc = new Tone.BitCrusher(4);
    nodes.push({ type: 'bitcrush', node: bc });
  }
  if (preset.chorus) {
    const ch = new Tone.Chorus(4, 2.5, 0.5);
    ch.start();
    ch.wet.value = preset.chorus.wet || 0.25;
    nodes.push({ type: 'chorus', node: ch });
  }
  if (preset.reverb) {
    const rv = new Tone.Reverb({ decay: preset.reverb.decay || 3 });
    rv.wet.value = preset.reverb.wet || 0.4;
    nodes.push({ type: 'reverb', node: rv });
  }

  // connect nodes in series to masterGain
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].node.connect(nodes[i+1].node);
  if (nodes.length) nodes[nodes.length - 1].node.connect(masterGain);

    const tracks = trackParams.map((tp, i) => {
      const t = createTrack(tp, tp.objectSeeds && tp.objectSeeds[0] ? tp.objectSeeds[0] : `track${i+1}`);
      // connect each track to first effect node or directly to master
        if (nodes.length) t.pan.connect(nodes[0].node);
        else t.pan.connect(masterGain);
        // per-track analyser for meter
        const analyser = new Tone.Analyser('waveform', 256);
        t.pan.connect(analyser);
        t.analyser = analyser;
      return t;
    });

      currentSession = { tracks, masterGain, recorder, nodes, playing: false, masterAnalyser, masterFFT, _vizId: null };
      // start visualizer loop
      startVisualizerLoop(currentSession);
  return currentSession;
}

  // Dispose and clean up the current audio session, stopping transport and freeing nodes.
  function disposeSession() {
    if (!currentSession) return;
    try {
      // stop transport
      Tone.Transport.stop();
      Tone.Transport.cancel();
      // stop recorder if active
      try { if (currentSession.recorder && currentSession.recorder.state === 'recording') currentSession.recorder.stop(); } catch(e){}
      // dispose tracks
      if (currentSession.tracks) {
        currentSession.tracks.forEach(t => {
          try { t.seq.stop(); t.seq.dispose(); } catch (e) {}
          try { if (t.synth && t.synth.dispose) t.synth.dispose(); } catch (e) {}
          try { if (t.filter && t.filter.dispose) t.filter.dispose(); } catch (e) {}
          try { if (t.gain && t.gain.dispose) t.gain.dispose(); } catch (e) {}
          try { if (t.pan && t.pan.dispose) t.pan.dispose(); } catch (e) {}
        });
      }
      // dispose effect nodes
      if (currentSession.nodes) {
        currentSession.nodes.forEach(nobj => { try { if (nobj.node && nobj.node.dispose) nobj.node.dispose(); } catch(e){} });
      }
      // cancel visualizer loop
      try { if (currentSession._vizId) cancelAnimationFrame(currentSession._vizId); } catch(e){}
      try { if (currentSession.masterAnalyser && currentSession.masterAnalyser.dispose) currentSession.masterAnalyser.dispose(); } catch(e){}
      try { if (currentSession.masterFFT && currentSession.masterFFT.dispose) currentSession.masterFFT.dispose(); } catch(e){}
      try { if (currentSession.masterGain && currentSession.masterGain.dispose) currentSession.masterGain.dispose(); } catch(e){}
    } catch (e) {
      console.warn('error disposing session', e);
    }
    currentSession = null;
  }

  // Clear the UI and fully dispose the active session.
  function clearSession() {
    try {
      stopSession();
      disposeSession();
      const container = document.getElementById('music-player');
      if (container) {
        container.innerHTML = 'No music playing yet.';
      }
      // remove visualizer canvas if present
      const cv = document.getElementById('master-visualizer-canvas');
      if (cv && cv.parentNode) cv.parentNode.remove();
    } catch (e) { console.warn('clearSession error', e); }
  }

// Start playback for the current session: start Tone and sequences, and Transport.
async function startSession() {
  if (!currentSession) return;
  if (currentSession.playing) return;
  await Tone.start();
  currentSession.tracks.forEach(t => t.seq.start(0));
  Tone.Transport.start();
  currentSession.playing = true;
}

// Stop playback but keep nodes alive so the session can be restarted quickly.
function stopSession() {
  if (!currentSession) return;
  try {
    // Stop transport and sequences but keep nodes alive so playback can restart
    Tone.Transport.stop();
    if (currentSession.tracks) {
      currentSession.tracks.forEach(t => {
        try { t.seq.stop(); } catch (e) {}
      });
    }
    // Do not dispose synth/effect nodes here so user can play again
    // recorder stop handled by caller when recording
  } catch (e) {
    console.warn('error stopping session', e);
  }
  if (currentSession) currentSession.playing = false;
}

// Create and run the visualizer loop that draws waveform, FFT bars, and per-track meters.
function startVisualizerLoop(session) {
  const canvasId = 'master-visualizer-canvas';
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    // create canvas area near controls
    const container = document.getElementById('music-player');
    const visWrap = document.createElement('div'); visWrap.className = 'visualizer-wrap';
    canvas = document.createElement('canvas'); canvas.id = canvasId; canvas.width = 600; canvas.height = 140; canvas.style.width = '100%'; canvas.style.maxWidth = '720px'; canvas.style.borderRadius = '8px'; canvas.style.boxShadow = '0 6px 18px rgba(2,6,23,0.5)';
    visWrap.appendChild(canvas);
    // per-track meters container
    const meters = document.createElement('div'); meters.id = 'track-meters'; meters.className = 'track-meters'; meters.style.display='flex'; meters.style.gap='8px'; meters.style.marginTop='8px';
    visWrap.appendChild(meters);
    container.appendChild(visWrap);
  }
  const ctx = canvas.getContext('2d');

  function draw() {
    if (!session) return;
    // clear
    ctx.fillStyle = '#021124'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // draw waveform
    const wave = session.masterAnalyser.getValue();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(99,102,241,0.9)'; ctx.beginPath();
    const slice = canvas.width / wave.length;
    for (let i=0;i<wave.length;i++){
      const x = i * slice; const y = (1 - (wave[i] + 1) / 2) * canvas.height;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // draw FFT as bars at bottom
    const fft = session.masterFFT.getValue();
    const barWidth = canvas.width / fft.length;
    for (let i=0;i<fft.length;i++){
      const mag = (fft[i] + 140) / 140; // normalize
      const h = mag * (canvas.height * 0.35);
      ctx.fillStyle = `rgba(79,209,197,${0.6})`;
      ctx.fillRect(i*barWidth, canvas.height - h, barWidth*0.9, h);
    }

    // update per-track meters
    const metersContainer = document.getElementById('track-meters');
    if (metersContainer) {
      // ensure meter elements exist for tracks
      session.tracks.forEach((t, idx) => {
        let m = metersContainer.querySelector(`#meter-${idx}`);
        if (!m) {
          m = document.createElement('div'); m.id = `meter-${idx}`; m.className='meter'; m.style.width='8px'; m.style.height='80px'; m.style.background='linear-gradient(180deg,#10b981,#84cc16)'; m.style.borderRadius='4px'; m.style.transformOrigin='bottom'; m.style.opacity='0.9'; metersContainer.appendChild(m);
        }
        // compute level from analyser waveform RMS
        let level = 0; try { const vals = t.analyser.getValue(); let sum=0; for(let i=0;i<vals.length;i++){ sum += vals[i]*vals[i]; } level = Math.sqrt(sum/vals.length); } catch(e){ level=0; }
        // level is -1..1 waveform RMS -> 0..1
        const display = Math.min(1, Math.max(0, level * 1.2));
        m.style.transform = `scaleY(${display})`;
      });
    }

    session._vizId = requestAnimationFrame(draw);
  }
  // ensure canvas resizes to container width
  function resize() { const w = canvas.clientWidth * (window.devicePixelRatio || 1); canvas.width = w; }
  resize(); window.addEventListener('resize', resize);
  draw();
}

// Handle the upload form: send file to server, show thumbnail, analyze image, and build audio session.
document.getElementById('upload-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData();
  const fileInput = document.getElementById('photo');
  if (!fileInput.files.length) return;
  formData.append('photo', fileInput.files[0]);

  const response = await fetch('/upload', {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    const data = await response.json();
    const container = document.getElementById('music-player');
    // If we're in multi-image merge mode and a session already exists, don't wipe the container
    const multiModeAtStart = document.getElementById('multi-image')?.checked;
    if (!(multiModeAtStart && currentSession)) container.innerHTML = '';
    if (data.imageUrl) {
      const img = document.createElement('img');
      img.src = data.imageUrl;
      img.alt = 'Uploaded';
      img.style.maxWidth = '200px';
      img.style.maxHeight = '200px';
      img.style.borderRadius = '1em';
      img.style.marginRight = '1em';
      img.style.boxShadow = '0 2px 8px #c7d2fe';
      container.appendChild(img);

      // also add to gallery
      const gallery = document.getElementById('gallery-grid');
      if (gallery) {
        // remove empty placeholder
        const empty = gallery.querySelector('.empty');
        if (empty) empty.remove();
        const gimg = document.createElement('img');
        gimg.src = data.imageUrl;
        gimg.alt = 'Uploaded thumb';
        gallery.prepend(gimg);
      }

      img.onload = async () => {
        const imageData = getImageData(img);
        const avg = averageColor(imageData);
        const preds = await detectObjects(img);
        // Build multi-track set: color track + up to 4 object tracks
        const trackParams = [];
        // color-based track
        trackParams.push(mapToMusicParams(avg, []));
        // object-based tracks
        for (let i = 0; i < Math.min(preds.length, 4); i++) {
          trackParams.push(mapObjectToParams(avg, preds[i].class));
        }

        // auto-select preset based on image content; set select value so UI reflects it
        const presetEl = document.getElementById('preset');
        const autoPreset = choosePresetForImage(preds, avg) || (presetEl?.value || 'ambient');
        if (presetEl) presetEl.value = autoPreset;
        const preset = autoPreset;
        const info = document.createElement('div');
        info.innerHTML = `<div style="text-align:left"><strong>Preset:</strong> ${preset} &nbsp; <strong>Tracks:</strong> ${trackParams.map(tp => tp.objectSeeds && tp.objectSeeds[0] ? tp.objectSeeds[0] : 'color').join(', ')}</div>`;
        container.appendChild(info);

        // apply preset multipliers and overrides
        for (let i = 0; i < trackParams.length; i++) {
          trackParams[i] = applyPresetToParams(trackParams[i], preset);
          const overrides = PRESETS[preset] && PRESETS[preset].synthOverrides;
          if (overrides && overrides.default) trackParams[i].synthName = overrides.default;
        }
        // helper: render controls for currentSession
        function renderSessionControls(containerEl) {
          // update or create session info area
          let infoEl = containerEl.querySelector('.session-info');
          if (!infoEl) { infoEl = document.createElement('div'); infoEl.className = 'session-info'; containerEl.appendChild(infoEl); }
          infoEl.innerHTML = `<div style="text-align:left"><strong>Preset:</strong> ${document.getElementById('preset')?.value || 'ambient'} &nbsp; <strong>Tracks:</strong> ${currentSession.tracks.map(t=>t.name).join(', ')}</div>`;
          // remove existing controls area if present
          const existing = containerEl.querySelector('.session-controls');
          if (existing) existing.remove();
          const controls = document.createElement('div');
          controls.className = 'session-controls';
          controls.style.display = 'flex';
          controls.style.flexDirection = 'column';
          controls.style.gap = '0.8rem';
          controls.style.marginTop = '0.8rem';

          const topControls = document.createElement('div');
          topControls.style.display = 'flex'; topControls.style.gap = '0.6rem';
          const playBtn = document.createElement('button');
          playBtn.textContent = 'Play'; playBtn.className = 'primary';
          const stopBtn = document.createElement('button');
          stopBtn.textContent = 'Stop';
          stopBtn.style.background = 'transparent'; stopBtn.style.border = '1px solid rgba(255,255,255,0.06)'; stopBtn.style.color = 'var(--muted)'; stopBtn.style.padding = '.5rem .8rem'; stopBtn.style.borderRadius = '8px';
          playBtn.onclick = async () => { await startSession(); };
          stopBtn.onclick = () => { stopSession(); };
          topControls.appendChild(playBtn); topControls.appendChild(stopBtn);

          const dlBtn = document.createElement('button');
          dlBtn.textContent = 'Download WAV'; dlBtn.style.background = 'transparent'; dlBtn.style.border = '1px solid rgba(255,255,255,0.06)'; dlBtn.style.color = 'var(--muted)'; dlBtn.style.padding = '.5rem .8rem'; dlBtn.style.borderRadius = '8px';
          dlBtn.onclick = async () => {
            if (!currentSession) return;
            dlBtn.disabled = true; dlBtn.textContent = 'Recording...';
            try {
              await Tone.start();
              currentSession.recorder.start();
              currentSession.tracks.forEach(t => t.seq.start(0));
              Tone.Transport.start();
              await new Promise(r => setTimeout(r, 8000));
              const blob = await currentSession.recorder.stop();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'photo-music.wav'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              stopSession();
            } catch (e) { console.error('record failed', e); }
            finally { dlBtn.disabled = false; dlBtn.textContent = 'Download WAV'; }
          };
          topControls.appendChild(dlBtn);
          // MIDI export button
          const midiBtn = document.createElement('button');
          midiBtn.textContent = 'Export MIDI'; midiBtn.style.background = 'transparent'; midiBtn.style.border = '1px solid rgba(255,255,255,0.06)'; midiBtn.style.color = 'var(--muted)'; midiBtn.style.padding = '.5rem .8rem'; midiBtn.style.borderRadius = '8px';
          midiBtn.onclick = () => {
            if (!currentSession) return;
            try {
              const blob = buildMidiBlob(currentSession, Tone.Transport.bpm.value || 120);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'photo-music.mid'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            } catch (e) { console.error('MIDI export failed', e); }
          };
          topControls.appendChild(midiBtn);
          // Clear session button
          const clearBtn = document.createElement('button');
          clearBtn.textContent = 'Clear'; clearBtn.style.background = 'transparent'; clearBtn.style.border = '1px solid rgba(255,255,255,0.06)'; clearBtn.style.color = 'var(--muted)'; clearBtn.style.padding = '.5rem .8rem'; clearBtn.style.borderRadius = '8px';
          clearBtn.onclick = () => { clearSession(); };
          topControls.appendChild(clearBtn);
          controls.appendChild(topControls);

          // Mixer UI
          const mixer = document.createElement('div');
          mixer.style.display = 'flex'; mixer.style.flexDirection = 'column'; mixer.style.gap = '0.6rem';
          currentSession.tracks.forEach((t, idx) => {
            const row = document.createElement('div');
            row.className = 'mixer-row';
            row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '0.6rem';

            const label = document.createElement('div'); label.textContent = `${t.name}`; label.style.minWidth = '80px'; label.style.fontWeight = '600';
            const vol = document.createElement('input'); vol.type = 'range'; vol.min = -48; vol.max = 6; vol.value = -6; vol.style.width = '140px';
            vol.oninput = (e) => { const db = parseFloat(e.target.value); t.gain.gain.rampTo(Math.pow(10, db/20), 0.05); };
            const pan = document.createElement('input'); pan.type = 'range'; pan.min = -1; pan.max = 1; pan.step = 0.01; pan.value = 0; pan.style.width = '100px';
            pan.oninput = (e) => { t.pan.pan.value = parseFloat(e.target.value); };
            const mute = document.createElement('button'); mute.textContent = 'Mute'; mute.style.padding = '.4rem .6rem'; mute.style.borderRadius = '6px'; mute.style.border = '1px solid rgba(255,255,255,0.04)'; mute.onclick = () => { if (!t.muted) { t.gain.gain.rampTo(0,0.05); t.muted = true; mute.style.opacity=0.6 } else { t.gain.gain.rampTo(0.8,0.05); t.muted=false; mute.style.opacity=1 } };

            row.appendChild(label); row.appendChild(vol); row.appendChild(pan); row.appendChild(mute);
            mixer.appendChild(row);
          });
          controls.appendChild(mixer);
          // Effects UI (preset adjustable)
          const effectsPanel = document.createElement('div');
          effectsPanel.style.display = 'flex';
          effectsPanel.style.flexDirection = 'column';
          effectsPanel.style.gap = '0.6rem';
          effectsPanel.style.marginTop = '0.6rem';
          if (currentSession.nodes && currentSession.nodes.length) {
            currentSession.nodes.forEach(nobj => {
              const row = document.createElement('div');
              row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '0.6rem';
              const label = document.createElement('div'); label.style.minWidth = '90px'; label.style.fontWeight = '600'; label.style.color = '#e6eef8';
              if (nobj.type === 'bitcrush') {
                label.textContent = 'Bit Depth';
                const range = document.createElement('input'); range.type = 'range'; range.min = 1; range.max = 16; range.value = nobj.node.bits || 4; range.oninput = (e) => { nobj.node.bits = parseInt(e.target.value); };
                row.appendChild(label); row.appendChild(range);
              } else if (nobj.type === 'chorus') {
                label.textContent = 'Chorus Wet';
                const wet = document.createElement('input'); wet.type = 'range'; wet.min = 0; wet.max = 1; wet.step = 0.01; wet.value = nobj.node.wet.value || 0.25; wet.oninput = (e) => { nobj.node.wet.value = parseFloat(e.target.value); };
                label.style.color = '#e6eef8';
                row.appendChild(label); row.appendChild(wet);
                // optional rate control
                const rateLabel = document.createElement('div'); rateLabel.textContent = 'Rate'; rateLabel.style.minWidth='40px'; rateLabel.style.color='#e6eef8';
                const rate = document.createElement('input'); rate.type='range'; rate.min=0.1; rate.max=5; rate.step=0.1; rate.value = nobj.node.frequency ? nobj.node.frequency.value : 4; rate.oninput = (e)=>{ if(nobj.node.frequency) nobj.node.frequency.value = parseFloat(e.target.value); };
                row.appendChild(rateLabel); row.appendChild(rate);
              } else if (nobj.type === 'reverb') {
                label.textContent = 'Reverb Wet';
                const wet = document.createElement('input'); wet.type = 'range'; wet.min = 0; wet.max = 1; wet.step = 0.01; wet.value = nobj.node.wet.value || 0.4; wet.oninput = (e) => { nobj.node.wet.value = parseFloat(e.target.value); };
                const decayLabel = document.createElement('div'); decayLabel.textContent = 'Decay'; decayLabel.style.minWidth='50px'; decayLabel.style.color='#e6eef8';
                const decay = document.createElement('input'); decay.type = 'range'; decay.min = 0.5; decay.max = 10; decay.step = 0.1; decay.value = nobj.node.decay || 3; decay.oninput = (e) => { nobj.node.decay = parseFloat(e.target.value); };
                row.appendChild(label); row.appendChild(wet); row.appendChild(decayLabel); row.appendChild(decay);
              }
              effectsPanel.appendChild(row);
            });
            controls.appendChild(effectsPanel);
          }
          containerEl.appendChild(controls);
        }

        // If multi-image mode is enabled and a session already exists, merge tracks
        const multiMode = document.getElementById('multi-image')?.checked;
        if (multiMode && currentSession) {
          // add tracks into existing session
          // create track objects and attach to existing nodes/master
          trackParams.forEach(tp => {
            const t = createTrack(tp, tp.objectSeeds && tp.objectSeeds[0] ? tp.objectSeeds[0] : `track${currentSession.tracks.length+1}`);
            if (currentSession.nodes && currentSession.nodes.length) t.pan.connect(currentSession.nodes[0].node);
            else t.pan.connect(currentSession.masterGain);
            const analyser = new Tone.Analyser('waveform', 256);
            t.pan.connect(analyser); t.analyser = analyser;
            currentSession.tracks.push(t);
            // if already playing, start sequence now
            if (currentSession.playing) t.seq.start(0);
          });
          // re-render controls for merged session and ensure visualizer exists
          renderSessionControls(container);
          // restart visualizer if it was removed
          try { startVisualizerLoop(currentSession); } catch (e) { console.warn('visualizer restart failed', e); }
        } else {
          // create multi-track session with preset
          createMultiSession(trackParams, preset);
          renderSessionControls(container);
        }
        // controls already rendered by renderSessionControls()
      };
    } else {
      container.textContent = 'No image returned.';
    }

    // --- MIDI utilities ---
    function noteNameToMidi(n) {
      if (!n || typeof n !== 'string') return null;
      // e.g. C4, D#3, A4
      const noteMap = { C:0, 'C#':1, DB:1, D:2, 'D#':3, EB:3, E:4, F:5, 'F#':6, GB:6, G:7, 'G#':8, AB:8, A:9, 'A#':10, BB:10, B:11 };
      const m = n.match(/^([A-Ga-g])(#|b|#?)(-?\d+)$/);
      if (!m) return null;
      let name = m[1].toUpperCase();
      const acc = m[2] || '';
      const oct = parseInt(m[3], 10);
      if (acc === '#') name = name + '#';
      if (acc === 'b') {
        // convert flats to equivalent sharp name when possible
        const flats = { 'DB':'C#','EB':'D#','GB':'F#','AB':'G#','BB':'A#' };
        name = (flats[(name+'B').toUpperCase()] || name);
      }
      const key = name.toUpperCase();
      const base = noteMap[key];
      if (base === undefined || isNaN(oct)) return null;
      return (oct + 1) * 12 + base; // MIDI octave offset where C-1 = 0
    }

    function writeUint32BE(v, buf) { buf.push((v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF); }
    function writeUint16BE(v, buf) { buf.push((v >> 8) & 0xFF, v & 0xFF); }
    function writeVarLen(value, buf) {
      let buffer = value & 0x7F;
      while ((value >>= 7) > 0) { buffer <<= 8; buffer |= ((value & 0x7F) | 0x80); }
      // write bytes MSB first
      const bytes = [];
      while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) buffer >>= 8; else break;
      }
      for (let i = bytes.length-1; i >=0; i--) buf.push(bytes[i]);
    }

    function buildMidiBlob(session, bpm) {
      const division = 480; // ticks per quarter
      const usPerQuarter = Math.round(60000000 / (bpm || 120));
      const header = [];
      // MThd
      header.push(0x4d,0x54,0x68,0x64);
      writeUint32BE(6, header); // header length
      writeUint16BE(1, header); // format 1
      writeUint16BE(session.tracks.length, header); // ntrks
      writeUint16BE(division, header);

      const tracksChunks = [];
      session.tracks.forEach((t, idx) => {
        const events = [];
        // tempo meta event at start of first track only
        if (idx === 0) {
          // delta time 0
          writeVarLen(0, events);
          // meta event 0x51 length 3
          events.push(0xFF, 0x51, 0x03);
          events.push((usPerQuarter >> 16) & 0xFF, (usPerQuarter >> 8) & 0xFF, usPerQuarter & 0xFF);
        }
        // optional program change
        writeVarLen(0, events);
        events.push(0xC0, 0x00); // program 0

        const pattern = t.pattern || [];
        const tickPerStep = division / 2; // '8n' -> eighth note
        let lastTick = 0;
        // We'll collect note on/off events as absolute ticks then convert
        const noteEvents = [];
        for (let i = 0; i < pattern.length; i++) {
          const noteName = pattern[i];
          const midi = noteNameToMidi(noteName);
          const startTick = i * tickPerStep;
          const duration = tickPerStep; // 8n
          if (midi !== null) {
            noteEvents.push({ type: 'on', tick: startTick, note: midi, vel: 100 });
            noteEvents.push({ type: 'off', tick: startTick + duration, note: midi, vel: 0 });
          }
        }
        // sort by tick
        noteEvents.sort((a,b) => a.tick - b.tick || (a.type === 'off' ? 1 : -1));
        // convert to delta and push events
        let cursor = 0;
        noteEvents.forEach(ev => {
          const delta = ev.tick - cursor;
          writeVarLen(delta, events);
          if (ev.type === 'on') {
            events.push(0x90 | (idx & 0x0F)); events.push(ev.note & 0x7F); events.push(ev.vel & 0x7F);
          } else {
            events.push(0x80 | (idx & 0x0F)); events.push(ev.note & 0x7F); events.push(ev.vel & 0x7F);
          }
          cursor = ev.tick;
        });

        // End of track
        writeVarLen(0, events);
        events.push(0xFF, 0x2F, 0x00);

        // Build track chunk
        const chunk = [];
        chunk.push(0x4d,0x54,0x72,0x6b);
        writeUint32BE(events.length, chunk);
        // append events
        const data = chunk.concat(events);
        tracksChunks.push(data);
      });

      // flatten header + tracks
      const out = header.slice();
      tracksChunks.forEach(tc => { out.push(...tc); });
      const uint8 = new Uint8Array(out);
      return new Blob([uint8], { type: 'audio/midi' });
    }
  } else {
    document.getElementById('music-player').textContent = 'Upload failed.';
  }
});

// Live preset change: when user picks a different Style, rebuild audio session
(function() {
  const presetEl = document.getElementById('preset');
  if (!presetEl) return;
  presetEl.addEventListener('change', async (e) => {
    const presetName = e.target.value || 'ambient';
    if (!currentSession) return;
    try {
      // derive params from existing session tracks
      const oldParams = currentSession.tracks.map(t => Object.assign({}, t.params || {}));
      const newParams = oldParams.map(p => applyPresetToParams(p, presetName));
      const overrides = PRESETS[presetName] && PRESETS[presetName].synthOverrides;
      if (overrides && overrides.default) {
        for (let i = 0; i < newParams.length; i++) newParams[i].synthName = overrides.default;
      }
      const wasPlaying = currentSession.playing;
      // dispose and rebuild session with new preset
      disposeSession();
      createMultiSession(newParams, presetName);
      // update simple session info UI if present
      const infoEl = document.querySelector('.session-info');
      if (infoEl && currentSession) {
        infoEl.innerHTML = `<div style="text-align:left"><strong>Preset:</strong> ${presetName} &nbsp; <strong>Tracks:</strong> ${currentSession.tracks.map(t=>t.name).join(', ')}</div>`;
      }
      if (wasPlaying) await startSession();
    } catch (err) { console.warn('apply preset change failed', err); }
  });
})();
