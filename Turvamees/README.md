# Turvamees Motion Guard

Node.js web app that uses your camera to detect object movement direction and play a unique sound for each movement.

## Features

- Camera feed in browser via `getUserMedia`
- Real-time movement detection using frame differencing
- Direction classification:
  - forward
  - backward (alarm siren)
  - left
  - right
  - up
  - down
- Adjustable sensitivity and minimum motion threshold

## Run

1. Install dependencies:
   - `npm install`
2. Start app:
   - `npm start`
3. Open:
   - `http://localhost:3000`

## Notes

- Browser will ask for camera permission.
- Sound playback begins after user interaction (click Start Camera), which satisfies browser audio policies.
