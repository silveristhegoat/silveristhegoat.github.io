# Emotion Detector Web App

NOTE: You must launch this app with localhost in order for it to work properly.

This project is a browser-based emotion detection app that uses your camera feed to detect:

- Joy
- Sadness
- Neutral
- Anger

The app updates the full-page theme based on the detected emotion, supports multi-face mode, shows per-face emoji overlays, allows screenshots, and tracks a live emotion summary.

## Tech Stack

- Vite (development server and build tool)
- Vanilla JavaScript (no framework)
- CSS (custom dark animated UI)
- `@vladmandic/face-api` (face detection and expression classification)

## Project Structure

- `index.html`: Main app layout and UI elements.
- `src/main.js`: Application logic (camera, detection, state, events, overlays, summary, screenshot).
- `src/style.css`: Theme, animations, responsive layout, and component styling.
- `src/assets/emojis/*.svg`: Emotion SVG icons used in face overlays.

## How The App Works

### 1) UI Bootstrapping (`index.html`)
The page defines:

- Camera video area (`#camera`)
- Overlay layer (`#emojiOverlay`) for emotion emoji markers near faces
- Current emotion and confidence text
- Multi-face toggle
- Face list panel
- Session summary panel
- Action buttons (enable/disable camera, screenshot)
- Hint/status message area

### 2) Model Loading (`src/main.js`)
The code lazy-loads Face API:

- First tries local package import (`@vladmandic/face-api`)
- Falls back to CDN ESM import if needed

This makes startup more robust in different environments.

Then it loads model weights from:

- `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model`

Loaded models:

- `tinyFaceDetector`
- `faceExpressionNet`

### 3) Camera Lifecycle (`src/main.js`)
Main camera flow:

- `enableCamera()`:
  - Requests webcam permission
  - Starts video stream
  - Loads models (if not loaded yet)
  - Starts detection loop
- `disableCamera()`:
  - Stops detection loop
  - Stops all camera tracks
  - Clears overlays/lists
  - Resets status and summary

### 4) Emotion Detection Loop (`src/main.js`)
Runs every ~450ms:

- Single-face mode:
  - Uses `detectSingleFace(...).withFaceExpressions()`
- Multi-face mode:
  - Uses `detectAllFaces(...).withFaceExpressions()`
  - Computes aggregate emotion across detected faces
  - Renders per-face list and per-face emoji markers

Dominant emotion mapping:

- `happy -> joy`
- `sad -> sadness`
- `neutral -> neutral`
- `angry -> anger`

### 5) Theme Switching (`src/main.js` + `src/style.css`)
`applyTheme(emotion)` updates body classes:

- `emotion-joy`
- `emotion-sadness`
- `emotion-neutral`
- `emotion-anger`

CSS variables then change aura colors/accent colors dynamically.

### 6) Emoji Overlay Near Faces (`src/main.js`)
For each detected face:

- Read face bounding box
- Convert video coordinates to rendered element coordinates
- Place an `<img>` marker near the top of each face
- Select SVG by emotion from `src/assets/emojis`

### 7) Session Emotion Summary (`src/main.js`)
Tracks sample counts while detection runs:

- Total samples
- Joy %, Sadness %, Neutral %, Anger %

Summary updates live and resets when camera is enabled/disabled.

### 8) Screenshot Feature (`src/main.js`)
When clicking **Take Screenshot**:

- Draw current video frame to a temporary canvas
- Export to PNG data URL
- Trigger download with timestamped filename

## Important Runtime Notes

- Camera access requires secure context:
  - Use `http://localhost` (via Vite dev server) or HTTPS.
- If opened as a plain file path, browser security may block camera access.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start dev server:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

4. Preview production build:

   ```bash
   npm run preview
   ```

## Where To Extend Next

- Add confidence threshold slider
- Add timeline chart for emotion history
- Save summary as JSON/CSV
- Draw face rectangles in overlay
- Add model warmup/loading progress indicator
